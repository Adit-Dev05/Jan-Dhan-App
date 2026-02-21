import React from 'react';
import { UserCheck, Building2, Calendar, CheckCircle2 } from 'lucide-react';

const gates = [
    { id: 1, label: 'GATE 01', sublabel: 'Eligibility Verified', icon: UserCheck },
    { id: 2, label: 'GATE 02', sublabel: 'Budget Allocated', icon: Building2 },
    { id: 3, label: 'GATE 03', sublabel: 'Frequency Cleared', icon: Calendar },
    { id: 'final', label: 'FINAL', sublabel: 'Secure Payout', icon: CheckCircle2 },
];

// finalStatus: 'idle' | 'pending' | 'pass' | 'fail'
export default function ValidationPipeline({ gateResults, processing, finalStatus }) {
    const allGatesPassed = gateResults && gateResults.length > 0 && gateResults.every(g => g.passed);

    const getGateStatus = (gateId) => {
        if (!gateResults || gateResults.length === 0) return 'idle';
        if (gateId === 'final') {
            // Use explicit finalStatus prop if provided
            if (finalStatus) return finalStatus;
            // Otherwise infer: if all 3 gates passed but no explicit approval → pending
            return allGatesPassed ? 'pending' : 'fail';
        }
        const gate = gateResults.find(g => g.gate === gateId);
        if (!gate) return 'idle';
        return gate.passed ? 'pass' : 'fail';
    };

    const getNodeStyle = (status) => {
        switch (status) {
            case 'pass': return 'border-accent-green bg-accent-green/10';
            case 'pending': return 'border-accent-amber bg-accent-amber/10 animate-pulse';
            case 'fail': return 'border-accent-red bg-accent-red/10';
            default: return processing ? 'border-accent-amber/40 bg-accent-amber/5 animate-pulse' : 'border-border-card bg-bg-primary';
        }
    };

    const getIconStyle = (status) => {
        switch (status) {
            case 'pass': return 'text-accent-green';
            case 'pending': return 'text-accent-amber';
            case 'fail': return 'text-accent-red';
            default: return 'text-text-muted';
        }
    };

    const getTextStyle = (status) => {
        switch (status) {
            case 'pass': return 'text-accent-green';
            case 'pending': return 'text-accent-amber';
            case 'fail': return 'text-accent-red';
            default: return 'text-text-secondary';
        }
    };

    const getSubStyle = (status) => {
        switch (status) {
            case 'pass': return 'text-accent-green/70';
            case 'pending': return 'text-accent-amber/70';
            case 'fail': return 'text-accent-red/70';
            default: return 'text-text-muted';
        }
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
                    const sublabel = gate.id === 'final' && status === 'pending'
                        ? 'Pending Approval'
                        : gate.id === 'final' && status === 'pass'
                            ? 'Disbursed'
                            : gate.sublabel;

                    return (
                        <React.Fragment key={gate.id}>
                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 flex-shrink-0 ${getNodeStyle(status)}`}>
                                    <Icon size={18} className={getIconStyle(status)} />
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-bold ${getTextStyle(status)}`}>{gate.label}</p>
                                    <p className={`text-[10px] ${getSubStyle(status)}`}>{sublabel}</p>
                                </div>
                            </div>
                            {idx < gates.length - 1 && (
                                <div className={`h-0.5 w-4 rounded-full flex-shrink-0 transition-all duration-500 ${status === 'pass' ? 'bg-accent-green' :
                                    status === 'pending' ? 'bg-accent-amber' :
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
