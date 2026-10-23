import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ChatDrawer from './components/ChatDrawer';
import Dashboard from './pages/Dashboard';
import ExpensesPage from './pages/ExpensesPage';
import BudgetsPage from './pages/BudgetsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function ProtectedLayout({ children, onOpenChat, isChatOpen, refreshTrigger }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--netflix-black)',
        color: 'var(--text-secondary)'
      }}>
        Loading Flixpense...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenChat={onOpenChat} isChatOpen={isChatOpen} />
      <main style={{ flex: 1 }}>
        {React.cloneElement(children, { refreshTrigger })}
      </main>
    </div>
  );
}

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/"
            element={
              <ProtectedLayout
                onOpenChat={() => setIsChatOpen(prev => !prev)}
                isChatOpen={isChatOpen}
                refreshTrigger={refreshTrigger}
              >
                <Dashboard onOpenChat={() => setIsChatOpen(true)} key={refreshTrigger} />
              </ProtectedLayout>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedLayout
                onOpenChat={() => setIsChatOpen(prev => !prev)}
                isChatOpen={isChatOpen}
                refreshTrigger={refreshTrigger}
              >
                <ExpensesPage key={refreshTrigger} />
              </ProtectedLayout>
            }
          />

          <Route
            path="/budgets"
            element={
              <ProtectedLayout
                onOpenChat={() => setIsChatOpen(prev => !prev)}
                isChatOpen={isChatOpen}
                refreshTrigger={refreshTrigger}
              >
                <BudgetsPage key={refreshTrigger} />
              </ProtectedLayout>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedLayout
                onOpenChat={() => setIsChatOpen(prev => !prev)}
                isChatOpen={isChatOpen}
                refreshTrigger={refreshTrigger}
              >
                <AnalyticsPage key={refreshTrigger} />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Persistent AI Assistant Drawer */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onDataRefresh={handleDataRefresh}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
