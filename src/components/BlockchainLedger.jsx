import React from 'react';
import { useApp } from '../context/AppContext';
import { Link2, ExternalLink } from 'lucide-react';

export default function BlockchainLedger() {
    const { ledger, truncateHash } = useApp();

    // Show latest entries (excluding genesis), reversed
    const recentEntries = ledger.filter(b => b.status !== 'GENESIS').slice(-8).reverse();

    return (
        <div className="glass-card p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-text-heading">Blockchain Ledger</h3>
                <span className="badge badge-green flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                    Live Feed
                </span>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {recentEntries.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-text-muted text-sm">No transactions yet</p>
                        <p className="text-text-muted text-xs mt-1">Process a claim to see ledger entries</p>
                    </div>
                ) : (
                    recentEntries.map((entry, idx) => (
                        <div key={entry.index} className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/50 border border-border-card/50 slide-in hover:border-accent-teal/20 transition-all"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className={`p-1.5 rounded-md ${entry.status === 'APPROVED' ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-teal/10 text-accent-teal'
                                }`}>
                                <Link2 size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-accent-teal truncate">
                                    {truncateHash(entry.citizenHash)}
                                </p>
                                <p className="text-[10px] text-text-muted">TX#{entry.index.toString().padStart(6, '0')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-text-muted">
                                    {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                                <p className="text-sm font-bold text-accent-green">₹{entry.amount.toLocaleString('en-IN')}</p>
                            </div>
                            <ExternalLink size={12} className="text-text-muted hover:text-text-primary cursor-pointer flex-shrink-0" />
                        </div>
                    ))
                )}
            </div>

            {ledger.length > 1 && (
                <button className="w-full mt-4 py-2 text-center text-xs font-semibold text-text-muted uppercase tracking-wider border border-border-card rounded-lg hover:border-accent-teal/30 hover:text-text-primary transition-all">
                    View Full Ledger
                </button>
            )}
        </div>
    );
}
