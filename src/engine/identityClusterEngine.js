// Identity Cluster Engine
// Detects cross-region duplicate identity rings:
// Same Citizen_ID (after normalisation) appearing in >1 Region_Code.

import { normalizeCitizenId, hashNormalized } from './hashUtils';

/**
 * Income tier risk weight — higher claim count + multiple regions = higher fraud risk
 */
const TIER_RISK = { Low: 10, Medium: 20, High: 30 };

/**
 * Build a map of normalizedHash → array of registry citizens.
 * Citizens whose IDs normalize to the same value are potential duplicates.
 *
 * @param {Array} citizenRegistry - full registry array (each has Citizen_ID, Region_Code, etc.)
 * @returns {Map<string, Array>} normalizedHash → citizens[]
 */
export function buildClusterMap(citizenRegistry) {
    const map = new Map();
    for (const citizen of citizenRegistry) {
        const normalized = normalizeCitizenId(citizen.Citizen_ID);
        const hash = hashNormalized(citizen.Citizen_ID);
        if (!map.has(hash)) {
            map.set(hash, { normalizedId: normalized, members: [] });
        }
        map.get(hash).members.push(citizen);
    }
    return map;
}

/**
 * Detect cross-region rings: same normalised hash appearing in >1 Region_Code.
 * Also flags same hash in same region with different raw IDs (formatting fraud).
 *
 * @param {Map} clusterMap - from buildClusterMap
 * @returns {Array<FraudCluster>}
 */
export function detectCrossRegionRings(clusterMap) {
    const clusters = [];
    let clusterIndex = 1;

    for (const [normalizedHash, { normalizedId, members }] of clusterMap.entries()) {
        const regionCodes = [...new Set(members.map(m => m.Region_Code))];
        const rawIds = [...new Set(members.map(m => String(m.Citizen_ID)))];

        const isCrossRegion = regionCodes.length > 1;
        const isFormatVariant = rawIds.length > 1 && regionCodes.length >= 1;

        if (!isCrossRegion && !isFormatVariant) continue;

        // Risk score: base + region spread + claim count variance
        const maxClaims = Math.max(...members.map(m => m.Claim_Count || 0));
        const tierBonus = members.reduce((sum, m) => sum + (TIER_RISK[m.Income_Tier] || 10), 0);
        const riskScore = Math.min(
            30 + (regionCodes.length - 1) * 20 + maxClaims * 5 + Math.round(tierBonus / members.length),
            100
        );

        clusters.push({
            clusterId: `CLR-${String(clusterIndex++).padStart(4, '0')}`,
            normalizedHash,
            normalizedId,
            members: members.map(m => ({
                citizenId: String(m.Citizen_ID),
                citizenHash: m.hash,
                regionCode: m.Region_Code,
                incomeTier: m.Income_Tier,
                claimCount: m.Claim_Count,
                accountStatus: m.Account_Status,
            })),
            regionCodes,
            rawIdVariants: rawIds,
            isCrossRegion,
            isFormatVariant,
            riskScore,
            riskLevel: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
            detectedAt: new Date().toISOString(),
            frozen: false,
        });
    }

    // Sort descending by risk score
    return clusters.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Generate a JSON-serialisable fraud cluster report.
 * Can be converted to CSV for download.
 */
export function generateFraudClusterReport(clusters) {
    const report = {
        generatedAt: new Date().toISOString(),
        totalClusters: clusters.length,
        highRisk: clusters.filter(c => c.riskLevel === 'HIGH').length,
        mediumRisk: clusters.filter(c => c.riskLevel === 'MEDIUM').length,
        lowRisk: clusters.filter(c => c.riskLevel === 'LOW').length,
        clusters: clusters.map(c => ({
            clusterId: c.clusterId,
            riskLevel: c.riskLevel,
            riskScore: c.riskScore,
            regionCount: c.regionCodes.length,
            memberCount: c.members.length,
            regions: c.regionCodes.join(' | '),
            idVariants: c.rawIdVariants.join(' | '),
            normalizedId: c.normalizedId,
            frozen: c.frozen,
            detectedAt: c.detectedAt,
        })),
    };
    return report;
}

/**
 * Export cluster report as CSV string.
 */
export function exportClusterReportCSV(clusters) {
    const report = generateFraudClusterReport(clusters);
    const headers = ['Cluster ID', 'Risk Level', 'Risk Score', 'Regions', 'Members', 'ID Variants', 'Frozen', 'Detected At'];
    const rows = report.clusters.map(c => [
        c.clusterId, c.riskLevel, c.riskScore, `"${c.regions}"`,
        c.memberCount, `"${c.idVariants}"`, c.frozen, c.detectedAt
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
