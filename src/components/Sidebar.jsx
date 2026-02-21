import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Activity, AlertTriangle, FileText, Settings, Shield } from 'lucide-react';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/transactions', icon: Activity, label: 'Transaction Monitor' },
    { to: '/admin/fraud', icon: AlertTriangle, label: 'Fraud Analytics' },
    { to: '/admin/audit', icon: FileText, label: 'Audit Reports' },
];

export default function Sidebar() {
    const { systemStatus } = useApp();

    const secLevel = systemStatus === 'FROZEN' ? 'CRITICAL' : systemStatus === 'PAUSED' ? 'ELEVATED' : 'HIGH';
    const secColor = systemStatus === 'FROZEN' ? 'text-accent-red' : systemStatus === 'PAUSED' ? 'text-accent-amber' : 'text-accent-green';
    const secBarColor = systemStatus === 'FROZEN' ? 'bg-accent-red' : systemStatus === 'PAUSED' ? 'bg-accent-amber' : 'bg-accent-green';

    return (
        <aside className="fixed top-0 left-0 w-[220px] h-screen bg-bg-sidebar border-r border-border-card z-50 flex flex-col">
            {/* Logo */}
            <div className="p-5 border-b border-border-card">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-accent-cyan flex items-center justify-center">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-text-heading tracking-wide">Jan-Dhan Gateway</h1>
                        <p className="text-[9px] text-accent-teal uppercase tracking-widest">Admin Console</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                <p className="text-[9px] text-text-muted uppercase tracking-widest font-semibold px-3 mb-2">Administration</p>
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${isActive
                                ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                                : 'text-text-secondary hover:text-text-heading hover:bg-bg-card-hover'
                            }`
                        }
                    >
                        <item.icon size={16} />
                        {item.label}
                    </NavLink>
                ))}

                <div className="my-3 border-t border-border-card" />

                <p className="text-[9px] text-text-muted uppercase tracking-widest font-semibold px-3 mb-2">Client Portal</p>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-heading hover:bg-bg-card-hover transition-all"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open Client Portal
                </a>
            </nav>

            {/* Security Level */}
            <div className="p-4 border-t border-border-card">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-text-muted uppercase tracking-widest font-semibold">Security Level</span>
                    <span className={`text-[10px] font-bold ${secColor}`}>{secLevel}</span>
                </div>
                <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${secBarColor}`}
                        style={{ width: systemStatus === 'FROZEN' ? '100%' : systemStatus === 'PAUSED' ? '60%' : '85%' }} />
                </div>
            </div>

            {/* Settings */}
            <div className="p-3 border-t border-border-card">
                <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-heading hover:bg-bg-card-hover transition-all w-full">
                    <Settings size={14} />
                    Settings
                </button>
            </div>
        </aside>
    );
}
