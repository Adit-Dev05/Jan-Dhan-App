import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Bell } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

export default function TransactionMonitor() {
    const { transactions, pendingRequests, approveRequest, rejectRequest, truncateHash } = useApp();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [schemeFilter, setSchemeFilter] = useState('all');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        return transactions.filter(txn => {
            const matchSearch = !search ||
                txn.id.toLowerCase().includes(search.toLowerCase()) ||
                txn.citizenHash.includes(search.toLowerCase()) ||
                (txn.regionCode && txn.regionCode.toLowerCase().includes(search.toLowerCase()));

            const matchStatus = statusFilter === 'all' ||
                (statusFilter === 'approved' && txn.status === 'APPROVED') ||
                (statusFilter === 'rejected' && txn.status === 'REJECTED') ||
                (statusFilter === 'pending' && txn.status === 'PENDING');

            const matchScheme = schemeFilter === 'all' || txn.scheme === schemeFilter;

            return matchSearch && matchStatus && matchScheme;
        }).reverse();
    }, [transactions, search, statusFilter, schemeFilter]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const uniqueSchemes = [...new Set(transactions.map(t => t.scheme))];

    return (
        <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-heading">Transaction Monitor</h2>
                    <p className="text-sm text-text-muted mt-1">Real-time transaction processing log with admin approval queue</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingRequests.length > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-amber/15 border border-accent-amber/30 text-xs font-bold text-accent-amber animate-pulse">
                            <Bell size={12} />
                            {pendingRequests.length} Pending
                        </span>
                    )}
                    <span className="text-xs text-text-muted">{transactions.length} total</span>
                </div>
            </div>

            {/* ── Pending Approval Queue ── */}
            {pendingRequests.length > 0 && (
                <div className="glass-card p-5 mb-6 border border-accent-amber/25">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-accent-amber" />
                        <h3 className="text-sm font-bold text-accent-amber">Pending Admin Approval</h3>
                        <span className="ml-auto badge bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                            {pendingRequests.length} awaiting review
                        </span>
                    </div>

                    <div className="space-y-3">
                        {pendingRequests.map(req => (
                            <div
                                key={req.id}
                                className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-accent-amber/5 border border-accent-amber/15 hover:border-accent-amber/30 transition-all"
                            >
                                <div className="flex flex-wrap items-center gap-6 min-w-0">
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Ref ID</p>
                                        <p className="text-xs font-mono text-text-heading mt-0.5">{req.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Citizen Hash</p>
                                        <p className="text-xs font-mono text-accent-cyan mt-0.5">{truncateHash(req.citizenHash, 8)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Scheme</p>
                                        <span className="badge badge-blue mt-0.5 inline-block">{req.scheme}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Amount</p>
                                        <p className="text-sm font-bold text-text-heading mt-0.5">₹{req.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Region</p>
                                        <p className="text-xs text-text-secondary mt-0.5">{req.regionCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Submitted</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                            {new Date(req.submittedAt).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Gates</p>
                                        <p className="text-[10px] text-accent-green font-semibold mt-0.5">
                                            {req.gateResults?.filter(g => g.passed).length ?? 0}/{req.gateResults?.length ?? 3} PASS
                                        </p>
                                    </div>
                                    {req.manualReview && (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-accent-amber/20 border border-accent-amber/40 text-accent-amber">
                                            ⚠ Manual Review
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => approveRequest(req.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green/15 border border-accent-green/30 text-accent-green text-xs font-bold hover:bg-accent-green/25 transition-all"
                                    >
                                        <CheckCircle2 size={14} /> Approve
                                    </button>
                                    <button
                                        onClick={() => rejectRequest(req.id, 'ADMIN_REJECTED')}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-red/15 border border-accent-red/30 text-accent-red text-xs font-bold hover:bg-accent-red/25 transition-all"
                                    >
                                        <XCircle size={14} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Search by Transaction ID, Citizen Hash, or Region..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-text-muted" />
                        <select
                            className="input-field w-auto"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            className="input-field w-auto"
                            value={schemeFilter}
                            onChange={(e) => { setSchemeFilter(e.target.value); setPage(1); }}
                        >
                            <option value="all">All Schemes</option>
                            {uniqueSchemes.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Transactions Table ── */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-card">
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Citizen Hash</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Transaction ID</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Scheme</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Reason</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Region</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                                        {transactions.length === 0 ? 'No transactions processed yet' : 'No matching transactions found'}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((txn) => (
                                    <tr key={txn.id} className="border-b border-border-card/50 hover:bg-bg-card-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-accent-cyan">
                                                {truncateHash(txn.citizenHash, 6)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-secondary">{txn.id}</td>
                                        <td className="px-4 py-3">
                                            <span className="badge badge-blue">{txn.scheme}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-text-heading">
                                            {txn.status === 'APPROVED' ? `₹${txn.amount.toLocaleString('en-IN')}` : txn.status === 'PENDING' ? `₹${txn.amount?.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${txn.status === 'APPROVED' ? 'badge-green' : txn.status === 'PENDING' ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30' : 'badge-red'}`}>
                                                {txn.status || (txn.approved ? 'APPROVED' : 'REJECTED')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-mono text-text-muted">
                                                {txn.rejectionReason || (txn.status === 'PENDING' ? 'Awaiting admin' : '—')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-secondary">{txn.regionCode}</td>
                                        <td className="px-4 py-3 text-[10px] text-text-muted">
                                            {new Date(txn.timestamp).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border-card">
                        <span className="text-xs text-text-muted">
                            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-md border border-border-card hover:border-accent-teal/30 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={14} className="text-text-secondary" />
                            </button>
                            <span className="text-xs text-text-secondary px-2">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-md border border-border-card hover:border-accent-teal/30 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={14} className="text-text-secondary" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
