import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IndianRupee, TrendingDown, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock, BarChart2 } from 'lucide-react';
import { reprioritizePendingQueue, INCOME_TIER_PRIORITY } from '../engine/budgetAllocationEngine';

const TIER_COLOR = { Low: 'text-accent-green', Medium: 'text-accent-amber', High: 'text-accent-red' };
const TIER_BADGE_BG = { Low: 'bg-accent-green/10 border-accent-green/30 text-accent-green', Medium: 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber', High: 'bg-accent-red/10 border-accent-red/30 text-accent-red' };

export default function BudgetControl() {
    const { budget, stats, pendingRequests, citizenByHash, truncateHash, reduceBudget, budgetReductionLog } = useApp();
    const [customPct, setCustomPct] = useState(20);
    const [confirming, setConfirming] = useState(false);
    const [applying, setApplying] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const INITIAL_BUDGET = 1000000;

    // Live preview of what a reduction would do to the queue
    const preview = useMemo(() => {
        const { newBudget } = { newBudget: Math.floor(budget * (1 - customPct / 100)) };
        return reprioritizePendingQueue(pendingRequests, newBudget, citizenByHash);
    }, [pendingRequests, budget, customPct, citizenByHash]);

    const handleApply = async () => {
        setApplying(true);
        await new Promise(r => setTimeout(r, 700));
        reduceBudget(customPct);
        setApplying(false);
        setConfirming(false);
    };

    const budgetPercent = ((budget / INITIAL_BUDGET) * 100).toFixed(1);
    const budgetBar = parseFloat(budgetPercent);
    const previewNewBudget = Math.floor(budget * (1 - customPct / 100));
    const previewCut = budget - previewNewBudget;

    const log = [...(budgetReductionLog || [])].reverse();

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-heading">Dynamic Budget Reallocation</h2>
                    <p className="text-sm text-text-muted mt-1">Mid-cycle budget cuts with Income_Tier-prioritised queue reordering</p>
                </div>
                <button
                    onClick={() => setShowHistory(v => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-card text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                    <Clock size={14} /> History ({log.length})
                    {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>

            {/* Reduction History */}
            {showHistory && log.length > 0 && (
                <div className="glass-card p-5 mb-6 border border-accent-amber/20">
                    <h3 className="text-sm font-bold text-text-heading mb-3">Reduction History</h3>
                    <div className="space-y-2">
                        {log.map(entry => (
                            <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-bg-primary border border-border-card text-xs">
                                <span className="text-accent-amber font-bold">-{entry.reductionPercent}%</span>
                                <span className="text-text-muted">₹{entry.cutAmount.toLocaleString()} cut</span>
                                <span className="text-accent-green">✓ {entry.claimsFunded} funded</span>
                                <span className="text-accent-red">✗ {entry.claimsRejected} dropped</span>
                                <span className="text-text-muted ml-auto">{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Budget Overview */}
                <div className="glass-card p-5 lg:col-span-2">
                    <h3 className="text-sm font-bold text-text-heading mb-4">Current Budget Status</h3>

                    <div className="flex items-end justify-between mb-2">
                        <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Remaining Budget</p>
                            <p className="text-3xl font-black text-text-heading">₹{budget.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Used</p>
                            <p className="text-xl font-bold text-accent-red">₹{(INITIAL_BUDGET - budget).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Budget bar */}
                    <div className="h-3 rounded-full bg-bg-primary border border-border-card overflow-hidden mb-1">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${budgetBar > 50 ? 'bg-accent-green' : budgetBar > 20 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                            style={{ width: `${budgetBar}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted mb-4">
                        <span>{budgetBar}% remaining</span>
                        <span>₹{INITIAL_BUDGET.toLocaleString()} initial</span>
                    </div>

                    {/* After cut preview bar */}
                    <div className="p-3 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                        <p className="text-[10px] text-accent-amber font-semibold uppercase tracking-wider mb-2">After {customPct}% Reduction</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-bg-primary border border-border-card overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-accent-amber transition-all duration-500"
                                    style={{ width: `${((previewNewBudget / INITIAL_BUDGET) * 100).toFixed(1)}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-accent-amber whitespace-nowrap">₹{previewNewBudget.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-1">Cut amount: ₹{previewCut.toLocaleString()}</p>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="glass-card p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-text-heading mb-4">Reallocation Control</h3>

                    <div className="mb-4">
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                            Reduction Percentage
                        </label>
                        <div className="flex items-center gap-3 mb-2">
                            <input
                                type="range"
                                min={1}
                                max={50}
                                value={customPct}
                                onChange={e => { setCustomPct(Number(e.target.value)); setConfirming(false); }}
                                className="flex-1 accent-accent-amber"
                            />
                            <span className="text-xl font-black text-accent-amber w-12 text-right">{customPct}%</span>
                        </div>
                        <div className="flex gap-2">
                            {[10, 20, 30].map(p => (
                                <button
                                    key={p}
                                    onClick={() => { setCustomPct(p); setConfirming(false); }}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${customPct === p
                                        ? 'bg-accent-amber/20 border-accent-amber text-accent-amber'
                                        : 'border-border-card text-text-muted hover:border-accent-amber/40'}`}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto">
                        {!confirming ? (
                            <button
                                onClick={() => setConfirming(true)}
                                disabled={pendingRequests.length === 0 && budget === 0}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-amber/10 border border-accent-amber/40 text-accent-amber text-sm font-bold hover:bg-accent-amber/20 transition-all disabled:opacity-40"
                            >
                                <TrendingDown size={16} /> Apply {customPct}% Budget Cut
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red text-center">
                                    ⚠ This will drop {preview.rejected.length} pending claim(s). Confirm?
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg border border-border-card text-xs text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                                    <button
                                        onClick={handleApply}
                                        disabled={applying}
                                        className="flex-1 py-2 rounded-lg bg-accent-red text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                                    >
                                        {applying ? 'Applying...' : 'Confirm Cut'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Queue Preview */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-text-heading">Queue Reorder Preview</h3>
                        <p className="text-[10px] text-text-muted mt-0.5">
                            Sorted by Income_Tier priority (Low → Medium → High). Greedy fill up to ₹{previewNewBudget.toLocaleString()}.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-accent-green"><CheckCircle2 size={12} /> {preview.funded.length} Funded</span>
                        <span className="flex items-center gap-1 text-xs text-accent-red"><XCircle size={12} /> {preview.rejected.length} Dropped</span>
                    </div>
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-sm">
                        No pending claims in the queue. Submit a claim first to see reallocation preview.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border-card">
                                    {['Priority', 'Claim ID', 'Citizen Hash', 'Scheme', 'Amount', 'Income Tier', 'Status After Cut'].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.sortedQueue.map((req, idx) => {
                                    const funded = preview.funded.some(f => f.id === req.id);
                                    const tier = req.incomeTier || 'High';
                                    return (
                                        <tr key={req.id} className={`border-b border-border-card/50 transition-colors ${funded ? 'hover:bg-bg-card-hover' : 'opacity-60 bg-accent-red/5'}`}>
                                            <td className="px-3 py-3 text-xs font-mono text-text-muted">#{idx + 1}</td>
                                            <td className="px-3 py-3 text-xs font-mono text-accent-teal">{req.id}</td>
                                            <td className="px-3 py-3 text-xs font-mono text-text-secondary">{truncateHash(req.citizenHash)}</td>
                                            <td className="px-3 py-3 text-xs text-text-secondary">{req.scheme}</td>
                                            <td className="px-3 py-3 text-xs font-semibold text-text-heading">₹{req.amount?.toLocaleString()}</td>
                                            <td className="px-3 py-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${TIER_BADGE_BG[tier]}`}>
                                                    {tier}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                {funded
                                                    ? <span className="flex items-center gap-1 text-xs text-accent-green"><CheckCircle2 size={12} /> Funded</span>
                                                    : <span className="flex items-center gap-1 text-xs text-accent-red"><XCircle size={12} /> Dropped</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Priority legend */}
                <div className="mt-4 pt-4 border-t border-border-card flex items-center gap-6 text-[10px] text-text-muted">
                    <span className="font-semibold uppercase tracking-wider">Priority Order:</span>
                    {Object.entries(INCOME_TIER_PRIORITY).sort((a, b) => a[1] - b[1]).map(([tier, pri]) => (
                        <span key={tier} className={`flex items-center gap-1 font-semibold ${TIER_COLOR[tier]}`}>
                            {pri}. {tier} Income
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
