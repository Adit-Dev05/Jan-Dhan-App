import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { stepByStepVerify } from '../engine/ledgerManager';
import { sha256Sync } from '../engine/hashUtils';
import { Download, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, FileWarning, CheckCircle2, XCircle, Play, RotateCcw, Zap, Hash, Trash2, FlaskConical, Copy, Check } from 'lucide-react';

function HashVerifierPanel() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setResult(sha256Sync(input));
    }, [input]);

    const copyHash = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card p-5 mt-6 border border-accent-teal/20">
            <div className="flex items-center gap-2 mb-4">
                <FlaskConical size={20} className="text-accent-teal" />
                <div>
                    <h3 className="text-sm font-bold text-text-heading">SHA-256 Live Verifier</h3>
                    <p className="text-[10px] text-text-muted">Real SHA-256 (js-sha256) — type any string to compute its hash live</p>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">Input String</label>
                <input
                    type="text"
                    className="input-field font-mono text-sm"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type anything to hash..."
                />
            </div>

            <div>
                <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">SHA-256 Output (64 hex chars)</label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 rounded-lg bg-bg-primary border border-border-card font-mono text-xs text-accent-teal break-all min-h-[44px]">
                        {result || <span className="text-text-muted italic">Output appears here...</span>}
                    </div>
                    <button onClick={copyHash} disabled={!result} className="p-2 rounded-lg border border-border-card hover:border-accent-teal/40 transition-colors flex-shrink-0 disabled:opacity-40">
                        {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} className="text-text-muted" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

const SCENARIOS = [
    {
        id: 'amount',
        label: 'Insider Amount Manipulation',
        icon: Zap,
        description: 'An insider modifies a disbursement amount (e.g., ₹2,000 → ₹20,000). The recomputed SHA-256 hash no longer matches, breaking chain integrity.',
        color: 'accent-amber'
    },
    {
        id: 'hash',
        label: 'Hash Collision Attack',
        icon: Hash,
        description: 'A forged hash replaces the authentic block hash. The chain link between consecutive blocks breaks, proving external modification.',
        color: 'accent-red'
    },
    {
        id: 'delete',
        label: 'Block Deletion Attack',
        icon: Trash2,
        description: 'A block is removed from the chain. The next block\'s previousHash points to a non-existent block, creating a detectable gap.',
        color: 'accent-purple'
    }
];

