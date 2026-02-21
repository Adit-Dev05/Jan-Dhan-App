import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import registryData from '../data/registryData.json';
import { hashCitizenId, truncateHash } from '../engine/hashUtils';
import { validateTransaction, checkDuplicate } from '../engine/validationEngine';
import { createGenesisBlock, appendToLedger, verifyLedgerChain, tamperLedgerEntry, exportLedgerCSV } from '../engine/ledgerManager';
import { computeFraudScore, getRiskLevel, computeRegionStats, getGlobalRiskScore } from '../engine/fraudScoring';
import { buildClusterMap, detectCrossRegionRings, exportClusterReportCSV } from '../engine/identityClusterEngine';
import { applyBudgetReduction, reprioritizePendingQueue } from '../engine/budgetAllocationEngine';

// Pre-hash all citizen IDs and build lookups
const citizenRegistry = registryData.map(citizen => ({
    ...citizen,
    hash: hashCitizenId(citizen.Citizen_ID),
    originalId: String(citizen.Citizen_ID)
}));

// Lookup by SHA-256 hash
const citizenByHash = {};
citizenRegistry.forEach(c => { citizenByHash[c.hash] = c; });

// Lookup by raw Citizen_ID string (for direct input)
const citizenById = {};
citizenRegistry.forEach(c => { citizenById[String(c.Citizen_ID)] = c; });

const INITIAL_BUDGET = 1000000; // Rs. 10,00,000
const STORAGE_KEY = 'jandhan_app_state';

const defaultState = {
    systemStatus: 'ACTIVE', // ACTIVE | PAUSED | FROZEN | BUDGET_EXHAUSTED
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    ledger: [createGenesisBlock()],
    ledgerBackup: null, // for restore after tamper demo
    processedHashes: new Set(),
    transactions: [],
    pendingRequests: [], // claims awaiting admin approval
    fraudAlerts: [],
    citizenRegistry,
    citizenByHash,
    citizenById,
    transactionCounter: 0,
    lastPauseTimestamp: null,
    tamperEvent: null,
    tamperScenario: null,
    otpPending: null,
    // Feature 1: Cross-Region Identity Clusters
    fraudClusters: [],
    frozenHashes: new Set(), // citizen hashes frozen by admin via cluster freeze
    // Feature 2: Budget Reallocation
    budgetReductionLog: [], // history of mid-cycle budget cuts
};

// Serialize state for localStorage (exclude non-serializable fields)
function serializeState(state) {
    return JSON.stringify({
        systemStatus: state.systemStatus,
        budget: state.budget,
        ledger: state.ledger,
        ledgerBackup: state.ledgerBackup,
        processedHashes: [...state.processedHashes],
        transactions: state.transactions,
        pendingRequests: state.pendingRequests || [],
        fraudAlerts: state.fraudAlerts,
        transactionCounter: state.transactionCounter,
        lastPauseTimestamp: state.lastPauseTimestamp,
        tamperEvent: state.tamperEvent,
        tamperScenario: state.tamperScenario,
        fraudClusters: state.fraudClusters || [],
        frozenHashes: [...(state.frozenHashes || new Set())],
        budgetReductionLog: state.budgetReductionLog || [],
    });
}

// Deserialize state from localStorage
function deserializeState(json) {
    try {
        const parsed = JSON.parse(json);
        return {
            ...defaultState,
            ...parsed,
            processedHashes: new Set(parsed.processedHashes || []),
            pendingRequests: parsed.pendingRequests || [],
            fraudClusters: parsed.fraudClusters || [],
            frozenHashes: new Set(parsed.frozenHashes || []),
            budgetReductionLog: parsed.budgetReductionLog || [],
            citizenRegistry,
            citizenByHash,
            citizenById,
        };
    } catch {
        return null;
    }
}

// Load initial state from localStorage if available
function loadInitialState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const restored = deserializeState(saved);
            if (restored) return restored;
        }
    } catch { }
    return defaultState;
}

