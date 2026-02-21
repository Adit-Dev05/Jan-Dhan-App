// Fraud Risk Scoring Engine
// Per-citizen anomaly score (0-100)

export function computeFraudScore(citizen, transactionHistory = []) {
    let score = 0;

    // Factor 1: Claim count proximity to limit (max 40 points)
    if (citizen.Claim_Count >= 3) {
        score += 40;
    } else if (citizen.Claim_Count === 2) {
        score += 20;
    } else if (citizen.Claim_Count === 1) {
        score += 5;
    }

    // Factor 2: Frequency violation attempts (max 30 points)
    const frequencyViolations = transactionHistory.filter(
        t => t.rejectionReason === 'FREQUENCY_VIOLATION' && t.citizenHash === citizen.hash
    ).length;
    score += Math.min(frequencyViolations * 15, 30);

    // Factor 3: Multiple region claims (max 20 points)
    const citizenTxns = transactionHistory.filter(t => t.citizenHash === citizen.hash);
    const uniqueRegions = new Set(citizenTxns.map(t => t.regionCode)).size;
    if (uniqueRegions > 2) {
        score += 20;
    } else if (uniqueRegions > 1) {
        score += 10;
    }

    // Factor 4: Duplicate hash collision attempt -> instant HIGH
    const hasDuplicate = transactionHistory.some(
        t => t.rejectionReason === 'DUPLICATE_REJECTED' && t.citizenHash === citizen.hash
    );
    if (hasDuplicate) {
        score = Math.max(score, 80);
    }

    return Math.min(score, 100);
}

export function getRiskLevel(score) {
    if (score <= 30) return { level: 'LOW', color: '#22c55e' };
    if (score <= 60) return { level: 'MEDIUM', color: '#f59e0b' };
    return { level: 'HIGH', color: '#ff4757' };
}

export function computeRegionStats(transactions) {
    const stats = {};

    transactions.forEach(txn => {
        const region = txn.regionCode || 'UNKNOWN';
        if (!stats[region]) {
            stats[region] = {
                total: 0,
                approved: 0,
                rejected: 0,
                totalAmount: 0,
                rejectionReasons: {},
                riskScore: 0
            };
        }
        stats[region].total++;
        if (txn.approved) {
            stats[region].approved++;
            stats[region].totalAmount += txn.amount;
        } else {
            stats[region].rejected++;
            const reason = txn.rejectionReason || 'UNKNOWN';
            stats[region].rejectionReasons[reason] = (stats[region].rejectionReasons[reason] || 0) + 1;
        }
    });

    // Compute per-region risk score
    Object.keys(stats).forEach(region => {
        const s = stats[region];
        const rejectionRate = s.total > 0 ? s.rejected / s.total : 0;
        s.riskScore = Math.round(rejectionRate * 100);
    });

    return stats;
}

export function getGlobalRiskScore(transactions) {
    if (transactions.length === 0) return 0;
    const rejected = transactions.filter(t => t.status === 'REJECTED').length;
    // weighted score
    return Math.round((rejected / transactions.length) * 100);
}
