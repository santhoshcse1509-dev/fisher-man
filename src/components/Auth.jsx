import React, { useState } from 'react';
import { Shield, Waves, Lock, User, ArrowRight, Anchor } from 'lucide-react';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ id: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.id.length > 0) {
      onLogin(formData.id);
    }
  };

  const handleGoogleLogin = () => {
    onLogin('Google User');
  };

  return (
    <div className="min-h-screen w-full bg-ocean-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">

      {/* Background decoration — responsive blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />
        {/* Extra subtle wave effect for large screens */}
        <div className="hidden lg:block absolute top-1/2 left-0 w-72 h-72 bg-cyan-500 rounded-full blur-3xl opacity-10 -translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Card — full width on mobile, capped on larger screens */}
      <div className="z-10 w-full max-w-xs sm:max-w-sm md:max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl text-white animate-fade-in">

        {/* Brand header */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="relative p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl sm:rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-3 sm:mb-4">
            {/* Desktop Icon */}
            <div className="hidden sm:block relative">
              <Shield size={48} className="text-white stroke-[1.5]" />
              <Waves size={24} className="text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 stroke-[2.5]" />
            </div>
            {/* Mobile Icon */}
            <div className="sm:hidden relative">
              <Shield size={36} className="text-white stroke-[1.5]" />
              <Waves size={18} className="text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 stroke-[2.5]" />
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-black text-white px-2">
            WaveGuard
          </h2>
          <p className="text-blue-200 text-xs sm:text-sm font-medium mt-1 text-center">
            Maritime Safety System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Fisherman ID field */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-blue-200 ml-1 block mb-1">
              Fisherman ID / Phone
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input
                type="text"
                id="auth-id"
                autoComplete="username"
                inputMode="text"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-base"
                placeholder="Enter ID Number"
                value={formData.id}
                onChange={e => setFormData({ ...formData, id: e.target.value })}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-blue-200 ml-1 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input
                type="password"
                id="auth-password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-base"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {/* CTA button */}
          <button
            type="submit"
            id="auth-submit-btn"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-3.5 sm:py-4 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 group touch-target"
          >
            {isLogin ? 'START ENGINE' : 'REGISTER BOAT'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="h-px bg-white/20 flex-1" />
            <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">Or</span>
            <div className="h-px bg-white/20 flex-1" />
          </div>

          {/* Google Sign-in */}
          <button
            type="button"
            id="auth-google-btn"
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 sm:py-3.5 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-3 touch-target"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-label="Google logo">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-5 sm:mt-6 text-center">
          <button
            id="auth-toggle-mode"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-200 hover:text-white font-medium underline decoration-blue-500/30 underline-offset-4 touch-target"
          >
            {isLogin ? "New fisherman? Register here" : "Already registered? Login"}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="z-10 mt-6 text-center px-4">
        <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
          By continuing, you agree to enable GPS tracking for safety monitoring near international maritime borders.
        </p>
      </div>

      {/* Footer brand mark */}
      <div className="z-10 mt-4 flex items-center gap-2 opacity-40">
        <Anchor size={14} className="text-blue-300" />
        <span className="text-xs text-blue-300 font-bold tracking-widest uppercase">WaveGuard v1.0</span>
      </div>
    </div>
  );
}
