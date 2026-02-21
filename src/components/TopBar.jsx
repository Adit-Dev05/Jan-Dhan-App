import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, AlertTriangle, User } from 'lucide-react';

export default function TopBar() {
    const { systemStatus, dispatch, stats } = useApp();

    const statusConfig = {
        ACTIVE: { label: 'System Active', color: 'bg-accent-green', dot: 'bg-accent-green' },
        PAUSED: { label: 'System Paused', color: 'bg-accent-amber', dot: 'bg-accent-amber' },
        FROZEN: { label: 'System Frozen', color: 'bg-accent-red', dot: 'bg-accent-red' },
        BUDGET_EXHAUSTED: { label: 'Budget Exhausted', color: 'bg-accent-red', dot: 'bg-accent-red' }
    };

    const status = statusConfig[systemStatus] || statusConfig.ACTIVE;

    return (
        <header className="fixed top-0 left-[220px] right-0 h-16 bg-bg-secondary border-b border-border-card flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-4">
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${systemStatus === 'ACTIVE' ? 'border-accent-green/30 bg-accent-green/10' :
                        systemStatus === 'PAUSED' ? 'border-accent-amber/30 bg-accent-amber/10' :
                            'border-accent-red/30 bg-accent-red/10'
                    }`}>
                    <div className={`pulse-dot ${status.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${systemStatus === 'ACTIVE' ? 'text-accent-green' :
                            systemStatus === 'PAUSED' ? 'text-accent-amber' :
                                'text-accent-red'
                        }`}>
                        {status.label}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Emergency Pause Button */}
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
                    disabled={systemStatus === 'FROZEN' || systemStatus === 'BUDGET_EXHAUSTED'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 ${systemStatus === 'PAUSED'
                            ? 'bg-accent-green/20 text-accent-green border border-accent-green/30 hover:bg-accent-green/30'
                            : 'btn-danger'
                        }`}
                >
                    <AlertTriangle size={14} />
                    {systemStatus === 'PAUSED' ? 'Resume System' : 'Emergency Pause'}
                </button>

                {/* Notification Bell */}
                <div className="relative">
                    <Bell size={20} className="text-text-secondary hover:text-text-primary cursor-pointer transition-colors" />
                    {stats.criticalAlerts > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red rounded-full text-[9px] flex items-center justify-center font-bold text-white">
                            {stats.criticalAlerts}
                        </span>
                    )}
                </div>

                {/* User Avatar */}
                <div className="flex items-center gap-3 pl-4 border-l border-border-card">
                    <div>
                        <p className="text-sm font-semibold text-text-heading">Aditi Sharma</p>
                        <p className="text-[10px] text-text-muted">Chief Auditor</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center">
                        <User size={16} className="text-white" />
                    </div>
                </div>
            </div>
        </header>
    );
}
