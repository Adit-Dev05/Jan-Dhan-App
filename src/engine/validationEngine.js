// 3-Gate Validation Engine
// Gate 1: Eligibility | Gate 2: Budget | Gate 3: Frequency

export function validateTransaction(citizen, requestedScheme, systemState) {
    const gateResults = [];
    let approved = true;
    let rejectionReason = null;

    // ---- GATE 1: ELIGIBILITY ----
    const gate1Checks = [];

    // Check Account Status
    if (citizen.Account_Status !== 'Active') {
        gate1Checks.push({ check: 'Account Status', passed: false, detail: `Status: ${citizen.Account_Status}` });
        approved = false;
        rejectionReason = 'ACCOUNT_INACTIVE';
    } else {
        gate1Checks.push({ check: 'Account Status', passed: true, detail: 'Active' });
    }

    // Check Aadhaar Linked
    if (citizen.Aadhaar_Linked !== 'TRUE') {
        gate1Checks.push({ check: 'Aadhaar Linked', passed: false, detail: 'Not Linked' });
        if (approved) {
            approved = false;
            rejectionReason = 'AADHAAR_NOT_LINKED';
        }
    } else {
        gate1Checks.push({ check: 'Aadhaar Linked', passed: true, detail: 'Linked' });
    }

    // Check Scheme Eligibility
    if (citizen.Scheme_Eligibility !== requestedScheme) {
        gate1Checks.push({ check: 'Scheme Match', passed: false, detail: `Eligible: ${citizen.Scheme_Eligibility}, Requested: ${requestedScheme}` });
        if (approved) {
            approved = false;
            rejectionReason = 'SCHEME_MISMATCH';
        }
    } else {
        gate1Checks.push({ check: 'Scheme Match', passed: true, detail: requestedScheme });
    }

    // Check Claim Count
    if (citizen.Claim_Count > 3) {
        gate1Checks.push({ check: 'Claim Count', passed: false, detail: `${citizen.Claim_Count} claims (max 3)` });
        if (approved) {
            approved = false;
            rejectionReason = 'CLAIM_LIMIT_EXCEEDED';
        }
    } else {
        gate1Checks.push({ check: 'Claim Count', passed: true, detail: `${citizen.Claim_Count}/3` });
    }

    gateResults.push({
        gate: 1,
        name: 'Eligibility Gate',
        passed: gate1Checks.every(c => c.passed),
        checks: gate1Checks
    });

    // ---- GATE 2: BUDGET ----
    const gate2Checks = [];
    const amount = citizen.Scheme_Amount;

    if (approved) {
        if (systemState.budget < amount) {
            gate2Checks.push({ check: 'Budget Available', passed: false, detail: `Need ₹${amount}, Available: ₹${systemState.budget}` });
            approved = false;
            rejectionReason = 'INSUFFICIENT_BUDGET';
        } else {
            gate2Checks.push({ check: 'Budget Available', passed: true, detail: `₹${amount} from ₹${systemState.budget}` });
        }
    } else {
        gate2Checks.push({ check: 'Budget Available', passed: false, detail: 'Skipped (Gate 1 failed)' });
    }

    gateResults.push({
        gate: 2,
        name: 'Budget Gate',
        passed: gate2Checks.every(c => c.passed),
        checks: gate2Checks
    });

    // ---- GATE 3: FREQUENCY ----
    const gate3Checks = [];

    if (approved) {
        const lastClaimDate = parseDate(citizen.Last_Claim_Date);
        const now = new Date();
        const daysSinceLastClaim = Math.floor((now - lastClaimDate) / (1000 * 60 * 60 * 24));

        if (daysSinceLastClaim < 30) {
            gate3Checks.push({
                check: 'Frequency (30-day)',
                passed: false,
                detail: `Last claim ${daysSinceLastClaim} days ago (need 30)`
            });
            approved = false;
            rejectionReason = 'FREQUENCY_VIOLATION';
        } else {
            gate3Checks.push({
                check: 'Frequency (30-day)',
                passed: true,
                detail: `${daysSinceLastClaim} days since last claim`
            });
        }
    } else {
        gate3Checks.push({ check: 'Frequency (30-day)', passed: false, detail: 'Skipped (prior gate failed)' });
    }

    gateResults.push({
        gate: 3,
        name: 'Frequency Gate',
        passed: gate3Checks.every(c => c.passed),
        checks: gate3Checks
    });

    return {
        approved,
        rejectionReason,
        gateResults,
        amount: approved ? amount : 0
    };
}

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
}

export function checkDuplicate(citizenHash, processedHashes) {
    return processedHashes.has(citizenHash);
}

export function checkReplayAttack(transactionHash, ledger) {
    return ledger.some(entry => entry.currentHash === transactionHash);
}
