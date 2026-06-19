import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, Package2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // Supabase session should update automatically via its own listener in store.tsx
        console.log('OAuth success message received');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback.html`,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.url,
          'google_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=no,location=no`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // The welcome screen logic will be handled by App.tsx detecting user change
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verifique seu e-mail para confirmar o cadastro!');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/20">
            <Package2 className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AMBEV - PPM CENTRO DE INTELIGÊNCIA</h1>
          <p className="text-slate-400 mt-2">Sistema de Gerenciamento e Controle de Peças</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                  placeholder="exemplo@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-xl flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Acessar APP' : 'Criar Conta'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1e293b] px-2 text-slate-500 font-medium">Ou continue com</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 group"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    />
                  </svg>
                  {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-slate-500 text-sm mt-6">
              Esqueceu sua senha? <button className="text-blue-400 hover:underline">Recuperar</button>
            </p>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          © 2026 AMBEV - PPM CENTRO DE INTELIGÊNCIA
        </p>
      </motion.div>
    </div>
  );
};
