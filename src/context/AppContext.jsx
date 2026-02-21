import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import registryData from '../data/registryData.json';
import { hashCitizenId, truncateHash } from '../engine/hashUtils';
import { validateTransaction, checkDuplicate } from '../engine/validationEngine';
import { createGenesisBlock, appendToLedger, verifyLedgerChain, tamperLedgerEntry, exportLedgerCSV } from '../engine/ledgerManager';
import { computeFraudScore, getRiskLevel, computeRegionStats, getGlobalRiskScore } from '../engine/fraudScoring';

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
    fraudAlerts: [],
    citizenRegistry,
    citizenByHash,
    citizenById,
    transactionCounter: 0,
    lastPauseTimestamp: null,
    tamperEvent: null,
    tamperScenario: null, // description of what was tampered
    otpPending: null,
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
        fraudAlerts: state.fraudAlerts,
        transactionCounter: state.transactionCounter,
        lastPauseTimestamp: state.lastPauseTimestamp,
        tamperEvent: state.tamperEvent,
        tamperScenario: state.tamperScenario,
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
        case 'PROCESS_TRANSACTION': {
            const { citizenHash, scheme, validation, transactionId, regionCode, amount } = action.payload;
            const timestamp = new Date().toISOString();

            const txn = {
                id: transactionId,
                citizenHash,
                scheme,
                amount: validation.approved ? amount : 0,
                approved: validation.approved,
                rejectionReason: validation.rejectionReason,
                gateResults: validation.gateResults,
                timestamp,
                regionCode,
                riskScore: 0
            };

            let newLedger = state.ledger;
            let newBudget = state.budget;
            let newProcessedHashes = new Set(state.processedHashes);
            let newSystemStatus = state.systemStatus;
            let alerts = [...state.fraudAlerts];

            if (validation.approved) {
                newLedger = appendToLedger(state.ledger, citizenHash, scheme, amount);
                newBudget = state.budget - amount;
                newProcessedHashes.add(citizenHash);

                if (newBudget <= 0) {
                    newSystemStatus = 'BUDGET_EXHAUSTED';
                    newBudget = 0;
                }
            } else {
                alerts.push({
                    id: `ALERT-${Date.now()}`,
                    citizenHash,
                    transactionId,
                    reason: validation.rejectionReason,
                    timestamp,
                    riskLevel: validation.rejectionReason === 'DUPLICATE_REJECTED' ? 'HIGH' :
                        validation.rejectionReason === 'FREQUENCY_VIOLATION' ? 'MEDIUM' : 'LOW',
                    regionCode
                });
            }

            return {
                ...state,
                ledger: newLedger,
                budget: newBudget,
                processedHashes: newProcessedHashes,
                transactions: [...state.transactions, txn],
                fraudAlerts: alerts,
                transactionCounter: state.transactionCounter + 1,
                systemStatus: newSystemStatus
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

        // Check duplicate
        if (checkDuplicate(citizenHash, state.processedHashes)) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'DUPLICATE_REJECTED', gateResults: [], amount: 0 },
                    transactionId: txnId,
                    regionCode: 'N/A',
                    amount: 0
                }
            });
            return { success: true, approved: false, reason: 'DUPLICATE_REJECTED', transactionId: txnId };
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
                    validation: { approved: false, rejectionReason: 'CITIZEN_NOT_FOUND', gateResults: [], amount: 0 },
                    transactionId: txnId,
                    regionCode: 'N/A',
                    amount: 0
                }
            });
            return { success: true, approved: false, reason: 'CITIZEN_NOT_FOUND', transactionId: txnId };
        }

        // Use the citizen's actual hash for consistency
        const actualHash = citizen.hash;

        // Check duplicate with actual hash too
        if (checkDuplicate(actualHash, state.processedHashes)) {
            const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;
            dispatch({
                type: 'PROCESS_TRANSACTION',
                payload: {
                    citizenHash: actualHash,
                    scheme: requestedScheme,
                    validation: { approved: false, rejectionReason: 'DUPLICATE_REJECTED', gateResults: [], amount: 0 },
                    transactionId: txnId,
                    regionCode: citizen.Region_Code,
                    amount: 0
                }
            });
            return { success: true, approved: false, reason: 'DUPLICATE_REJECTED', transactionId: txnId };
        }

        // 2FA check for high-value transactions
        if (citizen.Scheme_Amount > 3000 && !skip2FA && !state.otpPending?.verified) {
            dispatch({ type: 'SET_OTP_PENDING', payload: { citizenId, scheme: requestedScheme, otp: '123456', verified: false } });
            return { success: true, needs2FA: true, otp: '123456' };
        }

        // Run validation engine
        const validation = validateTransaction(citizen, requestedScheme, { budget: state.budget });
        const txnId = `TXN-${String(state.transactionCounter + 1).padStart(5, '0')}-JDG`;

        dispatch({
            type: 'PROCESS_TRANSACTION',
            payload: {
                citizenHash: actualHash,
                scheme: requestedScheme,
                validation,
                transactionId: txnId,
                regionCode: citizen.Region_Code,
                amount: citizen.Scheme_Amount
            }
        });

        // Verify chain integrity after every transaction
        setTimeout(() => dispatch({ type: 'VERIFY_CHAIN' }), 100);

        if (state.otpPending) {
            dispatch({ type: 'CLEAR_OTP' });
        }

        return { success: true, approved: validation.approved, reason: validation.rejectionReason, transactionId: txnId, gateResults: validation.gateResults };
    }, [state]);

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
        approved: state.transactions.filter(t => t.approved).length,
        rejected: state.transactions.filter(t => !t.approved).length,
        rejectionRate: state.transactions.length > 0
            ? ((state.transactions.filter(t => !t.approved).length / state.transactions.length) * 100).toFixed(2)
            : '0.00',
        budgetUsed: INITIAL_BUDGET - state.budget,
        budgetPercent: ((state.budget / INITIAL_BUDGET) * 100).toFixed(1),
        fraudAlertCount: state.fraudAlerts.length,
        criticalAlerts: state.fraudAlerts.filter(a => a.riskLevel === 'HIGH').length,
        globalRiskScore: getGlobalRiskScore(state.transactions),
        regionStats: computeRegionStats(state.transactions),
        rejectionReasons: state.transactions
            .filter(t => !t.approved)
            .reduce((acc, t) => {
                acc[t.rejectionReason] = (acc[t.rejectionReason] || 0) + 1;
                return acc;
            }, {}),
        preventedFraudAmount: state.transactions
            .filter(t => !t.approved)
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
            verify2FA,
            searchCitizens,
            getTransaction,
            dispatch,
            exportLedger: () => exportLedgerCSV(state.ledger),
            truncateHash
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
