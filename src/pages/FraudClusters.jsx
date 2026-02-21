import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ScanSearch, ShieldAlert, ShieldOff, Download, Users, MapPin, AlertTriangle, Zap, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';

const RISK_BADGE = {
    HIGH: 'badge-red',
    MEDIUM: 'badge-amber',
    LOW: 'badge-green',
};

function ClusterRow({ cluster, onFreeze, onUnfreeze, truncateHash }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <tr className="border-b border-border-card/50 hover:bg-bg-card-hover transition-colors">
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-accent-teal">{cluster.clusterId}</span>
                        {cluster.frozen && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-red/20 text-accent-red border border-accent-red/30">
                                ❄ FROZEN
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-3">
                    <span className={`badge ${RISK_BADGE[cluster.riskLevel]}`}>● {cluster.riskLevel}</span>
                    <span className="text-[10px] text-text-muted ml-2">({cluster.riskScore}/100)</span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                        {cluster.regionCodes.map(r => (
                            <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
                                {r}
                            </span>
                        ))}
                    </div>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">{cluster.members.length}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                    {cluster.isCrossRegion && <span className="text-accent-red">Cross-Region</span>}
                    {cluster.isFormatVariant && <span className="text-accent-amber ml-1">ID Variant</span>}
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {!cluster.frozen ? (
                            <button
                                onClick={() => onFreeze(cluster.clusterId)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-accent-red/10 border border-accent-red/30 text-accent-red hover:bg-accent-red/20 transition-colors"
                            >
                                <Lock size={10} /> Freeze
                            </button>
                        ) : (
                            <button
                                onClick={() => onUnfreeze(cluster.clusterId)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-accent-green/10 border border-accent-green/30 text-accent-green hover:bg-accent-green/20 transition-colors"
                            >
                                <Unlock size={10} /> Unfreeze
                            </button>
                        )}
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className="p-1 rounded hover:bg-bg-card-hover transition-colors text-text-muted"
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="bg-bg-primary/50">
                    <td colSpan={6} className="px-4 py-3">
                        <div className="rounded-lg border border-border-card p-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                                Cluster Members — {cluster.members.length} identities
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {cluster.members.map((m, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-bg-card border border-border-card text-[11px]">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.accountStatus === 'Active' ? 'bg-accent-green' : 'bg-accent-red'}`} />
                                        <div className="min-w-0">
                                            <p className="font-mono text-accent-teal truncate">{truncateHash(m.citizenHash)}</p>
                                            <p className="text-text-muted">{m.regionCode} · {m.incomeTier} · {m.claimCount} claims</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export default function FraudClusters() {
    const { fraudClusters, stats, frozenHashes, detectClusters, freezeCluster, unfreezeCluster, exportClusterReport, truncateHash } = useApp();
    const [scanning, setScanning] = useState(false);
    const [filter, setFilter] = useState('ALL'); // ALL | HIGH | MEDIUM | LOW | FROZEN

    const handleScan = async () => {
        setScanning(true);
        await new Promise(r => setTimeout(r, 900));
        detectClusters();
        setScanning(false);
    };

    const handleExport = () => {
        const csv = exportClusterReport();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fraud_cluster_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = useMemo(() => {
        if (filter === 'FROZEN') return fraudClusters.filter(c => c.frozen);
        if (filter === 'ALL') return fraudClusters;
        return fraudClusters.filter(c => c.riskLevel === filter);
    }, [fraudClusters, filter]);

    const frozenCount = (frozenHashes || new Set()).size;

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-heading">Identity Cluster Analysis</h2>
                    <p className="text-sm text-text-muted mt-1">Cross-region duplicate identity ring detection</p>
                </div>
                <div className="flex items-center gap-3">
                    {fraudClusters.length > 0 && (
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-card text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-accent-teal/40 transition-colors">
                            <Download size={14} /> Export CSV
                        </button>
                    )}
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className="btn-primary flex items-center gap-2 text-xs"
                    >
                        <ScanSearch size={14} className={scanning ? 'animate-spin' : ''} />
                        {scanning ? 'Scanning Registry...' : 'Run Cluster Scan'}
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Clusters Detected', value: fraudClusters.length, color: 'text-text-heading', icon: ScanSearch },
                    { label: 'High Risk Rings', value: stats.highRiskClusters, color: 'text-accent-red', icon: ShieldAlert },
                    { label: 'Frozen Identities', value: frozenCount, color: 'text-accent-amber', icon: Lock },
                    { label: 'Regions Affected', value: [...new Set(fraudClusters.flatMap(c => c.regionCodes))].length, color: 'text-accent-teal', icon: MapPin },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{label}</span>
                            <Icon size={16} className={color} />
                        </div>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* How it works banner (shown before first scan) */}
            {fraudClusters.length === 0 && !scanning && (
                <div className="glass-card p-6 mb-6 border border-accent-teal/20">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-accent-teal/10 flex-shrink-0">
                            <Zap size={24} className="text-accent-teal" />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-heading mb-1">How Cross-Region Ring Detection Works</h3>
                            <p className="text-sm text-text-muted mb-3">
                                The scanner normalises every Citizen_ID (removing hidden characters, formatting differences, and whitespace), then re-hashes the result. If two or more citizens produce the <strong className="text-text-primary">same normalised hash</strong> but appear in different <strong className="text-text-primary">Region_Codes</strong>, they are grouped as a fraud cluster.
                            </p>
                            <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                                <li>Detects cross-region duplicates (same identity, different regions)</li>
                                <li>Detects ID format variants (same ID with spaces/hyphens/zero-width chars)</li>
                                <li>Risk-scored by region spread, claim count, and income tier</li>
                                <li>Admin can freeze all linked identities instantly</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Cluster Table */}
            {fraudClusters.length > 0 && (
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-text-heading">Fraud Cluster Report</h3>
                            <p className="text-[10px] text-text-muted mt-0.5">{fraudClusters.length} clusters detected — sorted by risk score</p>
                        </div>
                        {/* Filter tabs */}
                        <div className="flex rounded-lg border border-border-card overflow-hidden">
                            {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'FROZEN'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 text-[10px] font-semibold transition-all ${filter === f
                                        ? f === 'HIGH' ? 'bg-accent-red text-white'
                                            : f === 'MEDIUM' ? 'bg-accent-amber text-bg-primary'
                                                : f === 'FROZEN' ? 'bg-accent-blue/80 text-white'
                                                    : 'bg-accent-teal text-bg-primary'
                                        : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border-card">
                                    {['Cluster ID', 'Risk Level', 'Regions', 'Members', 'Type', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-text-muted text-sm">No clusters match this filter</td></tr>
                                ) : filtered.map(cluster => (
                                    <ClusterRow
                                        key={cluster.clusterId}
                                        cluster={cluster}
                                        onFreeze={freezeCluster}
                                        onUnfreeze={unfreezeCluster}
                                        truncateHash={truncateHash}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Frozen identities summary */}
            {frozenCount > 0 && (
                <div className="glass-card p-4 mt-4 border border-accent-red/20">
                    <div className="flex items-center gap-2">
                        <ShieldOff size={16} className="text-accent-red" />
                        <span className="text-sm font-semibold text-accent-red">{frozenCount} identities currently frozen</span>
                        <span className="text-xs text-text-muted">— any submission attempt will be instantly rejected with IDENTITY_FROZEN</span>
                    </div>
                </div>
            )}
        </div>
    );
}
