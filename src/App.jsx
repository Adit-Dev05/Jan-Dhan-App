import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Layouts
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';

// Client pages
import SubmitClaim from './pages/SubmitClaim';
import TrackStatus from './pages/TrackStatus';

// Admin pages
import Dashboard from './pages/Dashboard';
import TransactionMonitor from './pages/TransactionMonitor';
import FraudAnalytics from './pages/FraudAnalytics';
import AuditReports from './pages/AuditReports';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Client Portal */}
          <Route path="/" element={
            <ClientLayout>
              <SubmitClaim />
            </ClientLayout>
          } />
          <Route path="/track" element={
            <ClientLayout>
              <TrackStatus />
            </ClientLayout>
          } />

          {/* Admin Portal */}
          <Route path="/admin" element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          } />
          <Route path="/admin/transactions" element={
            <AdminLayout>
              <TransactionMonitor />
            </AdminLayout>
          } />
          <Route path="/admin/fraud" element={
            <AdminLayout>
              <FraudAnalytics />
            </AdminLayout>
          } />
          <Route path="/admin/audit" element={
            <AdminLayout>
              <AuditReports />
            </AdminLayout>
          } />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
