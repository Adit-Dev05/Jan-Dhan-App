// Dynamic Budget Reallocation Engine
// Handles mid-cycle budget reductions with Income_Tier-based queue prioritisation.

/**
 * Income tier priority — lower number = processed first (highest priority).
 * Low-income citizens are protected and funded before Medium/High tiers.
 */
export const INCOME_TIER_PRIORITY = {
    Low: 1,
    Medium: 2,
    High: 3,
};

/**
 * Apply a deterministic percentage reduction to the remaining budget.
 * Uses integer-safe floor arithmetic to avoid floating point drift.
 *
 * @param {number} currentBudget - current remaining budget in ₹
 * @param {number} reductionPercent - e.g. 20 for a 20% cut
 * @returns {{ newBudget: number, cutAmount: number }}
 */
export function applyBudgetReduction(currentBudget, reductionPercent) {
    const cutAmount = Math.floor(currentBudget * reductionPercent / 100);
    const newBudget = currentBudget - cutAmount;
    return { newBudget, cutAmount };
}

/**
 * Re-prioritise the pending request queue after a budget reduction.
 *
 * Algorithm:
 * 1. Sort pending requests by Income_Tier priority (Low first, then Medium, High).
 * 2. Within same tier, sort by submission time (earliest first).
 * 3. Greedily fund requests until budget exhausted.
 * 4. All remaining requests beyond budget are auto-rejected with BUDGET_REALLOCATION reason.
 *
 * @param {Array}  pendingRequests  - current pendingRequests from state
 * @param {number} newBudget        - available budget after reduction
 * @param {Object} citizenByHash    - map from citizenHash → citizen record (for Income_Tier lookup)
 * @returns {{ funded: Array, rejected: Array, remainingBudget: number, sortedQueue: Array }}
 */
export function reprioritizePendingQueue(pendingRequests, newBudget, citizenByHash) {
    if (!pendingRequests.length) {
        return { funded: [], rejected: [], remainingBudget: newBudget, sortedQueue: [] };
    }

    // Enrich each request with Income_Tier and priority
    const enriched = pendingRequests.map(req => {
        const citizen = citizenByHash[req.citizenHash];
        const incomeTier = citizen?.Income_Tier || 'High'; // default to lowest priority if unknown
        return {
            ...req,
            incomeTier,
            tierPriority: INCOME_TIER_PRIORITY[incomeTier] ?? 3,
        };
    });

    // Sort: tier priority ASC, then submission time ASC
    const sorted = [...enriched].sort((a, b) => {
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority;
        return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

    const funded = [];
    const rejected = [];
    let remaining = newBudget;

    for (const req of sorted) {
        if (remaining >= req.amount) {
            funded.push(req);
            remaining -= req.amount;
        } else {
            rejected.push({ ...req, autoRejectionReason: 'BUDGET_REALLOCATION' });
        }
    }

    return {
        funded,
        rejected,
        remainingBudget: remaining,
        sortedQueue: sorted, // full sorted list (includes funded + rejected) for UI preview
    };
}

/**
 * Calculate the total amount required for all pending requests.
 */
export function calcTotalRequired(pendingRequests) {
    return pendingRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
}