const initialState = loadInitialState();

function appReducer(state, action) {
    switch (action.type) {
        // Gates FAILED path — instant rejection, no pending queue
        case 'PROCESS_TRANSACTION': {
            const { citizenHash, scheme, validation, transactionId, regionCode, amount } = action.payload;
            const timestamp = new Date().toISOString();

            const txn = {
                id: transactionId,
                citizenHash,
                scheme,
                amount: 0,
                approved: false,
                status: 'REJECTED',
                rejectionReason: validation.rejectionReason,
                gateResults: validation.gateResults,
                timestamp,
                regionCode,
                riskScore: 0
            };

            const alerts = [...state.fraudAlerts, {
                id: `ALERT-${Date.now()}`,
                citizenHash,
                transactionId,
                reason: validation.rejectionReason,
                timestamp,
                riskLevel: validation.rejectionReason === 'DUPLICATE_REJECTED' ? 'HIGH' :
                    validation.rejectionReason === 'FREQUENCY_VIOLATION' ? 'MEDIUM' : 'LOW',
                regionCode
            }];

            return {
                ...state,
                transactions: [...state.transactions, txn],
                fraudAlerts: alerts,
                transactionCounter: state.transactionCounter + 1,
            };
        }

        // Gates PASSED path — create a pending request for admin to review
        case 'SUBMIT_CLAIM': {
            const { citizenHash, scheme, gateResults, transactionId, regionCode, amount, manualReview, reviewNote } = action.payload;
            const timestamp = new Date().toISOString();

            // Pending transaction record (shown in TrackStatus)
            const txn = {
                id: transactionId,
                citizenHash,
                scheme,
                amount,
                approved: false,
                status: 'PENDING',
                rejectionReason: null,
                gateResults,
                timestamp,
                regionCode,
                manualReview: !!manualReview,
                reviewNote: reviewNote || null,
                riskScore: 0
            };

            // Pending request for admin queue
            const pendingReq = {
                id: transactionId,
                citizenHash,
                scheme,
                amount,
                regionCode,
                gateResults,
                submittedAt: timestamp,
                status: 'PENDING',
                manualReview: !!manualReview,
                reviewNote: reviewNote || null
            };

            return {
                ...state,
                transactions: [...state.transactions, txn],
                pendingRequests: [...state.pendingRequests, pendingReq],
                transactionCounter: state.transactionCounter + 1,
            };
        }


        // Admin approves a pending claim
        case 'APPROVE_CLAIM': {
            const { requestId } = action.payload;
            const req = state.pendingRequests.find(r => r.id === requestId);
            if (!req) return state;

            const newLedger = appendToLedger(state.ledger, req.citizenHash, req.scheme, req.amount);
            let newBudget = state.budget - req.amount;
            let newSystemStatus = state.systemStatus;
            const newProcessedHashes = new Set(state.processedHashes);
            newProcessedHashes.add(req.citizenHash);

            if (newBudget <= 0) {
                newSystemStatus = 'BUDGET_EXHAUSTED';
                newBudget = 0;
            }

            const updatedTransactions = state.transactions.map(t =>
                t.id === requestId
                    ? { ...t, approved: true, status: 'APPROVED', approvedAt: new Date().toISOString() }
                    : t
            );

            return {
                ...state,
                ledger: newLedger,
                budget: newBudget,
                processedHashes: newProcessedHashes,
                transactions: updatedTransactions,
                pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
                systemStatus: newSystemStatus
            };
        }

        // Admin rejects a pending claim
        case 'REJECT_CLAIM': {
            const { requestId, reason } = action.payload;
            const req = state.pendingRequests.find(r => r.id === requestId);
            if (!req) return state;

            const updatedTransactions = state.transactions.map(t =>
                t.id === requestId
                    ? { ...t, approved: false, status: 'REJECTED', rejectionReason: reason || 'ADMIN_REJECTED', rejectedAt: new Date().toISOString() }
                    : t
            );

            const alerts = [...state.fraudAlerts, {
                id: `ALERT-${Date.now()}`,
                citizenHash: req.citizenHash,
                transactionId: requestId,
                reason: reason || 'ADMIN_REJECTED',
                timestamp: new Date().toISOString(),
                riskLevel: 'LOW',
                regionCode: req.regionCode
            }];

            return {
                ...state,
                transactions: updatedTransactions,
                pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
                fraudAlerts: alerts
            };
        }

        case 'TOGGLE_PAUSE': {
            if (state.systemStatus === 'FROZEN' || state.systemStatus === 'BUDGET_EXHAUSTED') {
                return state;
            }
            return {
                ...state,
                systemStatus: state.systemStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
                lastPauseTimestamp: state.systemStatus === 'ACTIVE' ? new Date().toISOString() : state.lastPauseTimestamp
            };
        }

        case 'TAMPER_LEDGER': {
            const { scenario } = action.payload;
            if (state.ledger.length < 2) return state;

            // Save backup before tampering
            const backup = JSON.parse(JSON.stringify(state.ledger));
            let tamperedLedger;
            let scenarioDesc;

            const targetIdx = Math.min(1, state.ledger.length - 1);
            const targetBlock = state.ledger[targetIdx];

            switch (scenario) {
                case 'amount': {
                    // Scenario 1: Insider changes disbursement amount
                    tamperedLedger = state.ledger.map((b, i) => {
                        if (i === targetIdx) {
                            return { ...b, amount: b.amount * 10 }; // 10x the amount
                        }
                        return b;
                    });
                    scenarioDesc = {
                        type: 'Insider Amount Manipulation',
                        description: `Block #${targetIdx}: Amount was changed from ₹${targetBlock.amount?.toLocaleString('en-IN')} to ₹${(targetBlock.amount * 10)?.toLocaleString('en-IN')}. The SHA-256 hash of the block data no longer matches the stored hash, breaking the chain.`,
                        original: `₹${targetBlock.amount?.toLocaleString('en-IN')}`,
                        tampered: `₹${(targetBlock.amount * 10)?.toLocaleString('en-IN')}`,
                        field: 'amount'
                    };
                    break;
                }
                case 'hash': {
                    // Scenario 2: Direct hash corruption
                    tamperedLedger = tamperLedgerEntry(state.ledger, targetIdx);
                    scenarioDesc = {
                        type: 'Hash Collision Attack',
                        description: `Block #${targetIdx}: The stored hash was replaced with a forged value. The chain link between blocks is now broken, proving the ledger was modified after creation.`,
                        original: targetBlock.currentHash?.substring(0, 16) + '...',
                        tampered: '0xBAD_HASH_COLLISION...',
                        field: 'currentHash'
                    };
                    break;
                }
                case 'delete': {
                    // Scenario 3: Block deletion
                    if (state.ledger.length < 3) {
                        tamperedLedger = tamperLedgerEntry(state.ledger, targetIdx);
                        scenarioDesc = {
                            type: 'Block Deletion Attack',
                            description: `Block #${targetIdx} was targeted for deletion. With only 2 blocks in the chain, the hash was corrupted instead, breaking integrity.`,
                            original: 'Block present',
                            tampered: 'Block corrupted',
                            field: 'block'
                        };
                    } else {
                        tamperedLedger = [...state.ledger.slice(0, targetIdx), ...state.ledger.slice(targetIdx + 1)];
                        scenarioDesc = {
                            type: 'Block Deletion Attack',
                            description: `Block #${targetIdx} was removed from the chain. Block #${targetIdx + 1}'s previousHash no longer matches any existing block, creating a gap in the chain.`,
                            original: `${state.ledger.length} blocks`,
                            tampered: `${state.ledger.length - 1} blocks`,
                            field: 'block'
                        };
                    }
                    break;
                }
                default: {
                    tamperedLedger = tamperLedgerEntry(state.ledger, targetIdx);
                    scenarioDesc = {
                        type: 'Unknown Attack',
                        description: 'Ledger integrity was compromised.',
                        original: '—',
                        tampered: '—',
                        field: 'unknown'
                    };
                }
            }

            const verification = verifyLedgerChain(tamperedLedger);

            return {
                ...state,
                ledger: tamperedLedger,
                ledgerBackup: backup,
                systemStatus: 'FROZEN',
                tamperScenario: scenarioDesc,
                tamperEvent: {
                    timestamp: new Date().toISOString(),
                    blockId: verification.brokenIndex || targetIdx,
                    expectedHash: verification.expectedHash || 'N/A',
                    receivedHash: verification.receivedHash || 'N/A',
                    regionCode: targetBlock?.scheme || 'UNKNOWN'
                }
            };
        }

        case 'RESTORE_CHAIN': {
            if (!state.ledgerBackup) return state;
            return {
                ...state,
                ledger: state.ledgerBackup,
                ledgerBackup: null,
                systemStatus: 'ACTIVE',
                tamperEvent: null,
                tamperScenario: null
            };
        }

        case 'VERIFY_CHAIN': {
            const verification = verifyLedgerChain(state.ledger);
            if (!verification.valid) {
                return {
                    ...state,
                    systemStatus: 'FROZEN',
                    tamperEvent: {
                        timestamp: new Date().toISOString(),
                        blockId: verification.brokenIndex,
                        expectedHash: verification.expectedHash,
                        receivedHash: verification.receivedHash
                    }
                };
            }
            return state;
        }

        case 'REFUND_BUDGET': {
            if (state.systemStatus === 'BUDGET_EXHAUSTED') {
                return {
                    ...state,
                    budget: INITIAL_BUDGET,
                    systemStatus: 'ACTIVE'
                };
            }
            return state;
        }

        case 'SET_OTP_PENDING': {
            return { ...state, otpPending: action.payload };
        }

        case 'CLEAR_OTP': {
            return { ...state, otpPending: null };
        }

        case 'SYNC_STATE': {
            // Merge synced state from another tab
            return {
                ...state,
                ...action.payload,
                citizenRegistry,
                citizenByHash,
                citizenById,
            };
        }

        // ---- Feature 1: Cross-Region Identity Cluster Actions ----

        case 'DETECT_CLUSTERS': {
            const clusterMap = buildClusterMap(state.citizenRegistry);
            const clusters = detectCrossRegionRings(clusterMap);
            return { ...state, fraudClusters: clusters };
        }

        case 'FREEZE_CLUSTER': {
            const { clusterId } = action.payload;
            const cluster = state.fraudClusters.find(c => c.clusterId === clusterId);
            if (!cluster) return state;

            const newFrozen = new Set(state.frozenHashes);
            const newAlerts = [...state.fraudAlerts];
            cluster.members.forEach(m => {
                newFrozen.add(m.citizenHash);
                newAlerts.push({
                    id: `ALERT-CLUSTER-${clusterId}-${m.citizenHash.slice(0, 8)}`,
                    citizenHash: m.citizenHash,
                    transactionId: `CLUSTER-${clusterId}`,
                    reason: 'CROSS_REGION_IDENTITY_RING',
                    timestamp: new Date().toISOString(),
                    riskLevel: 'HIGH',
                    regionCode: m.regionCode,
                });
            });
            const updatedClusters = state.fraudClusters.map(c =>
                c.clusterId === clusterId ? { ...c, frozen: true, frozenAt: new Date().toISOString() } : c
            );
            return { ...state, frozenHashes: newFrozen, fraudAlerts: newAlerts, fraudClusters: updatedClusters };
        }

        case 'UNFREEZE_CLUSTER': {
            const { clusterId } = action.payload;
            const cluster = state.fraudClusters.find(c => c.clusterId === clusterId);
            if (!cluster) return state;

            const newFrozen = new Set(state.frozenHashes);
            cluster.members.forEach(m => newFrozen.delete(m.citizenHash));
            const updatedClusters = state.fraudClusters.map(c =>
                c.clusterId === clusterId ? { ...c, frozen: false, frozenAt: null } : c
            );
            return { ...state, frozenHashes: newFrozen, fraudClusters: updatedClusters };
        }

        // ---- Feature 2: Dynamic Budget Reallocation ----

        case 'REDUCE_BUDGET': {
            const { reductionPercent } = action.payload;
            const { newBudget, cutAmount } = applyBudgetReduction(state.budget, reductionPercent);

            // Re-prioritise pending queue under the new budget
            const { funded, rejected, sortedQueue } = reprioritizePendingQueue(
                state.pendingRequests,
                newBudget,
                state.citizenByHash
            );

            // Auto-reject the unfundable pending requests
            const rejectedIds = new Set(rejected.map(r => r.id));
            const updatedTransactions = state.transactions.map(t =>
                rejectedIds.has(t.id)
                    ? { ...t, status: 'REJECTED', rejectionReason: 'BUDGET_REALLOCATION', rejectedAt: new Date().toISOString() }
                    : t
            );

            // Keep only funded requests in pending queue (sorted by priority)
            const fundedIds = new Set(funded.map(f => f.id));
            const updatedPending = sortedQueue.filter(r => fundedIds.has(r.id));

            // Log this reduction event
            const logEntry = {
                id: `BUDGET-CUT-${Date.now()}`,
                timestamp: new Date().toISOString(),
                reductionPercent,
                budgetBefore: state.budget,
                budgetAfter: newBudget,
                cutAmount,
                claimsFunded: funded.length,
                claimsRejected: rejected.length,
                rejectedClaimIds: [...rejectedIds],
            };

            let newSystemStatus = state.systemStatus;
            if (newBudget <= 0) newSystemStatus = 'BUDGET_EXHAUSTED';

            return {
                ...state,
                budget: newBudget,
                systemStatus: newSystemStatus,
                transactions: updatedTransactions,
                pendingRequests: updatedPending,
                budgetReductionLog: [...(state.budgetReductionLog || []), logEntry],
            };
        }

        default:
            return state;
    }
}


