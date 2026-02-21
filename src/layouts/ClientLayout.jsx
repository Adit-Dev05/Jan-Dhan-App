import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Shield, FileText, Search } from 'lucide-react';

export default function ClientLayout({ children }) {
    const { systemStatus } = useApp();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-bg-primary">
            {/* Client Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 z-40 bg-bg-card/80 backdrop-blur-xl border-b border-border-card flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-teal to-accent-cyan flex items-center justify-center">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-text-heading tracking-wide">Jan-Dhan Gateway</h1>
                        <p className="text-[10px] text-text-muted">Secure Benefit Distribution Portal</p>
                    </div>
                </div>

                <nav className="flex items-center gap-1">
                    <Link
                        to="/"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${location.pathname === '/'
                                ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                                : 'text-text-secondary hover:text-text-heading hover:bg-bg-card-hover'
                            }`}
                    >
                        <FileText size={14} />
                        Submit Claim
                    </Link>
                    <Link
                        to="/track"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${location.pathname === '/track'
                                ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                                : 'text-text-secondary hover:text-text-heading hover:bg-bg-card-hover'
                            }`}
                    >
                        <Search size={14} />
                        Track Status
                    </Link>
                </nav>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${systemStatus === 'ACTIVE'
                            ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                            : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${systemStatus === 'ACTIVE' ? 'bg-accent-green pulse-dot' : 'bg-accent-red'}`} />
                        {systemStatus === 'ACTIVE' ? 'Online' : systemStatus}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-16">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border-card py-4 px-6 mt-8">
                <div className="flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider">
                    <span>🔒 Secure 256-Bit Encrypted</span>
                    <span>Powered by National Informatics Centre (NIC)</span>
                </div>
            </footer>
        </div>
    );
}
