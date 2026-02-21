import React from 'react';
import { UserCheck, Building2, Calendar, CheckCircle2 } from 'lucide-react';

const gates = [
    { id: 1, label: 'GATE 01', sublabel: 'Eligibility Verified', icon: UserCheck },
    { id: 2, label: 'GATE 02', sublabel: 'Budget Allocated', icon: Building2 },
    { id: 3, label: 'GATE 03', sublabel: 'Frequency Cleared', icon: Calendar },
    { id: 'final', label: 'FINAL', sublabel: 'Secure Payout', icon: CheckCircle2 },
];

export default function ValidationPipeline({ gateResults, processing }) {
    const getGateStatus = (gateId) => {
        if (!gateResults || gateResults.length === 0) return 'idle';
        if (gateId === 'final') {
            return gateResults.every(g => g.passed) ? 'pass' : 'fail';
        }
        const gate = gateResults.find(g => g.gate === gateId);
        if (!gate) return 'idle';
        return gate.passed ? 'pass' : 'fail';
    };

    return (
        <div className="glass-card p-5">
            <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-5">
                Real-Time Validation Engine
            </h3>
            <div className="flex items-center justify-between gap-1">
                {gates.map((gate, idx) => {
                    const status = getGateStatus(gate.id);
                    const Icon = gate.icon;

                    return (
                        <React.Fragment key={gate.id}>
                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 flex-shrink-0 ${status === 'pass' ? 'border-accent-green bg-accent-green/10' :
                                        status === 'fail' ? 'border-accent-red bg-accent-red/10' :
                                            processing ? 'border-accent-amber/40 bg-accent-amber/5 animate-pulse' :
                                                'border-border-card bg-bg-primary'
                                    }`}>
                                    <Icon size={18} className={`${status === 'pass' ? 'text-accent-green' :
                                            status === 'fail' ? 'text-accent-red' :
                                                'text-text-muted'
                                        }`} />
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-bold ${status === 'pass' ? 'text-accent-green' :
                                            status === 'fail' ? 'text-accent-red' :
                                                'text-text-secondary'
                                        }`}>{gate.label}</p>
                                    <p className={`text-[10px] ${status === 'pass' ? 'text-accent-green/70' :
                                            status === 'fail' ? 'text-accent-red/70' :
                                                'text-text-muted'
                                        }`}>{gate.sublabel}</p>
                                </div>
                            </div>
                            {idx < gates.length - 1 && (
                                <div className={`h-0.5 w-4 rounded-full flex-shrink-0 transition-all duration-500 ${status === 'pass' ? 'bg-accent-green' :
                                        status === 'fail' ? 'bg-accent-red' :
                                            'bg-border-card'
                                    }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