const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const isLocalUpdate = useRef(false);

    // Persist state to localStorage after every change
    useEffect(() => {
        isLocalUpdate.current = true;
        try {
            localStorage.setItem(STORAGE_KEY, serializeState(state));
        } catch { }
        // Reset flag after a tick so storage event handler can distinguish
        const timer = setTimeout(() => { isLocalUpdate.current = false; }, 50);
        return () => clearTimeout(timer);
    }, [state]);

    // Listen for changes from other tabs
    useEffect(() => {
        const handler = (e) => {
            if (e.key === STORAGE_KEY && e.newValue && !isLocalUpdate.current) {
                const synced = deserializeState(e.newValue);
                if (synced) {
                    dispatch({ type: 'SYNC_STATE', payload: synced });
                }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const processTransaction = useCallback((citizenId, requestedScheme, { skip2FA = false } = {}) => {
        if (state.systemStatus !== 'ACTIVE') {
            return {
                success: false,
                error: `System is ${state.systemStatus}. Cannot process transactions.`
            };
        }

        const citizenHash = hashCitizenId(citizenId);

        // Check frozen identity — instant rejection, cannot proceed
        if ((state.frozenHashes || new Set()).has(citizenHash)) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'IDENTITY_FROZEN', gateResults: [] },
                    transactionId: txnId,
                    regionCode: 'FROZEN',
                    amount: 0
                }
            });
            return { success: true, status: 'REJECTED', reason: 'IDENTITY_FROZEN', transactionId: txnId };
        }

        // Check duplicate — instant rejection, skip pending queue
        if (checkDuplicate(citizenHash, state.processedHashes)) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'DUPLICATE_REJECTED', gateResults: [] },
                    transactionId: txnId,
                    regionCode: 'N/A',
                    amount: 0
                }
            });
            return { success: true, status: 'REJECTED', reason: 'DUPLICATE_REJECTED', transactionId: txnId };
        }

        // Find citizen — first try raw ID, then fall back to hash lookup
        let citizen = state.citizenById[String(citizenId)] || state.citizenByHash[citizenHash];

        if (!citizen) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'CITIZEN_NOT_FOUND', gateResults: [] },
                    transactionId: txnId,
                    regionCode: 'N/A',
                    amount: 0
                }
            });
            return { success: true, status: 'REJECTED', reason: 'CITIZEN_NOT_FOUND', transactionId: txnId };
        }

        const actualHash = citizen.hash;

        // Check duplicate with actual hash too
        if (checkDuplicate(actualHash, state.processedHashes)) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash: actualHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'DUPLICATE_REJECTED', gateResults: [] },
                    transactionId: txnId,
                    regionCode: citizen.Region_Code,
                    amount: 0
                }
            });
            return { success: true, status: 'REJECTED', reason: 'DUPLICATE_REJECTED', transactionId: txnId };
        }

        // 2FA check for high-value transactions
        if (citizen.Scheme_Amount > 3000 && !skip2FA && !state.otpPending?.verified) {
            dispatch({ type: 'SET_OTP_PENDING', payload: { citizenId, scheme: requestedScheme, otp: '123456', verified: false } });
            return { success: true, needs2FA: true, otp: '123456' };
        }

        // Run gate validation
        const validation = validateTransaction(citizen, requestedScheme, { budget: state.budget });
        const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;

        if (!validation.approved && !validation.manualReview) {
            // Gates failed with no path to review — instant rejection
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash: actualHash,
                    scheme: requestedScheme,
                    validation,
                    transactionId: txnId,
                    regionCode: citizen.Region_Code,
                    amount: 0
                }
            });
            if (state.otpPending) dispatch({ type: 'CLEAR_OTP' });
            return { success: true, status: 'REJECTED', reason: validation.rejectionReason, transactionId: txnId, gateResults: validation.gateResults };
        }

        // Gates passed (or manualReview) — submit for admin approval (PENDING)
        dispatch({
            type: 'SUBMIT_CLAIM',
            payload: {
                citizenHash: actualHash,
                scheme: requestedScheme,
                gateResults: validation.gateResults,
                transactionId: txnId,
                regionCode: citizen.Region_Code,
                amount: citizen.Scheme_Amount,
                manualReview: !!validation.manualReview,
                reviewNote: validation.manualReview ? 'CLAIM_LIMIT_MANUAL_REVIEW' : null
            }
        });

        if (state.otpPending) dispatch({ type: 'CLEAR_OTP' });

        return {
            success: true,
            status: 'PENDING',
            manualReview: !!validation.manualReview,
            transactionId: txnId,
            gateResults: validation.gateResults
        };
    }, [state]);

    // Admin approves a pending request → budget deducted + ledger written
    const approveRequest = useCallback((requestId) => {
        dispatch({ type: 'APPROVE_CLAIM', payload: { requestId } });
        setTimeout(() => dispatch({ type: 'VERIFY_CHAIN' }), 100);
    }, [dispatch]);

    // Admin rejects a pending request
    const rejectRequest = useCallback((requestId, reason) => {
        dispatch({ type: 'REJECT_CLAIM', payload: { requestId, reason } });
    }, [dispatch]);

    // Feature 1: Cluster callbacks
    const detectClusters = useCallback(() => {
        dispatch({ type: 'DETECT_CLUSTERS' });
    }, [dispatch]);

    const freezeCluster = useCallback((clusterId) => {
        dispatch({ type: 'FREEZE_CLUSTER', payload: { clusterId } });
    }, [dispatch]);

    const unfreezeCluster = useCallback((clusterId) => {
        dispatch({ type: 'UNFREEZE_CLUSTER', payload: { clusterId } });
    }, [dispatch]);

    const exportClusterReport = useCallback(() => {
        return exportClusterReportCSV(state.fraudClusters || []);
    }, [state.fraudClusters]);

    // Feature 2: Budget reallocation
    const reduceBudget = useCallback((reductionPercent = 20) => {
        dispatch({ type: 'REDUCE_BUDGET', payload: { reductionPercent } });
    }, [dispatch]);

    const verify2FA = useCallback((otp) => {
        if (state.otpPending && otp === state.otpPending.otp) {
            dispatch({ type: 'SET_OTP_PENDING', payload: { ...state.otpPending, verified: true } });
            return true;
        }
        return false;
    }, [state.otpPending]);

    // Search citizens by partial ID
    const searchCitizens = useCallback((query) => {
        if (!query || query.length < 2) return [];
        const q = String(query).toLowerCase();
        return citizenRegistry
            .filter(c => String(c.Citizen_ID).includes(q))
            .slice(0, 8);
    }, []);

    // Lookup transaction by ID
    const getTransaction = useCallback((txnId) => {
        return state.transactions.find(t => t.id === txnId) || null;
    }, [state.transactions]);

    const stats = {
        totalTransactions: state.transactions.length,
        pending: (state.pendingRequests || []).length,
        approved: state.transactions.filter(t => t.status === 'APPROVED').length,
        rejected: state.transactions.filter(t => t.status === 'REJECTED').length,
        rejectionRate: state.transactions.filter(t => t.status !== 'PENDING').length > 0
            ? ((state.transactions.filter(t => t.status === 'REJECTED').length / state.transactions.filter(t => t.status !== 'PENDING').length) * 100).toFixed(2)
            : '0.00',
        budgetUsed: INITIAL_BUDGET - state.budget,
        budgetPercent: ((state.budget / INITIAL_BUDGET) * 100).toFixed(1),
        fraudAlertCount: state.fraudAlerts.length,
        criticalAlerts: state.fraudAlerts.filter(a => a.riskLevel === 'HIGH').length,
        globalRiskScore: getGlobalRiskScore(state.transactions),
        // Feature 1 stats
        activeClusters: (state.fraudClusters || []).length,
        frozenCount: (state.frozenHashes || new Set()).size,
        highRiskClusters: (state.fraudClusters || []).filter(c => c.riskLevel === 'HIGH').length,
        // Feature 2 stats
        budgetReductions: (state.budgetReductionLog || []).length,
        lastBudgetCut: (state.budgetReductionLog || []).slice(-1)[0] || null,
        regionStats: computeRegionStats(state.transactions),
        rejectionReasons: state.transactions
            .filter(t => t.status === 'REJECTED' && t.rejectionReason)
            .reduce((acc, t) => {
                acc[t.rejectionReason] = (acc[t.rejectionReason] || 0) + 1;
                return acc;
            }, {}),
        preventedFraudAmount: state.transactions
            .filter(t => t.status === 'REJECTED')
            .reduce((acc, t) => {
                const c = state.citizenByHash[t.citizenHash];
                return acc + (c ? c.Scheme_Amount : 0);
            }, 0)
    };

    return (
        <AppContext.Provider value={{
            ...state,
            stats,
            processTransaction,
            approveRequest,
            rejectRequest,
            verify2FA,
            searchCitizens,
            getTransaction,
            dispatch,
            exportLedger: () => exportLedgerCSV(state.ledger),
            truncateHash,
            // Feature 1: Cluster management
            detectClusters,
            freezeCluster,
            unfreezeCluster,
            exportClusterReport,
            // Feature 2: Budget reallocation
            reduceBudget,
        }}>
            {children}
        </AppContext.Provider>
    );
}


export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
