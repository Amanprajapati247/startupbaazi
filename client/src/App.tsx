import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { StartupDetailsPage } from './pages/StartupDetailsPage';
import { SubmitStartupPage } from './pages/SubmitStartupPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BiddingRulesPage } from './pages/BiddingRulesPage';
import { TermsPage } from './pages/TermsPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { PrivacyPage } from './pages/PrivacyPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="flex flex-col min-h-screen bg-navy-950 text-slate-100">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/startup/:slug" element={<StartupDetailsPage />} />
                <Route path="/submit" element={<SubmitStartupPage />} />
                <Route path="/dashboard" element={<UserDashboardPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/bidding-rules" element={<BiddingRulesPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
