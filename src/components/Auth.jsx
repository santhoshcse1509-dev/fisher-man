import React, { useState } from 'react';
import { Ship, Waves, Lock, User, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-ocean-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="z-10 w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl text-white">
        <div className="flex flex-col items-center mb-8">
           <div className="p-4 bg-blue-600 rounded-2xl shadow-lg mb-4">
             <Ship size={48} className="text-white" />
           </div>
           <h1 className="text-3xl font-black tracking-tight text-center">Fisherman Alert</h1>
           <p className="text-blue-200 text-sm font-medium mt-1">Maritime Safety System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-blue-200 ml-1">Fisherman ID / Phone</label>
            <div className="relative mt-1">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" />
              <input 
                type="text" 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Enter ID Number"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-blue-200 ml-1">Password</label>
            <div className="relative mt-1">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" />
              <input 
                type="password" 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition flex items-center justify-center gap-2 group"
          >
            {isLogin ? 'START ENGINE' : 'REGISTER BOAT'}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-white/20 flex-1" />
            <span className="text-xs text-blue-200 uppercase font-bold tracking-wider">Or</span>
            <div className="h-px bg-white/20 flex-1" />
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl shadow-lg transform active:scale-95 transition flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-200 hover:text-white font-medium underline decoration-blue-500/30 underline-offset-4"
          >
            {isLogin ? "New fisherman? Register here" : "Already registered? Login"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-center opacity-60">
         <p className="text-xs text-white max-w-xs mx-auto leading-relaxed">
           By continuing, you agree to enable GPS tracking for safety monitoring near international maritime borders.
         </p>
      </div>
    </div>
  );
}
