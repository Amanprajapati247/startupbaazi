import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, Lock, Mail, ArrowRight, Shield, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide both email and password', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.login({ email, password });
      if (res.success) {
        login(res.data.token, res.data.user);
        showToast(`Welcome back, ${res.data.user.name}!`, 'success');
        navigate(redirectUrl);
      }
    } catch (err: any) {
      showToast(err.message || 'Invalid email or password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 space-y-8">
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/25">
          <Flame className="w-6 h-6 text-white fill-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Sign In to StartupBaazi
        </h1>
        <p className="text-xs text-slate-400">
          Manage your startup listings, place visibility bids, and review real traffic.
        </p>
      </div>

      {/* Quick Demo Fillers */}
      <div className="bg-navy-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 block flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Developer / Demo Credentials:</span>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('founder@startupbaazi.demo', 'Founder@12345')}
            className="flex-1 py-1.5 px-2 rounded-xl bg-navy-950 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all text-center"
          >
            🧑‍💻 Demo Founder
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@startupbaazi.in', 'Admin@12345')}
            className="flex-1 py-1.5 px-2 rounded-xl bg-navy-950 hover:bg-slate-800 text-amber-300 text-xs font-medium border border-amber-500/30 transition-all text-center flex items-center justify-center gap-1"
          >
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="founder@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <span>Authenticating...</span> : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          <span>Don't have an account yet? </span>
          <Link to="/register" className="text-brand-400 font-bold hover:underline">
            Register your Startup
          </Link>
        </div>
      </div>
    </div>
  );
};
