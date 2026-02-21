import React from 'react';
import { useApp } from '../context/AppContext';
import KPICard from '../components/KPICard';
import BlockchainLedger from '../components/BlockchainLedger';
import { Wallet, ArrowLeftRight, XCircle, AlertTriangle, Lock, ScanSearch } from 'lucide-react';

export default function Dashboard() {
    const { stats, budget, systemStatus } = useApp();

    return (
        <div className="fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <KPICard
                    title="Budget Remaining"
                    value={`₹${(budget / 100000).toFixed(1)} L`}
                    icon={Wallet}
                    variant="success"
                    trend="neutral"
                    trendLabel={`${stats.budgetPercent}% remaining`}
                >
                    <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full bg-gradient-to-r from-accent-teal to-accent-cyan rounded-full transition-all duration-700"
                            style={{ width: `${stats.budgetPercent}%` }}
                        />
                    </div>
                </KPICard>

                <KPICard
                    title="Total Transactions"
                    value={stats.totalTransactions.toLocaleString('en-IN')}
                    icon={ArrowLeftRight}
                    trend="up"
                    trendLabel={`${stats.approved} approved`}
                />

                <KPICard
                    title="Rejected"
                    value={`${stats.rejectionRate}%`}
                    icon={XCircle}
                    variant="danger"
                    trend={parseFloat(stats.rejectionRate) > 0 ? 'down' : 'neutral'}
                    trendLabel={`${stats.rejected} rejected`}
                />

                <KPICard
                    title="Fraud Alerts"
                    value={stats.fraudAlertCount}
                    icon={AlertTriangle}
                    variant="warning"
                >
                    {stats.criticalAlerts > 0 && (
                        <span className="badge badge-red mt-1 inline-block">{stats.criticalAlerts} Critical</span>
                    )}
                </KPICard>

                <KPICard
                    title="Frozen Identities"
                    value={stats.frozenCount || 0}
                    icon={Lock}
                    variant="danger"
                    trendLabel={stats.frozenCount > 0 ? 'Click to manage' : 'None frozen'}
                >
                    {stats.frozenCount > 0 && (
                        <a href="/admin/clusters" className="badge badge-red mt-1 inline-block cursor-pointer hover:opacity-80">❄ {stats.frozenCount} Frozen</a>
                    )}
                </KPICard>

                <KPICard
                    title="Identity Clusters"
                    value={stats.activeClusters || 0}
                    icon={ScanSearch}
                    variant={stats.highRiskClusters > 0 ? 'warning' : 'neutral'}
                    trendLabel={stats.highRiskClusters > 0 ? `${stats.highRiskClusters} HIGH risk` : 'No clusters yet'}
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Recent Transactions Summary */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Quick Stats */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-text-heading mb-4">System Overview</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 rounded-lg bg-bg-primary/50 border border-border-card/50">
                                <p className="text-2xl font-black text-accent-green">{stats.approved}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Approved</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-bg-primary/50 border border-border-card/50">
                                <p className="text-2xl font-black text-accent-amber">{stats.pending}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Pending</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-bg-primary/50 border border-border-card/50">
                                <p className="text-2xl font-black text-accent-red">{stats.rejected}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Rejected</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-bg-primary/50 border border-border-card/50">
                                <p className="text-2xl font-black text-accent-amber">{stats.criticalAlerts}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Flagged</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Rejections */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-text-heading mb-4">Recent Rejection Reasons</h3>
                        {Object.keys(stats.rejectionReasons).length === 0 ? (
                            <p className="text-text-muted text-sm text-center py-4">No rejections yet — all systems nominal</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(stats.rejectionReasons).map(([reason, count]) => (
                                    <div key={reason} className="flex items-center justify-between p-3 rounded-lg bg-bg-primary/50 border border-border-card/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-accent-red" />
                                            <span className="text-xs font-mono text-accent-red">{reason}</span>
                                        </div>
                                        <span className="text-sm font-bold text-text-heading">{count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* System Status */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-text-heading">System Integrity Status</h3>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${systemStatus === 'ACTIVE' ? 'bg-accent-green' : 'bg-accent-red'
                                    }`} />
                                <span className={`text-xs font-semibold ${systemStatus === 'ACTIVE' ? 'text-accent-green' : 'text-accent-red'
                                    }`}>
                                    {systemStatus === 'ACTIVE' ? 'Encrypted End-to-End' : systemStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Blockchain Ledger */}
                <div className="lg:col-span-2">
                    <BlockchainLedger />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 pt-4 border-t border-border-card flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <Lock size={10} /> Secure 256-Bit Encrypted
                    </span>
                    <span>Audit Log v2.4.0</span>
                </div>
                <span>National Informatics Centre (NIC) - Dashboard</span>
            </footer>
        </div>
    );
}
