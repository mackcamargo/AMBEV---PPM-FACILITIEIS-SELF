import React, { useState } from 'react';
import { Lock, Loader2, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/store';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Autorização Necessária",
  description = "Digite sua senha para confirmar a exclusão deste registro."
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useApp();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError(null);

    // If no user email is found for some reason, we could fallback to an admin pin or just fail
    if (!user?.email) {
      setError('Sessão inválida. Por favor, faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      // Re-authenticate to verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (signInError) {
        throw new Error('Senha incorreta. Tente novamente.');
      }

      // Password is correct
      setPassword('');
      onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          <p className="text-sm text-slate-600 font-medium">
            {description}
          </p>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Senha de Acesso
            </label>
            <input 
              type="password"
              placeholder="Digite sua senha..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
