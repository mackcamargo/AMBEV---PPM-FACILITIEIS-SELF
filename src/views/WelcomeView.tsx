import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../lib/store';
import { LogOut } from 'lucide-react';

interface WelcomeViewProps {
  onEnter: (targetView: 'dashboard' | 'retirada-materiais' | 'reuniao-self') => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onEnter }) => {
  const { user, signOut } = useApp();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050b18] overflow-hidden flex flex-col items-center justify-center text-white font-sans">
      {/* Background Hexagon Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
          backgroundSize: '200px'
        }}
      />
      
      {/* Abstract Tech Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl"
      >

        {/* Header / Logo Area */}
        <div className="flex items-center gap-3 mb-12">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-white">AMBEV</span>
            <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center p-1">
               <div className="w-full h-full border border-white rounded-sm" />
            </div>
          </div>
          <div className="h-6 w-[1px] bg-white/20 mx-1" />
          <span className="text-xs font-bold tracking-[0.3em] text-white/70">PPM FACILITIES</span>
        </div>

        {/* Hero Text */}
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-6 leading-tight">
          Sistema de Gerenciamento <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            e Controle de Peças
          </span>
        </h1>

        <p className="text-slate-400 text-xs md:text-sm max-w-lg mb-10 font-medium leading-relaxed opacity-80">
          Plataforma centralizada para o controle a um clique das empresas do Time Facilities. 
          Eficiência e rastreabilidade total.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs md:max-w-sm mt-2">
          {/* Main Enter button */}
          <motion.button
            animate={{
              boxShadow: [
                "0 0 15px rgba(37, 99, 235, 0.2)",
                "0 0 30px rgba(37, 99, 235, 0.4)",
                "0 0 15px rgba(37, 99, 235, 0.2)"
              ],
              scale: [1, 1.01, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(37, 99, 235, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onEnter('dashboard')}
            className="group relative w-full py-4 bg-blue-600 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] overflow-hidden transition-all shadow-xl shadow-blue-900/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10">Entrar no Sistema</span>
          </motion.button>

          {/* Divider */}
          <div className="flex items-center my-1 opacity-60">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="px-3 text-[9px] font-bold text-slate-500 tracking-widest">ATALHOS DIRETOS</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Retirar Peça button */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onEnter('retirada-materiais')}
              className="group relative cursor-pointer py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] overflow-hidden transition-all text-blue-400 hover:text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">Retirar Peça</span>
            </motion.button>

            {/* Reunião de Self button */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.8)", borderColor: "rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onEnter('reuniao-self')}
              className="group relative cursor-pointer py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl font-bold uppercase tracking-[0.15em] text-[9px] overflow-hidden transition-all text-blue-400 hover:text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">Reunião de Self</span>
            </motion.button>
          </div>
        </div>

      </motion.div>

      {/* Subtle Log Off Button for Authenticated Users */}
      {user && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={signOut}
          className="absolute bottom-10 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer group"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sair da Conta</span>
        </motion.button>
      )}

      {/* Decorative lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
    </div>
  );
};
