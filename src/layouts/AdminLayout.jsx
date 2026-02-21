import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import FrozenOverlay from '../components/FrozenOverlay';

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen bg-bg-primary">
            <Sidebar />
            <TopBar />
            <FrozenOverlay />
            <main className="ml-[220px] mt-16 p-6">
                {children}
            </main>
        </div>
    );
}
