import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Bell, PlusCircle, LayoutDashboard, Shield, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      api.getNotifications()
        .then((res) => {
          if (res.success) {
            setUnreadCount(res.data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-navy-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-400 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              Startup<span className="text-brand-500">Baazi</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                IN
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <Link to="/leaderboard" className="hover:text-brand-400 transition-colors">
            Leaderboard
          </Link>
          <Link to="/bidding-rules" className="hover:text-brand-400 transition-colors">
            How Ranking Works
          </Link>
          <Link to="/#how-it-works" className="hover:text-brand-400 transition-colors">
            Why List
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-400/30 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Notification icon */}
              <Link
                to="/dashboard"
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-900 border border-transparent hover:border-slate-800 transition-all"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-500 rounded-full animate-ping" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-500 rounded-full" />
                )}
              </Link>

              {/* Dashboard Link */}
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-850 hover:bg-navy-800 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-400" />
                <span>Dashboard</span>
              </Link>

              {/* Submit CTA */}
              <Link
                to="/submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List Startup</span>
              </Link>

              {/* Logout */}
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List Startup</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && (
            <Link to="/dashboard" className="p-2 text-slate-300">
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-navy-900/95 px-4 pt-3 pb-6 flex flex-col gap-3">
          <Link
            to="/leaderboard"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 py-2 hover:text-brand-400"
          >
            Leaderboard
          </Link>
          <Link
            to="/bidding-rules"
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-300 py-2 hover:text-brand-400"
          >
            How Ranking Works
          </Link>
          <Link
            to="/submit"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Your Startup</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-300 py-2 hover:text-brand-400"
              >
                Founder Dashboard
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-amber-400 py-2 font-semibold"
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-left text-rose-400 py-2"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-slate-300 hover:text-white"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
