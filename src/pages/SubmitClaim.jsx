import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ValidationPipeline from '../components/ValidationPipeline';
import { Search, Send, ShieldCheck, KeyRound, CheckCircle2, XCircle, User, ChevronDown } from 'lucide-react';

export default function SubmitClaim() {
    const { processTransaction, verify2FA, systemStatus, citizenRegistry, searchCitizens, otpPending } = useApp();

    const [citizenId, setCitizenId] = useState('');
    const [selectedScheme, setSelectedScheme] = useState('');
    const [result, setResult] = useState(null);
    const [gateResults, setGateResults] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestRef = useRef(null);

    // Get unique schemes from registry
    const schemes = useMemo(() => {
        const s = new Set(citizenRegistry.map(c => c.Scheme_Eligibility));
        return [...s];
    }, [citizenRegistry]);

    // Auto-suggest as user types
    const handleIdChange = (val) => {
        setCitizenId(val);
        setResult(null);
        setGateResults([]);
        if (val.length >= 3) {
            const matches = searchCitizens(val);
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectCitizen = (citizen) => {
        setCitizenId(String(citizen.Citizen_ID));
        setSelectedScheme(citizen.Scheme_Eligibility);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!citizenId || !selectedScheme) return;

        setProcessing(true);
        setResult(null);
        setGateResults([]);

        await new Promise(resolve => setTimeout(resolve, 800));

        const res = processTransaction(citizenId, selectedScheme);

        if (res.needs2FA) {
            setResult({ ...res, type: '2fa' });
            setProcessing(false);
            return;
        }

        setResult(res);
        if (res.gateResults) setGateResults(res.gateResults);
        setProcessing(false);
    };

    const handle2FA = () => {
        const verified = verify2FA(otpInput);
        if (verified) {
            setOtpInput('');
            setTimeout(() => {
                const res = processTransaction(citizenId, selectedScheme, { skip2FA: true });
                setResult(res);
                if (res.gateResults) setGateResults(res.gateResults);
            }, 500);
        } else {
            setResult({ success: false, error: 'Invalid OTP. Verification failed.' });
            setOtpInput('');
        }
    };

    const isBlocked = systemStatus !== 'ACTIVE';

    return (
        <div className="fade-in max-w-5xl mx-auto p-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-text-heading">Benefit Claim Portal</h2>
                <p className="text-sm text-text-muted mt-2">Submit your welfare benefit application securely through the government's validated payment gateway</p>
            </div>

            {isBlocked && (
                <div className="mb-6 p-4 rounded-lg bg-accent-red/10 border border-accent-red/30 text-center">
                    <p className="text-sm text-accent-red font-semibold">
                        ⚠ Portal is temporarily unavailable ({systemStatus}). Please try again later.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form — 3 cols */}
                <div className="lg:col-span-3">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <ShieldCheck size={20} className="text-accent-teal" />
                            <h3 className="text-sm font-bold text-text-heading">Claim Application Form</h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Citizen ID with auto-suggest */}
                            <div className="mb-5 relative" ref={suggestRef}>
                                <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                                    Aadhaar Number
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="input-field font-mono pl-10"
                                        placeholder="Enter your 12-digit Aadhaar number"
                                        value={citizenId}
                                        onChange={(e) => handleIdChange(e.target.value)}
                                        disabled={isBlocked}
                                    />
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                </div>

                                {/* Suggestions dropdown */}
                                {showSuggestions && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-bg-card border border-border-card rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {suggestions.map((c, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectCitizen(c)}
                                                className="w-full text-left px-4 py-2.5 hover:bg-bg-card-hover transition-colors flex items-center justify-between border-b border-border-card/50 last:border-0"
                                            >
                                                <div>
                                                    <span className="text-xs font-mono text-accent-cyan">{c.Citizen_ID}</span>
                                                    <span className="text-[10px] text-text-muted ml-2">• {c.Region_Code}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="badge badge-blue text-[9px]">{c.Scheme_Eligibility}</span>
                                                    <span className={`text-[9px] ${c.Account_Status === 'Active' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                        {c.Account_Status}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Scheme Selection */}
                            <div className="mb-5">
                                <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                                    Select Scheme
                                </label>
                                <div className="relative">
                                    <select
                                        className="input-field appearance-none pr-10"
                                        value={selectedScheme}
                                        onChange={(e) => setSelectedScheme(e.target.value)}
                                        disabled={isBlocked}
                                    >
                                        <option value="">Choose your benefit scheme...</option>
                                        {schemes.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isBlocked || processing || !citizenId || !selectedScheme}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
                            >
                                <Send size={16} />
                                {processing ? 'Validating...' : 'Submit Benefit Claim'}
                            </button>
                        </form>

                        {/* 2FA Section */}
                        {result?.needs2FA && (
                            <div className="mt-6 p-4 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <KeyRound size={18} className="text-accent-amber" />
                                    <h4 className="text-sm font-bold text-accent-amber">OTP Verification Required</h4>
                                </div>
                                <p className="text-xs text-text-secondary mb-3">
                                    High-value transaction detected. An OTP has been sent to your registered mobile.
                                </p>
                                <p className="text-xs text-text-muted mb-3">
                                    Demo OTP: <span className="font-mono text-accent-teal font-bold">{result.otp}</span>
                                </p>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        className="input-field w-40 font-mono text-center tracking-widest"
                                        placeholder="000000"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value)}
                                        maxLength={6}
                                    />
                                    <button onClick={handle2FA} className="btn-primary">Verify</button>
                                </div>
                            </div>
                        )}

                        {/* Result Message */}
                        {result && !result.needs2FA && (
                            <div className={`mt-6 p-5 rounded-lg border ${result.approved
                                ? 'bg-accent-green/10 border-accent-green/30'
                                : 'bg-accent-red/10 border-accent-red/30'
                                }`}>
                                {result.error ? (
                                    <div className="flex items-center gap-2">
                                        <XCircle size={18} className="text-accent-red" />
                                        <p className="text-sm text-accent-red font-semibold">{result.error}</p>
                                    </div>
                                ) : result.approved ? (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={18} className="text-accent-green" />
                                            <p className="text-sm text-accent-green font-bold">Claim Approved Successfully</p>
                                        </div>
                                        <p className="text-xs text-text-muted mt-2">
                                            Your benefit will be disbursed shortly. Reference: <span className="font-mono text-accent-teal">{result.transactionId}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <XCircle size={18} className="text-accent-red" />
                                            <p className="text-sm text-accent-red font-bold">Claim Not Approved</p>
                                        </div>
                                        <p className="text-xs text-text-muted mt-2">
                                            Reason: <span className="font-mono text-accent-red">{result.reason?.replace(/_/g, ' ')}</span>
                                        </p>
                                        <p className="text-xs text-text-muted">Reference: <span className="font-mono">{result.transactionId}</span></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side — Pipeline + Info */}
                <div className="lg:col-span-2 space-y-6">
                    <ValidationPipeline gateResults={gateResults} processing={processing} />

                    {gateResults.length > 0 && (
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-bold text-text-heading mb-3">Validation Details</h3>
                            <div className="space-y-3">
                                {gateResults.map(gate => (
                                    <div key={gate.gate} className={`p-3 rounded-lg border ${gate.passed ? 'border-accent-green/20 bg-accent-green/5' : 'border-accent-red/20 bg-accent-red/5'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-text-heading">{gate.name}</span>
                                            <span className={`badge ${gate.passed ? 'badge-green' : 'badge-red'}`}>
                                                {gate.passed ? 'PASS' : 'FAIL'}
                                            </span>
                                        </div>
                                        {gate.checks.map((check, ci) => (
                                            <div key={ci} className="flex items-center justify-between text-[10px] py-0.5">
                                                <span className="text-text-muted">{check.check}</span>
                                                <span className={check.passed ? 'text-accent-green' : 'text-accent-red'}>
                                                    {check.detail}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Help Card */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-text-heading mb-3">How It Works</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-accent-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-accent-teal">1</span>
                                </div>
                                <p className="text-xs text-text-secondary">Enter your Aadhaar number and select your eligible scheme</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-accent-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-accent-teal">2</span>
                                </div>
                                <p className="text-xs text-text-secondary">Your application passes through a 3-gate security check</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-accent-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-accent-teal">3</span>
                                </div>
                                <p className="text-xs text-text-secondary">If approved, your benefit is recorded on an immutable ledger</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
