import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

export default function TransactionMonitor() {
    const { transactions, truncateHash } = useApp();
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
                (statusFilter === 'approved' && txn.approved) ||
                (statusFilter === 'rejected' && !txn.approved);

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
                    <p className="text-sm text-text-muted mt-1">Real-time transaction processing log with audit trail</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{filtered.length} transactions</span>
                </div>
            </div>

            {/* Filters */}
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

            {/* Table */}
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
                                paginated.map((txn, idx) => (
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
                                            {txn.approved ? `₹${txn.amount.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${txn.approved ? 'badge-green' : 'badge-red'}`}>
                                                {txn.approved ? 'APPROVED' : 'REJECTED'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-mono text-text-muted">
                                                {txn.rejectionReason || '—'}
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
