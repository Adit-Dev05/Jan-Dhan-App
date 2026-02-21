import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, ShieldOff, RefreshCw, Download, RotateCcw } from 'lucide-react';

export default function FrozenOverlay() {
    const { systemStatus, tamperEvent, tamperScenario, dispatch, exportLedger, ledgerBackup } = useApp();

    if (systemStatus !== 'FROZEN') return null;

    const handleRestore = () => {
        dispatch({ type: 'RESTORE_CHAIN' });
    };

    const handleExport = () => {
        const csv = exportLedger();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jan_dhan_breach_audit_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-bg-primary/95 backdrop-blur-xl flex items-center justify-center">
            <div className="max-w-lg w-full mx-4">
                <div className="glass-card p-8 border border-accent-red/30 relative overflow-hidden">
                    {/* Animated border */}
                    <div className="absolute inset-0 border-2 border-accent-red/40 rounded-xl animate-pulse pointer-events-none" />

                    {/* Warning icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-accent-red" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-text-heading text-center mb-2">
                        ⚠ HASH CHAIN MISMATCH DETECTED
                    </h2>

                    <div className="flex justify-center mb-6">
                        <span className="px-4 py-1.5 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-bold uppercase tracking-wider">
                            System Status: FROZEN
                        </span>
                    </div>

                    {/* Scenario Description */}
                    {tamperScenario && (
                        <div className="mb-5 p-4 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                            <p className="text-xs font-bold text-accent-amber mb-1">{tamperScenario.type}</p>
                            <p className="text-xs text-text-secondary leading-relaxed">{tamperScenario.description}</p>
                        </div>
                    )}

                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldOff size={16} className="text-accent-red" />
                            <h3 className="text-sm font-bold text-text-heading">Security Breach Protocol Initiated</h3>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">
                            Integrity compromise identified in the <strong>Benefit Distribution Layer</strong>.
                            The blockchain hash sequence has diverged from expected values. All outbound transactions have been suspended.
                        </p>
                    </div>

                    {/* Breach Details */}
                    {tamperEvent && (
                        <div className="bg-bg-primary/80 rounded-lg p-4 font-mono text-[11px] mb-6 border border-border-card">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-accent-red">[SYSTEM_EVENT] CRITICAL_INTEGRITY_FAILURE</span>
                                <span className="text-text-muted">{tamperEvent.timestamp}</span>
                            </div>
                            <div className="space-y-1.5 text-text-muted">
                                <p>BLOCK_ID:    <span className="text-accent-amber">#{tamperEvent.blockId}</span></p>
                                <p>EXPECTED:    <span className="text-accent-teal">{tamperEvent.expectedHash?.substring(0, 24)}...</span></p>
                                <p>RECEIVED:    <span className="text-accent-red">{tamperEvent.receivedHash?.substring(0, 24)}...</span></p>
                                <p>STATUS:      <span className="text-accent-red font-bold">CRITICAL MISMATCH</span></p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-border-card/50 text-text-muted space-y-0.5">
                                <p>&gt; Initializing node isolation... OK</p>
                                <p>&gt; Freezing distribution wallets... OK</p>
                                <p>&gt; Preserving forensic evidence... OK</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {ledgerBackup && (
                            <button onClick={handleRestore} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent-green/10 border border-accent-green/30 text-accent-green text-xs font-bold hover:bg-accent-green/20 transition-all">
                                <RotateCcw size={14} />
                                Restore Chain
                            </button>
                        )}
                        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-bg-card border border-border-card text-text-heading text-xs font-bold hover:bg-bg-card-hover transition-all">
                            <Download size={14} />
                            Export Audit Log
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-border-card/30 flex items-center justify-between text-[9px] text-text-muted uppercase tracking-wider">
                        <span>🟡 Protocol Active</span>
                        <span>SEC_LVL:5</span>
                        <span>CRYPTO: SHA-256</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
