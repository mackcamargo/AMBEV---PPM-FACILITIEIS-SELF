import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  History, 
  Users, 
  Briefcase, 
  Truck, 
  UsersRound, 
  CalendarCheck, 
  FileText, 
  Settings,
  Menu,
  ChevronDown,
  Bell,
  ChevronLeft,
  X,
  RotateCw,
  Home
} from 'lucide-react';
import { useApp } from '../lib/store';
import { ViewState } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { view, setView, setHasEntered } = useApp();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const menuItems = [
    { section: 'PAINEL', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'MOVIMENTAÇÕES', items: [
      { id: 'entrada-materiais', label: 'Entrada de Materiais', icon: ArrowDownLeft },
      { id: 'retirada-materiais', label: 'Retirada de Materiais', icon: ArrowUpRight },
      { id: 'estoque-atual', label: 'Estoque Atual', icon: Package },
      { id: 'movimentacoes', label: 'Movimentações', icon: History },
    ]},
    { section: 'CADASTROS', items: [
      { id: 'cad-materiais', label: 'Materiais', icon: Package },
      { id: 'cad-empresas', label: 'Empresas', icon: Briefcase },
      { id: 'cad-fornecedores', label: 'Fornecedores', icon: Truck },
      { id: 'cad-colaboradores', label: 'Colaboradores', icon: Users },
      { id: 'cad-equipes', label: 'Equipes', icon: UsersRound },
      { id: 'reuniao-self', label: 'Reunião de Self', icon: CalendarCheck },
    ]},
    { section: 'SISTEMA', items: [
      { id: 'historico-reunioes', label: 'Histórico de Reuniões', icon: FileText },
      { id: 'relatorios', label: 'Relatórios', icon: FileText },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ]},
  ];

  return (
    <div className="flex h-screen bg-brand-light overflow-hidden">
      {/* Backdrop (Backdrop de fundo para fechar o menu ao tocar fora no mobile) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative top-0 bottom-0 left-0 z-40 w-56 bg-brand-dark text-slate-400 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Pequena aba retrátil / Alça para tocar no mobile */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="absolute top-[75%] -right-11 w-11 h-14 bg-brand-dark hover:bg-slate-800 text-white flex items-center justify-center rounded-r-xl border-y border-r border-slate-700/50 shadow-[5px_2px_12px_rgba(0,0,0,0.18)] cursor-pointer select-none transition-all duration-200 pointer-events-auto z-50 md:hidden"
          title={isMobileOpen ? "Recolher menu" : "Expandir menu"}
          aria-label={isMobileOpen ? "Recolher menu" : "Expandir menu"}
        >
          {isMobileOpen ? (
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          ) : (
            <Menu className="w-5 h-5 text-white" />
          )}
        </button>

        <div className="p-5 flex items-center gap-3 border-b border-white/10 mb-2">
          <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">PPM</span>
          </div>
          <div>
            <h1 className="text-white text-[13px] font-semibold leading-tight">Centro de Inteligência</h1>
            <p className="text-[10px] text-white/60 font-normal">Facilities</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-6">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-4">
              <h2 className="text-[10px] font-bold text-slate-500 px-5 mb-2 uppercase tracking-widest opacity-50">{section.section}</h2>
              <div className="">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id as ViewState);
                      setIsMobileOpen(false);
                    }}
                    className={`sidebar-item w-full ${view === item.id ? 'active' : ''}`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-brand-border px-6 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-[14px] font-semibold text-brand-dark">
              Módulo: {view.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHasEntered(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-bold text-[9px] uppercase tracking-wider cursor-pointer select-none active:scale-95 h-8 shadow-xs"
                title="Ir para a Tela Inicial / Boas-vindas"
              >
                <Home className="w-3 h-3 text-blue-600" />
                <span>Tela Inicial</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 transition-all font-bold text-[9px] uppercase tracking-wider cursor-pointer select-none active:scale-95 disabled:opacity-50 h-8 shadow-xs"
                title="Atualizar Aplicativo"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};
