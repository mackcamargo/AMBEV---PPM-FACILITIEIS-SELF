import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, ArrowUpRight, ArrowDownLeft, AlertCircle, Coins, History, RefreshCw, Trophy, User, LogOut } from 'lucide-react';
import { useApp } from '../lib/store';
import { normalizeText } from '../lib/stringUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LabelList
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { materiais, movimentacoes, equipes, signOut } = useApp();
  const [filterType, setFilterType] = useState<'day' | 'month' | 'custom'>('month');

  // ROTAÇÃO AUTOMÁTICA DAS EQUIPES (ESTILO RELATÓRIOS)
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  const sortedEquipesForCarousel = useMemo(() => {
    return [...equipes].sort((a, b) => {
      const order = ['CIVIL', 'HIDRAULICA', 'REFRIGERAÇÃO'];
      const indexA = order.indexOf(a.nome.toUpperCase());
      const indexB = order.indexOf(b.nome.toUpperCase());

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return a.nome.localeCompare(b.nome);
    });
  }, [equipes]);

  useEffect(() => {
    if (sortedEquipesForCarousel.length === 0) return;
    const interval = setInterval(() => {
      setActiveTeamIndex((prev) => (prev + 1) % sortedEquipesForCarousel.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sortedEquipesForCarousel.length]);

  const activeTeam = useMemo(() => {
    if (sortedEquipesForCarousel.length === 0) return null;
    return sortedEquipesForCarousel[activeTeamIndex % sortedEquipesForCarousel.length];
  }, [sortedEquipesForCarousel, activeTeamIndex]);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filtra as movimentações com base no tipo de filtro selecionado ou intervalo de datas personalizado
  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(m => {
      if (!m.data) return false;
      const mDate = new Date(m.data);
      if (isNaN(mDate.getTime())) return false;

      // Filtro de busca por material (Nome ou SAP)
      if (searchQuery) {
        const query = normalizeText(searchQuery);
        const mat = materiais.find(mat => mat.id === m.materialId);
        const matchesMaterial = 
          normalizeText(m.materialDesc || '').includes(query) || 
          normalizeText(mat?.descricao || '').includes(query) || 
          normalizeText(mat?.sap || '').includes(query);
        
        if (!matchesMaterial) return false;
      }

      if (filterType === 'day') {
        const today = new Date();
        return (
          mDate.getDate() === today.getDate() &&
          mDate.getMonth() === today.getMonth() &&
          mDate.getFullYear() === today.getFullYear()
        );
      } else if (filterType === 'month') {
        const today = new Date();
        return (
          mDate.getMonth() === today.getMonth() &&
          mDate.getFullYear() === today.getFullYear()
        );
      } else if (filterType === 'custom') {
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
          const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
          if (mDate < start) return false;
        }
        if (endDate) {
          const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
          const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
          if (mDate > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [movimentacoes, filterType, startDate, endDate, searchQuery, materiais]);

  // Timeline de Investimentos da Equipe Ativa (6 meses) - Independente do filtro de data do topo
  const activeTeamTimeline = useMemo(() => {
    if (!activeTeam) return [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const tracker: Record<string, { name: string; value: number; index: number }> = {};
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      tracker[key] = {
        name: `${mName}/${String(d.getFullYear()).slice(-2)}`,
        value: 0,
        index: d.getTime()
      };
    }

    // Usamos 'movimentacoes' (base total) em vez de 'filteredMovimentacoes' para mostrar a evolução temporal real
    movimentacoes.forEach(m => {
      // Retornamos para 'Retirada' (Gastos), conforme solicitado
      if (m.tipo !== 'Retirada') return;
      
      const mat = materiais.find(mat => mat.id === m.materialId || mat.sap === m.materialId);
      if (mat?.equipe !== activeTeam.nome) return;

      if (!m.data) return;
      const d = new Date(m.data);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // FALLBACK: Se o preçoUnitário não estiver na movimentação (legado ou não salvo), usa o do cadastro do material
      const unitPrice = Number(m.precoUnitario) || Number(mat?.precoUnitario) || 0;
      const val = (Number(m.quantidade) || 0) * unitPrice;

      if (tracker[key]) {
        tracker[key].value += val;
      }
    });

    return Object.values(tracker).sort((a, b) => a.index - b.index);
  }, [activeTeam, movimentacoes, materiais]);

  const currentVsPrev = useMemo(() => {
    if (activeTeamTimeline.length < 2) return { current: 0, prev: 0, diff: 0, percent: 0 };
    const current = activeTeamTimeline[activeTeamTimeline.length - 1].value;
    const prev = activeTeamTimeline[activeTeamTimeline.length - 2].value;
    const diff = current - prev;
    
    let percent = 0;
    if (prev >= 100) {
      percent = (diff / prev) * 100;
    } else if (current >= 100) {
      percent = 100; // Representa um aumento de 100% ao sair de uma base insignificante ou nula (evita distorções de base muito baixas)
    } else {
      percent = 0;
    }
    
    return { current, prev, diff, percent };
  }, [activeTeamTimeline]);

  const totalEstoqueUnits = useMemo(() => materiais.reduce((acc, m) => acc + Number(m?.estoqueAtual || 0), 0), [materiais]);
  const totalMaterialTypes = materiais.length;

  // Ranking de Retirantes
  const withdrawerRanking = useMemo(() => {
    const ranking: Record<string, number> = {};
    filteredMovimentacoes
      .filter(m => m.tipo === 'Retirada' && m.colaborador)
      .forEach(m => {
        ranking[m.colaborador] = (ranking[m.colaborador] || 0) + m.quantidade;
      });
    
    return Object.entries(ranking)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredMovimentacoes]);

  // Cálculo de Performance Financeira por Equipe (Entradas vs Retiradas)
  const teamPerformance = useMemo(() => {
    return equipes.map(equipe => {
      const teamMovs = filteredMovimentacoes.filter(m => {
        const material = materiais.find(mat => mat.id === m.materialId);
        return material?.equipe === equipe.nome;
      });

      const entries = teamMovs
        .filter(m => m.tipo === 'Entrada')
        .reduce((acc, m) => acc + (Number(m.quantidade) * (Number(m.precoUnitario) || 0)), 0);
      
      const withdrawals = teamMovs
        .filter(m => m.tipo === 'Retirada')
        .reduce((acc, m) => {
          const mat = materiais.find(mat => mat.id === m.materialId || mat.sap === m.materialId);
          const price = Number(m.precoUnitario) || Number(mat?.precoUnitario) || 0;
          return acc + (Number(m.quantidade) * price);
        }, 0);

      return {
        name: equipe.nome,
        entrada: entries,
        retirada: withdrawals,
      };
    });
  }, [filteredMovimentacoes, materiais, equipes]);

  // Cálculo de quantidade de peças retiradas por equipe
  const teamQuantities = useMemo(() => {
    return equipes.map(equipe => {
      const teamMovs = filteredMovimentacoes.filter(m => {
        const material = materiais.find(mat => mat.id === m.materialId);
        return material?.equipe === equipe.nome;
      });

      const withdrawalsQty = teamMovs
        .filter(m => m.tipo === 'Retirada')
        .reduce((acc, m) => acc + Number(m.quantidade), 0);

      return {
        name: equipe.nome,
        quantidade: withdrawalsQty,
      };
    });
  }, [filteredMovimentacoes, materiais, equipes]);

  const stats = [
    { label: 'Tipos de Materiais', value: totalMaterialTypes, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Itens em Estoque', value: totalEstoqueUnits, icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Entradas (Valor)', value: `R$ ${filteredMovimentacoes.filter(m => m.tipo === 'Entrada').reduce((acc, m) => {
      const mat = materiais.find(mat => mat.id === m.materialId || mat.sap === m.materialId);
      const price = Number(m.precoUnitario) || Number(mat?.precoUnitario) || 0;
      return acc + (Number(m.quantidade) * price);
    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Saídas (Valor)', value: `R$ ${filteredMovimentacoes.filter(m => m.tipo === 'Retirada').reduce((acc, m) => {
      const mat = materiais.find(mat => mat.id === m.materialId || mat.sap === m.materialId);
      const price = Number(m.precoUnitario) || Number(mat?.precoUnitario) || 0;
      return acc + (Number(m.quantidade) * price);
    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: ArrowDownLeft, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Movimentações', value: filteredMovimentacoes.length, icon: History, color: 'text-brand-accent', bg: 'bg-slate-50' },
  ];

  // Cálculo de Estoque valorizado por Equipe e Total (Baseado no ESTOQUE ATUAL conforme solicitado)
  const teamValuedStock = useMemo(() => {
    // Se houver busca por material, o valor do estoque deve refletir apenas os materiais filtrados
    const materialsBase = searchQuery 
      ? materiais.filter(m => {
          const query = normalizeText(searchQuery);
          return normalizeText(m.descricao).includes(query) || 
                 normalizeText(m.sap || '').includes(query);
        })
      : materiais;

    // 1. Cálculo individual por material (Fonte da verdade: Materiais na base)
    const materialValues = materialsBase.map(m => ({
      id: m.id,
      equipe: m.equipe,
      valor: (Number(m.estoqueAtual) || 0) * (Number(m.precoUnitario) || 0),
      quantidade: Number(m.estoqueAtual) || 0
    }));

    // 2. Valor Global (Soma tudo na base)
    const globalTotalValue = materialValues.reduce((acc, mv) => acc + mv.valor, 0);

    // 3. Decomposição por equipe
    const data = equipes.map(equipe => {
      const teamMvs = materialValues.filter(mv => mv.equipe === equipe.nome);
      return {
        name: equipe.nome,
        color: equipe.cor,
        valorTotal: teamMvs.reduce((acc, mv) => acc + mv.valor, 0),
        quantidadeTotal: teamMvs.reduce((acc, mv) => acc + mv.quantidade, 0)
      };
    });

    // 4. Materiais Sem Equipe (Garante que nada fique de fora do gráfico/lista se o total global for maior)
    const materialsWithNoTeam = materialValues.filter(mv => !equipes.some(e => e.nome === mv.equipe));
    if (materialsWithNoTeam.length > 0) {
      data.push({
        name: 'DIVERSOS / SEM EQUIPE',
        color: '#94a3b8',
        valorTotal: materialsWithNoTeam.reduce((acc, mv) => acc + mv.valor, 0),
        quantidadeTotal: materialsWithNoTeam.reduce((acc, mv) => acc + mv.quantidade, 0)
      });
    }

    return {
      teams: data.sort((a, b) => b.valorTotal - a.valorTotal),
      globalTotalValue,
      asOfDate: new Date()
    };
  }, [materiais, equipes, searchQuery]);

  return (
    <div className="view-container !p-0 overflow-hidden bg-brand-light">
      <div className="scroll-container p-5 space-y-6">
      {/* Header Filters - Compact */}
      <div className="card !p-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button 
              onClick={() => setFilterType('day')}
              className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${filterType === 'day' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Hoje</button>
            <button 
              onClick={() => setFilterType('month')}
              className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${filterType === 'month' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Mês</button>
            <button 
              onClick={() => setFilterType('custom')}
              className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${filterType === 'custom' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Personalizado</button>
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <input 
                type="date" 
                className="text-[9px] font-bold border border-brand-dark/20 rounded px-2 py-1 outline-none focus:border-brand-accent transition-all" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-300 text-[9px] font-bold">A</span>
              <input 
                type="date" 
                className="text-[9px] font-bold border border-brand-dark/20 rounded px-2 py-1 outline-none focus:border-brand-accent transition-all" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="scroll-container space-y-4 pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="card !p-3 flex items-center gap-3 group transition-all">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-105 shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider mb-0">{stat.label}</p>
                <p className="text-lg font-bold text-slate-800 tracking-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* GRÁFICO ROTATIVO: Investimentos por Equipe (Linha do Tempo) */}
          <div className="card !p-4 flex flex-col relative overflow-hidden group/moving bg-white border border-brand-dark/10 shadow-sm">
            {/* Progress Indicator line */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-50 overflow-hidden z-20">
              <div 
                key={activeTeamIndex}
                className="h-full bg-red-600 animate-in slide-in-from-left duration-[6000ms] ease-linear repeat-infinite fill-mode-forwards"
                style={{ width: '100%' }}
              ></div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-3 h-3 text-red-600 animate-spin-slow" />
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">FLUXO DE GASTOS: <span className="text-red-600 animate-pulse">{activeTeam?.nome}</span></h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">MÊS VIGENTE</span>
                    <span className="text-xs font-black text-slate-800">R$ {currentVsPrev.current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-5 w-px bg-slate-100 mx-1"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">VARIAÇÃO</span>
                    <div className={`flex items-center gap-1 text-[10px] font-black ${currentVsPrev.diff <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {currentVsPrev.diff <= 0 ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                      {Math.abs(currentVsPrev.percent).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1 max-w-[100px] justify-end">
                  {sortedEquipesForCarousel.slice(0, 5).map((eq, idx) => (
                    <div 
                      key={eq.id}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === (activeTeamIndex % sortedEquipesForCarousel.length) ? 'bg-red-600 scale-125' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTeamTimeline} margin={{ top: 25, right: 40, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorInvestDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fill: '#64748B', fontWeight: 700 }} 
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 7, fill: '#94a3b8' }}
                    tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}
                    width={35}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Gasto']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorInvestDash)"
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#ef4444' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      offset={12} 
                      content={(props: any) => {
                        const { x, y, value } = props;
                        if (!value || value === 0) return null;
                        return (
                          <text x={x} y={y - 10} fill="#991b1b" fontSize={8} fontWeight={900} textAnchor="middle">
                            R${value >= 1000 ? (value/1000).toFixed(1)+'k' : Math.round(value)}
                          </text>
                        );
                      }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

    {/* Investment by Team (Horizontal Bar - Gasto R$) */}
          <div className="card !p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">ENTRADAS POR EQUIPE (R$)</h3>
            </div>
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[...teamPerformance].sort((a, b) => b.entrada - a.entrada)} 
                  layout="vertical" 
                  margin={{ left: 0, right: 60, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#1e293b', fontWeight: 700 }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Investimento']}
                  />
                  <Bar 
                    dataKey="entrada" 
                    fill="#10B981" 
                    radius={[0, 4, 4, 0]} 
                    barSize={12}
                    label={{ 
                      position: 'right', 
                      formatter: (val: any) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      fontSize: 8,
                      fontWeight: 800,
                      fill: '#64748B'
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Third Row: Health + Critical + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
          {/* Estoque valorizado */}
          <div className="card !p-4 h-[340px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">ESTOQUE VALORIZADO</h3>
              </div>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">POR EQUIPE</span>
            </div>

            <div className="mb-3 p-2 bg-slate-50 border border-brand-dark/10/80 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase">VALOR TOTAL</span>
                <span className="text-[8px] font-bold text-brand-accent uppercase tracking-wider">
                  EM: {teamValuedStock.asOfDate.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 font-mono">
                R${teamValuedStock.globalTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {teamValuedStock.teams.map((team, idx) => {
                const percentage = teamValuedStock.globalTotalValue > 0 
                  ? Math.round((team.valorTotal / teamValuedStock.globalTotalValue) * 100) 
                  : 0;

                return (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }}></div>
                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px] uppercase">{team.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-800 font-mono">
                          R${team.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold">
                          {team.quantidadeTotal} un ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full rounded-full" style={{ backgroundColor: team.color, width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consumo por Equipe (R$) - Identical style to Valued Stock */}
          <div className="card !p-4 h-[340px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-3.5 h-3.5 text-red-500" />
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">CONSUMO POR EQUIPE (R$)</h3>
              </div>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">PERÍODO ATIVO</span>
            </div>

            <div className="mb-3 p-2 bg-red-50/50 border border-red-100/50 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase">TOTAL CONSUMIDO</span>
                <span className="text-[8px] font-bold text-red-600 uppercase tracking-wider">
                  {filterType === 'month' ? 'Mês Vigente' : filterType === 'day' ? 'Hoje' : 'Personalizado'}
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 font-mono">
                R${teamPerformance.reduce((acc, c) => acc + (c?.retirada || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {[...teamPerformance]
                .sort((a, b) => b.retirada - a.retirada)
                .map((team, idx) => {
                  const totalWithdrawal = teamPerformance.reduce((acc, c) => acc + (c?.retirada || 0), 0);
                  const percentage = totalWithdrawal > 0 
                    ? Math.round((team.retirada / totalWithdrawal) * 100) 
                    : 0;
                  
                  const teamData = equipes.find(e => e.nome === team.name);
                  const teamQty = teamQuantities.find(q => q.name === team.name);

                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamData?.cor || '#cbd5e1' }}></div>
                          <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px] uppercase">{team.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-800 font-mono">
                            R${team.retirada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold">
                            {teamQty?.quantidade || 0} un ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full rounded-full" style={{ backgroundColor: teamData?.cor || '#3b82f6', width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="card !p-4 flex flex-col h-[340px] overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-700 uppercase mb-3 tracking-widest flex items-center gap-2 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ALERTAS CRÍTICOS
            </h3>
            
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-white via-transparent to-white opacity-20" />
              <motion.div
                animate={{ 
                  y: materiais.filter(m => m.estoqueAtual < m.estoqueMinimo).length > 6 ? [0, -(materiais.filter(m => m.estoqueAtual < m.estoqueMinimo).length * 40)] : 0 
                }}
                transition={{ 
                  duration: materiais.filter(m => m.estoqueAtual < m.estoqueMinimo).length * 4, 
                  repeat: Infinity, 
                  ease: "linear"
                }}
                className="space-y-1.5"
              >
                {/* List of alerts */}
                {materiais
                  .filter(m => m.estoqueAtual < m.estoqueMinimo)
                  .sort((a, b) => (b.estoqueMinimo - b.estoqueAtual) - (a.estoqueMinimo - a.estoqueAtual))
                  .map(m => (
                    <div key={m.id} className="p-1.5 rounded-lg bg-slate-50 border border-brand-dark/10 flex items-center justify-between h-[34px]">
                       <div className="flex flex-col min-w-0 mr-2">
                         <span className="text-[9px] font-black text-slate-700 truncate">{m.descricao}</span>
                         <span className="text-[8px] text-slate-400 font-bold">QTD: <b className="text-red-500">{m.estoqueAtual}</b> / {m.estoqueMinimo}</span>
                       </div>
                       <span className={`text-[7px] font-black px-1 py-0.5 rounded shrink-0 ${m.estoqueAtual === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                         {m.estoqueAtual === 0 ? 'ZERADO' : 'CRÍTICO'}
                       </span>
                    </div>
                  ))}
                
                {/* Duplicate items for seamless scrolling if many items */}
                {materiais.filter(m => m.estoqueAtual < m.estoqueMinimo).length > 6 && 
                  materiais
                    .filter(m => m.estoqueAtual < m.estoqueMinimo)
                    .sort((a, b) => (b.estoqueMinimo - b.estoqueAtual) - (a.estoqueMinimo - a.estoqueAtual))
                    .map(m => (
                      <div key={`${m.id}-duplicate`} className="p-1.5 rounded-lg bg-slate-50 border border-brand-dark/10 flex items-center justify-between h-[34px]">
                         <div className="flex flex-col min-w-0 mr-2">
                           <span className="text-[9px] font-black text-slate-700 truncate">{m.descricao}</span>
                           <span className="text-[8px] text-slate-400 font-bold">QTD: <b className="text-red-500">{m.estoqueAtual}</b> / {m.estoqueMinimo}</span>
                         </div>
                         <span className={`text-[7px] font-black px-1 py-0.5 rounded shrink-0 ${m.estoqueAtual === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                           {m.estoqueAtual === 0 ? 'ZERADO' : 'CRÍTICO'}
                         </span>
                      </div>
                    ))
                }
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
