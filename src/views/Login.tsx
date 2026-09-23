import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, Package2, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Mode = 'login' | 'signup' | 'forgot';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.4z" fill="#4285F4"/>
    <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.1-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z" fill="#34A853"/>
    <path d="M10.9 28.8c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3v-6.2H2.7C1 17.3 0 20.5 0 24s1 6.7 2.7 9.8l8.2-5z" fill="#FBBC05"/>
    <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.8 0 6.7 5.2 2.7 13l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
  </svg>
);

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSuccess('Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.');

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}?reset=true`,
        });
        if (error) throw error;
        setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
      } else if (msg.includes('User already registered')) {
        setError('Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.');
      } else {
        setError(msg || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError('Erro ao iniciar login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  };

  const titles: Record<Mode, { title: string; sub: string; btn: string }> = {
    login:  { title: 'Entrar',            sub: 'Acesse o sistema com sua conta',       btn: 'Acessar sistema' },
    signup: { title: 'Criar conta',       sub: 'Preencha os dados para se cadastrar',  btn: 'Criar conta' },
    forgot: { title: 'Recuperar senha',   sub: 'Enviaremos um link para seu e-mail',   btn: 'Enviar link' },
  };

  const t = titles[mode];

  return (
    <div className="min-h-screen bg-[#050b18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')", backgroundSize: '200px', opacity: 0.15 }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-[60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/20">
            <Package2 className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">AMBEV — PPM Facilities</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de Gerenciamento e Controle de Peças</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 gap-1">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>

              {/* Sucesso */}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-200 text-sm p-4 rounded-xl flex items-start gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-400" />
                  <span>{success}</span>
                </div>
              )}

              {!success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="exemplo@ambev.com.br"
                        required
                      />
                    </div>
                  </div>

                  {/* Senha (não aparece no forgot) */}
                  {mode !== 'forgot' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {mode === 'signup' && <p className="text-xs text-slate-500 ml-1">Mínimo de 6 caracteres</p>}
                    </div>
                  )}

                  {/* Erro */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Botão principal */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{t.btn}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                  </button>

                  {/* Google — só em login e signup */}
                  {mode !== 'forgot' && (
                    <>
                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-slate-500 font-semibold tracking-widest">OU</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogle}
                        disabled={googleLoading}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><GoogleIcon /><span>Continuar com Google</span></>}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Link recuperar senha */}
              {mode === 'login' && !success && (
                <p className="text-center text-slate-500 text-sm mt-5">
                  Esqueceu sua senha?{' '}
                  <button onClick={() => switchMode('forgot')} className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors">
                    Recuperar
                  </button>
                </p>
              )}

              {/* Voltar ao login no forgot */}
              {mode === 'forgot' && (
                <p className="text-center text-slate-500 text-sm mt-5">
                  <button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors">
                    ← Voltar ao login
                  </button>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">© 2026 AMBEV — PPM Centro de Inteligência Facilities</p>
      </motion.div>
    </div>
  );
};
