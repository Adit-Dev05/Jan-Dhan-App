import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar } from 'recharts';
import { Flag, ShieldCheck, Info, Download, Eye, Lock, ScanSearch } from 'lucide-react';
import { getRiskLevel } from '../engine/fraudScoring';

const CHART_TOOLTIP_STYLE = {
    background: '#111d35', border: '1px solid #1a2d4a', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px'
};

const REJECTION_COLORS = {
    'ACCOUNT_INACTIVE': '#ff4757', 'AADHAAR_NOT_LINKED': '#ff6b6b', 'SCHEME_MISMATCH': '#f59e0b',
    'CLAIM_LIMIT_EXCEEDED': '#a855f7', 'FREQUENCY_VIOLATION': '#00b8d4', 'DUPLICATE_REJECTED': '#ff4757',
    'INSUFFICIENT_BUDGET': '#64748b', 'CITIZEN_NOT_FOUND': '#94a3b8',
    'IDENTITY_FROZEN': '#ef4444', 'BUDGET_REALLOCATION': '#f97316',
    'CLAIM_LIMIT_MANUAL_REVIEW': '#8b5cf6',
};

export default function FraudAnalytics() {
    const { stats, fraudAlerts, transactions, truncateHash, systemStatus, fraudClusters } = useApp();
    const [viewMode, setViewMode] = useState('real-time');

    const rejectionData = useMemo(() =>
        Object.entries(stats.rejectionReasons).map(([name, value]) => ({
            name: name.replace(/_/g, ' '), value, color: REJECTION_COLORS[name] || '#64748b'
        })), [stats.rejectionReasons]);

    const regionData = useMemo(() => {
        const regions = {};
        transactions.forEach(txn => {
            const region = (txn.regionCode || 'N/A').split('-')[0];
            if (!regions[region]) regions[region] = { approved: 0, rejected: 0 };
            txn.approved ? regions[region].approved++ : regions[region].rejected++;
        });
        return Object.entries(regions).map(([name, d]) => ({ name, ...d, total: d.approved + d.rejected }))
            .sort((a, b) => b.total - a.total).slice(0, 8);
    }, [transactions]);

    const riskGaugeData = [{ name: 'risk', value: stats.globalRiskScore, fill: stats.globalRiskScore > 60 ? '#ff4757' : stats.globalRiskScore > 30 ? '#f59e0b' : '#22c55e' }];
    const flaggedTransactions = useMemo(() => fraudAlerts.slice(-6).reverse(), [fraudAlerts]);

    return (
        <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-heading">Fraud Analytics & Risk Assessment</h2>
                    <p className="text-sm text-text-muted mt-1">Real-time secure benefit distribution monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-border-card overflow-hidden">
                        {['real-time', 'historical'].map(m => (
                            <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 text-xs font-semibold transition-all ${viewMode === m ? 'bg-accent-teal text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                {m === 'real-time' ? 'Real-time' : 'Historical'}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary flex items-center gap-2 text-xs"><Download size={14} /> Export Audit Report</button>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="glass-card p-5 flex flex-col items-center">
                    <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 self-start">Global Risk Score</h3>
                    <div className="w-32 h-32 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={riskGaugeData}>
                                <RadialBar dataKey="value" cornerRadius={5} background={{ fill: '#1a2d4a' }} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-xl font-black ${stats.globalRiskScore > 60 ? 'text-accent-red' : stats.globalRiskScore > 30 ? 'text-accent-amber' : 'text-accent-green'}`}>
                                {stats.globalRiskScore > 60 ? 'High' : stats.globalRiskScore > 30 ? 'Medium' : 'Low'}
                            </span>
                            <span className="text-[10px] text-text-muted">SCORE: {stats.globalRiskScore}/100</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Flagged Claims</h3>
                        <div className="p-1.5 rounded-md bg-accent-red/10"><Flag size={16} className="text-accent-red" /></div>
                    </div>
                    <p className="text-3xl font-black text-text-heading mb-1">{stats.fraudAlertCount.toLocaleString()}</p>
                    {stats.fraudAlertCount > 0 && <p className="text-xs text-accent-red">↑ {((stats.fraudAlertCount / Math.max(stats.totalTransactions, 1)) * 100).toFixed(1)}% of total</p>}
                </div>
                {/* Cluster summary card */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Identity Rings</h3>
                        <div className="p-1.5 rounded-md bg-accent-amber/10"><ScanSearch size={16} className="text-accent-amber" /></div>
                    </div>
                    <p className="text-3xl font-black text-text-heading mb-1">{stats.activeClusters || 0}</p>
                    <div className="flex flex-col gap-1">
                        {stats.highRiskClusters > 0 && <p className="text-xs text-accent-red">⚠ {stats.highRiskClusters} HIGH risk clusters</p>}
                        {stats.frozenCount > 0 && <p className="text-xs text-accent-amber">❄ {stats.frozenCount} identities frozen</p>}
                        <a href="/admin/clusters" className="text-[10px] text-accent-teal underline hover:opacity-80">View Cluster Report →</a>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Prevented Fraud</h3>
                        <div className="p-1.5 rounded-md bg-accent-green/10"><ShieldCheck size={16} className="text-accent-green" /></div>
                    </div>
                    <p className="text-3xl font-black text-text-heading mb-1">₹{(stats.preventedFraudAmount / 100000).toFixed(1)}L</p>
                    <p className="text-xs text-accent-green">Prevention efficiency active</p>
                </div>
            </div>

            {/* Integrity Bar */}
            <div className="glass-card p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">System Integrity Status</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${systemStatus === 'ACTIVE' ? 'bg-accent-green' : 'bg-accent-red'}`} />
                        <span className={`text-sm font-semibold ${systemStatus === 'ACTIVE' ? 'text-accent-green' : 'text-accent-red'}`}>
                            {systemStatus === 'ACTIVE' ? 'Encrypted End-to-End' : systemStatus}
                        </span>
                    </div>
                </div>
                <Lock size={14} className="text-text-muted" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-text-heading">Rejection Reasons Breakdown</h3>
                        <Info size={16} className="text-text-muted" />
                    </div>
                    {rejectionData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-text-muted text-sm">No rejection data yet</div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <div className="w-40 h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart><Pie data={rejectionData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                                        {rejectionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie><Tooltip contentStyle={CHART_TOOLTIP_STYLE} /></PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2">
                                {rejectionData.map(item => {
                                    const total = rejectionData.reduce((s, d) => s + d.value, 0);
                                    return (
                                        <div key={item.name} className="flex items-center gap-2 text-xs">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                            <span className="text-text-secondary flex-1 truncate">{item.name}</span>
                                            <span className="text-text-heading font-semibold">{((item.value / total) * 100).toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-text-heading">Claims per Region</h3>
                        <span className="text-xs text-accent-teal">Last 30 Days</span>
                    </div>
                    {regionData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-text-muted text-sm">No regional data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={regionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a2d4a" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                                <Bar dataKey="approved" stackId="a" fill="#22c55e" />
                                <Bar dataKey="rejected" stackId="a" fill="#ff4757" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Flagged Transactions */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-text-heading mb-1">Recent Flagged Transactions</h3>
                <p className="text-[10px] text-text-muted mb-4">Manual review required for highlighted entries</p>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border-card">
                            {['Citizen Hash', 'Transaction ID', 'Risk Level', 'Reason Code', 'Actions'].map(h => (
                                <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {flaggedTransactions.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-text-muted text-sm">No flagged transactions</td></tr>
                        ) : flaggedTransactions.map(alert => (
                            <tr key={alert.id} className="border-b border-border-card/50 hover:bg-bg-card-hover transition-colors">
                                <td className="px-4 py-3 text-xs font-mono text-accent-cyan">{truncateHash(alert.citizenHash)}</td>
                                <td className="px-4 py-3 text-xs text-text-secondary">{alert.transactionId}</td>
                                <td className="px-4 py-3"><span className={`badge ${alert.riskLevel === 'HIGH' ? 'badge-red' : alert.riskLevel === 'MEDIUM' ? 'badge-amber' : 'badge-green'}`}>● {alert.riskLevel}</span></td>
                                <td className="px-4 py-3 text-xs font-mono text-text-muted">{alert.reason}</td>
                                <td className="px-4 py-3"><button className="text-xs text-accent-teal hover:text-accent-cyan transition-colors flex items-center gap-1"><Eye size={12} /> View Details</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