export default function AuditReports() {
    const { ledger, dispatch, exportLedger, systemStatus, truncateHash } = useApp();
    const [selectedScenario, setSelectedScenario] = useState('amount');
    const [scanning, setScanning] = useState(false);
    const [scanResults, setScanResults] = useState([]);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanComplete, setScanComplete] = useState(false);
    const scanRef = useRef(null);

    const handleIntegrityScan = async () => {
        setScanning(true);
        setScanResults([]);
        setScanProgress(0);
        setScanComplete(false);

        const results = stepByStepVerify(ledger);

        // Animate through each block
        for (let i = 0; i < results.length; i++) {
            await new Promise(r => setTimeout(r, 400));
            setScanResults(prev => [...prev, results[i]]);
            setScanProgress(((i + 1) / results.length) * 100);
        }

        setScanComplete(true);
        setScanning(false);

        // Check if any block failed
        const hasBreach = results.some(r => r.status !== 'VALID');
        if (hasBreach) {
            dispatch({ type: 'VERIFY_CHAIN' });
        }
    };

    const handleTamper = () => {
        if (ledger.length < 2) {
            alert('Process at least one transaction first (use the Client Portal to submit a claim).');
            return;
        }
        dispatch({ type: 'TAMPER_LEDGER', payload: { scenario: selectedScenario } });
    };

    const handleExport = () => {
        const csv = exportLedger();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jan_dhan_audit_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const nonGenesisLedger = ledger.filter(b => b.status !== 'GENESIS');
    const currentScenario = SCENARIOS.find(s => s.id === selectedScenario);

    return (
        <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-text-heading">Audit Reports & Forensic Console</h2>
                    <p className="text-sm text-text-muted mt-1">Integrity verification, tamper simulation, and tamper-proof ledger export</p>
                </div>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                    <Download size={16} /> Export Audit CSV
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Chain Status */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        {systemStatus === 'FROZEN' ? <ShieldAlert size={20} className="text-accent-red" /> : <ShieldCheck size={20} className="text-accent-green" />}
                        <h3 className="text-sm font-bold text-text-heading">Chain Integrity</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${systemStatus === 'FROZEN' ? 'bg-accent-red' : 'bg-accent-green'}`} />
                        <span className={`text-lg font-bold ${systemStatus === 'FROZEN' ? 'text-accent-red' : 'text-accent-green'}`}>
                            {systemStatus === 'FROZEN' ? 'COMPROMISED' : 'VERIFIED'}
                        </span>
                    </div>
                    <p className="text-xs text-text-muted">{ledger.length} blocks in chain</p>
                    <p className="text-xs text-text-muted">{nonGenesisLedger.length} transactions recorded</p>
                </div>

                {/* Live Integrity Scan */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <RefreshCw size={18} className="text-accent-teal" />
                        <h3 className="text-sm font-bold text-text-heading">Live Integrity Scan</h3>
                    </div>
                    <button onClick={handleIntegrityScan} disabled={scanning || ledger.length < 2} className="btn-primary flex items-center gap-2 w-full justify-center mb-3">
                        {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                        {scanning ? 'Scanning...' : 'Run Block-by-Block Scan'}
                    </button>

                    {/* Progress bar */}
                    {(scanning || scanComplete) && (
                        <div className="mt-2">
                            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${scanComplete && scanResults.every(r => r.status === 'VALID')
                                        ? 'bg-accent-green'
                                        : scanComplete
                                            ? 'bg-accent-red'
                                            : 'bg-accent-teal'
                                        }`}
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-text-muted mt-1 text-center">
                                {scanComplete
                                    ? scanResults.every(r => r.status === 'VALID')
                                        ? '✅ All blocks verified'
                                        : `❌ Integrity breach detected`
                                    : `Scanning block ${scanResults.length}/${ledger.length}...`
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Scan Legend */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-text-heading mb-3">Scan Legend</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-accent-green" />
                            <span className="text-xs text-text-secondary">VALID — Hash matches, chain linked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-accent-red" />
                            <span className="text-xs text-text-secondary">TAMPERED — Hash mismatch detected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-accent-amber" />
                            <span className="text-xs text-text-secondary">BROKEN — Chain link severed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scan Results Timeline */}
            {scanResults.length > 0 && (
                <div className="glass-card p-5 mb-6">
                    <h3 className="text-sm font-bold text-text-heading mb-4">Block-by-Block Verification Results</h3>
                    <div className="space-y-2">
                        {scanResults.map((r) => (
                            <div key={r.index} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${r.status === 'VALID'
                                ? 'border-accent-green/20 bg-accent-green/5'
                                : r.status === 'TAMPERED'
                                    ? 'border-accent-red/20 bg-accent-red/5'
                                    : 'border-accent-amber/20 bg-accent-amber/5'
                                }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.status === 'VALID' ? 'bg-accent-green/20' : r.status === 'TAMPERED' ? 'bg-accent-red/20' : 'bg-accent-amber/20'
                                    }`}>
                                    {r.status === 'VALID' ? (
                                        <CheckCircle2 size={16} className="text-accent-green" />
                                    ) : (
                                        <XCircle size={16} className={r.status === 'TAMPERED' ? 'text-accent-red' : 'text-accent-amber'} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-heading">Block #{r.index}</span>
                                        <span className={`badge text-[9px] ${r.status === 'VALID' ? 'badge-green' : r.status === 'TAMPERED' ? 'badge-red' : 'badge-amber'
                                            }`}>{r.status}</span>
                                        <span className="text-[9px] text-text-muted">{r.blockType}</span>
                                    </div>
                                    <p className="text-[10px] text-text-secondary mt-0.5">{r.detail}</p>
                                </div>
                                <span className="text-[9px] font-mono text-text-muted flex-shrink-0">
                                    {truncateHash(r.hash, 6)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Forensic Tamper Simulation */}
            <div className="glass-card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileWarning size={20} className="text-accent-amber" />
                    <div>
                        <h3 className="text-sm font-bold text-text-heading">Forensic Tamper Simulation</h3>
                        <p className="text-[10px] text-text-muted">Demonstrate how the hash chain detects different types of ledger attacks</p>
                    </div>
                </div>

                {/* Scenario Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedScenario(s.id)}
                            className={`p-4 rounded-lg border text-left transition-all ${selectedScenario === s.id
                                ? `border-${s.color}/40 bg-${s.color}/5 ring-1 ring-${s.color}/20`
                                : 'border-border-card hover:border-border-card/80 bg-bg-primary/50'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <s.icon size={16} className={selectedScenario === s.id ? `text-${s.color}` : 'text-text-muted'} />
                                <span className={`text-xs font-bold ${selectedScenario === s.id ? 'text-text-heading' : 'text-text-secondary'}`}>
                                    {s.label}
                                </span>
                            </div>
                            <p className="text-[10px] text-text-muted leading-relaxed">{s.description}</p>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleTamper}
                    disabled={systemStatus === 'FROZEN' || ledger.length < 2}
                    className="btn-danger flex items-center gap-2 px-6"
                >
                    <AlertTriangle size={14} />
                    Execute: {currentScenario?.label}
                </button>
                {ledger.length < 2 && (
                    <p className="text-[10px] text-text-muted mt-2">⚠ Process at least one transaction before running a simulation</p>
                )}
            </div>

            {/* Ledger Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border-card">
                    <h3 className="text-sm font-bold text-text-heading">Complete Ledger Chain ({nonGenesisLedger.length} transactions)</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-bg-card">
                            <tr className="border-b border-border-card">
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">#</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Timestamp</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Citizen Hash</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Scheme</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Prev Hash</th>
                                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Block Hash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nonGenesisLedger.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-text-muted text-sm">No ledger entries — process claims through the Client Portal to build the chain</td></tr>
                            ) : nonGenesisLedger.map(block => (
                                <tr key={block.index} className="border-b border-border-card/50 hover:bg-bg-card-hover transition-colors">
                                    <td className="px-4 py-3 text-xs text-text-muted">{block.index}</td>
                                    <td className="px-4 py-3 text-[10px] text-text-muted">{new Date(block.timestamp).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-xs font-mono text-accent-cyan">{truncateHash(block.citizenHash)}</td>
                                    <td className="px-4 py-3"><span className="badge badge-blue">{block.scheme}</span></td>
                                    <td className="px-4 py-3 text-sm font-semibold text-accent-green">₹{block.amount?.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-[10px] font-mono text-text-muted">{truncateHash(block.previousHash, 6)}</td>
                                    <td className="px-4 py-3 text-[10px] font-mono text-accent-teal">{truncateHash(block.currentHash, 6)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SHA-256 Live Verifier — below ledger */}
            <HashVerifierPanel />
        </div>
    );
}
