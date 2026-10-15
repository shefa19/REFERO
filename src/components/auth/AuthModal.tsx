import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ReferoLogo } from '../common/ReferoLogo';
import { X, Lock, Mail, User, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalTab, navigateTo, showToast } = useStore();
  const { login, register, isLoading, switchDemoRole } = useAuth();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(authModalTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      closeAuthModal();
      showToast('Welcome back to REFERO!');
      if (email.includes('admin')) navigateTo('admin_dashboard');
      else if (email.includes('shop') || email.includes('kabir')) navigateTo('shopkeeper_dashboard');
      else navigateTo('customer_dashboard');
    } else {
      setErrorMsg(res.error || 'Login failed.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName || !email || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    const res = await register(fullName, email, password, referralCode);
    if (res.success) {
      closeAuthModal();
      showToast('Account created! 50 Welcome REFERO Points credited.');
      navigateTo('customer_dashboard');
    } else {
      setErrorMsg(res.error || 'Registration failed.');
    }
  };

  const fillQuickDemo = (role: 'admin' | 'shopkeeper' | 'customer') => {
    if (role === 'admin') {
      setEmail('admin@refero.com.bd');
      setPassword('admin123');
    } else if (role === 'shopkeeper') {
      setEmail('kabir@greenvalley.bd');
      setPassword('shop123');
    } else {
      setEmail('rahim.ahmed@gmail.com');
      setPassword('customer123');
    }
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={closeAuthModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 z-10 border border-slate-200">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <ReferoLogo variant="full" size="md" className="justify-center" />
          <p className="text-xs text-slate-500 mt-2">
            {tab === 'login' && 'Sign in to access your orders, points, and account'}
            {tab === 'register' && 'Join REFERO to earn points on every purchase & referral'}
            {tab === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors cursor-pointer ${
              tab === 'login'
                ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center transition-colors cursor-pointer ${
              tab === 'register'
                ? 'text-[#142B4A] border-b-2 border-[#142B4A]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-[11px] text-[#F47B44] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahim@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A]"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RAHIM2026"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#142B4A] uppercase font-mono"
                />
                <Sparkles className="w-4 h-4 text-[#F47B44] absolute left-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter a friend's referral code to link your account for mutual rewards!
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating account...' : 'Create Customer Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enter your account email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg('A password reset link has been dispatched to your email.');
              }}
              className="w-full py-2 bg-[#142B4A] text-white text-xs font-bold rounded-lg"
            >
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => setTab('login')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Demo Fast-Fill Strip for Class Evaluation */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Class Evaluation Quick Credentials:
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fillQuickDemo('customer')}
              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Customer (Moumita)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('shopkeeper')}
              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Shopkeeper (Mahin)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('admin')}
              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Admin (Shefa)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
