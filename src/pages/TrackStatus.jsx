import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, FileCheck, Clock, CheckCircle2, XCircle, Shield, ArrowRight } from 'lucide-react';

export default function TrackStatus() {
    const { getTransaction, truncateHash } = useApp();
    const [txnId, setTxnId] = useState('');
    const [result, setResult] = useState(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!txnId.trim()) return;
        const txn = getTransaction(txnId.trim().toUpperCase());
        setResult(txn);
        setSearched(true);
    };

    return (
        <div className="fade-in max-w-3xl mx-auto p-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-text-heading">Track Your Claim</h2>
                <p className="text-sm text-text-muted mt-2">Enter your Transaction Reference ID to check the status of your benefit claim</p>
            </div>

            {/* Search Form */}
            <div className="glass-card p-6 mb-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            className="input-field pl-10 font-mono uppercase"
                            placeholder="TXN-00001-JDG"
                            value={txnId}
                            onChange={(e) => { setTxnId(e.target.value); setSearched(false); }}
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    </div>
                    <button type="submit" className="btn-primary px-6 flex items-center gap-2">
                        <FileCheck size={16} /> Check Status
                    </button>
                </form>
            </div>

            {/* Result */}
            {searched && !result && (
                <div className="glass-card p-8 text-center">
                    <XCircle size={40} className="text-accent-red mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-text-heading mb-2">Transaction Not Found</h3>
                    <p className="text-sm text-text-muted">
                        No claim found with ID <span className="font-mono text-accent-red">{txnId.toUpperCase()}</span>. Please check your reference number.
                    </p>
                </div>
            )}

            {result && (
                <div className="space-y-6 fade-in">
                    {/* Status Card */}
                    <div className={`glass-card p-6 border-l-4 ${result.approved ? 'border-l-accent-green' : 'border-l-accent-red'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {result.approved ? (
                                    <CheckCircle2 size={28} className="text-accent-green" />
                                ) : (
                                    <XCircle size={28} className="text-accent-red" />
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-text-heading">
                                        {result.approved ? 'Claim Approved' : 'Claim Not Approved'}
                                    </h3>
                                    <p className="text-xs text-text-muted font-mono">{result.id}</p>
                                </div>
                            </div>
                            <span className={`badge text-xs ${result.approved ? 'badge-green' : 'badge-red'}`}>
                                {result.approved ? 'APPROVED' : 'REJECTED'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Scheme</p>
                                <p className="text-sm font-semibold text-text-heading mt-1">{result.scheme}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Amount</p>
                                <p className="text-sm font-semibold text-accent-green mt-1">
                                    {result.approved ? `₹${result.amount.toLocaleString('en-IN')}` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Region</p>
                                <p className="text-sm font-semibold text-text-heading mt-1">{result.regionCode}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider">Timestamp</p>
                                <p className="text-sm font-semibold text-text-heading mt-1">
                                    {new Date(result.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>

                        {!result.approved && result.rejectionReason && (
                            <div className="mt-4 p-3 rounded-lg bg-accent-red/5 border border-accent-red/10">
                                <p className="text-xs text-text-muted">
                                    <span className="font-semibold text-accent-red">Reason:</span>{' '}
                                    {result.rejectionReason.replace(/_/g, ' ')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Validation Pipeline */}
                    {result.gateResults && result.gateResults.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-sm font-bold text-text-heading mb-4">Validation Pipeline</h3>
                            <div className="flex items-center gap-2 mb-6">
                                {result.gateResults.map((gate, i) => (
                                    <React.Fragment key={gate.gate}>
                                        <div className={`flex-1 p-3 rounded-lg border text-center ${gate.passed
                                            ? 'border-accent-green/30 bg-accent-green/5'
                                            : 'border-accent-red/30 bg-accent-red/5'
                                            }`}>
                                            <div className={`text-lg mb-1 ${gate.passed ? 'text-accent-green' : 'text-accent-red'}`}>
                                                {gate.passed ? '✓' : '✗'}
                                            </div>
                                            <p className="text-[10px] font-bold text-text-heading">{gate.name}</p>
                                        </div>
                                        {i < result.gateResults.length - 1 && (
                                            <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {result.gateResults.map(gate => (
                                <div key={gate.gate} className="mb-3 last:mb-0">
                                    {gate.checks.map((check, ci) => (
                                        <div key={ci} className="flex items-center justify-between text-xs py-1.5 border-b border-border-card/30 last:border-0">
                                            <span className="text-text-muted">{check.check}</span>
                                            <span className={check.passed ? 'text-accent-green font-medium' : 'text-accent-red font-medium'}>
                                                {check.detail}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 text-[10px] text-text-muted">
                        <Shield size={12} />
                        <span>This transaction is recorded on an immutable SHA-256 hash-linked ledger</span>
                    </div>
                </div>
            )}
        </div>
    );
}
