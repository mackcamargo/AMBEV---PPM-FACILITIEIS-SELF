import React, { useState, useMemo } from 'react';
import { Package, ArrowUpRight, ArrowDownLeft, AlertCircle, Calendar, Filter, Search, User, Trophy, Coins } from 'lucide-react';
import { useApp } from '../lib/store';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { materiais, movimentacoes, equipes } = useApp();
  const [filterType, setFilterType] = useState<'day' | 'month' | 'custom'>('month');
  
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

  // Filtra as movimentações com base no tipo de filtro selecionado ou intervalo de datas personalizado
  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(m => {
      if (!m.data) return false;
      const mDate = new Date(m.data);
      if (isNaN(mDate.getTime())) return false;

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
  }, [movimentacoes, filterType, startDate, endDate]);

  const totalMateriais = useMemo(() => materiais.reduce((acc, m) => acc + Number(m?.estoqueAtual || 0), 0), [materiais]);
  const estoqueBaixo = materiais.filter(m => (m?.estoqueAtual || 0) < (m?.estoqueMinimo || 0)).length;
  const estoqueZero = materiais.filter(m => (m?.estoqueAtual || 0) === 0).length;

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
        .reduce((acc, m) => acc + (Number(m.quantidade) * (Number(m.precoUnitario) || 0)), 0);

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
    { label: 'Total Materiais em Self', value: totalMateriais, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Entradas (Valor)', value: `R$ ${teamPerformance.reduce((acc, c) => acc + (c?.entrada || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Retiradas (Valor)', value: `R$ ${teamPerformance.reduce((acc, c) => acc + (c?.retirada || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: ArrowDownLeft, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Movimentações', value: filteredMovimentacoes.length, icon: ArrowUpRight, color: 'text-brand-accent', bg: 'bg-slate-50' },
  ];

  // Cálculo de Estoque valorizado por Equipe e Total (calculado retroativamente conforme o período / data limite)
  const teamValuedStock = useMemo(() => {
    let asOfDate = new Date();
    if (filterType === 'day') {
      asOfDate = new Date();
      asOfDate.setHours(23, 59, 59, 999);
    } else if (filterType === 'month') {
      asOfDate = new Date();
      asOfDate.setHours(23, 59, 59, 999);
    } else if (filterType === 'custom') {
      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        asOfDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
      }
    }

    const data = equipes.map(equipe => {
      const teamMaterials = materiais.filter(m => m.equipe === equipe.nome);
      
      let valorTotal = 0;
      let quantidadeTotal = 0;

      teamMaterials.forEach(m => {
        let quantityAsOf = Number(m.estoqueAtual);

        // Encontra movimentações posteriores à asOfDate para desfazer seu efeito (rollback)
        const postMovements = movimentacoes.filter(mov => {
          if (mov.materialId === m.id && mov.data) {
            const movDate = new Date(mov.data);
            return !isNaN(movDate.getTime()) && movDate > asOfDate;
          }
          return false;
        });

        postMovements.forEach(mov => {
          if (mov.tipo === 'Entrada') {
            quantityAsOf -= Number(mov.quantidade);
          } else if (mov.tipo === 'Retirada') {
            quantityAsOf += Number(mov.quantidade);
          }
        });

        const finalQty = Math.max(0, quantityAsOf);
        quantidadeTotal += finalQty;
        valorTotal += finalQty * (Number(m.precoUnitario) || 0);
      });
      
      return {
        name: equipe.nome,
        color: equipe.cor,
        valorTotal,
        quantidadeTotal
      };
    });

    const globalTotalValue = data.reduce((acc, t) => acc + t.valorTotal, 0);

    return {
      teams: data,
      globalTotalValue,
      asOfDate
    };
  }, [materiais, movimentacoes, equipes, filterType, endDate]);

  // Simulação de dados de retirada por mês (Dashboard Linear / Onda)
  const withdrawalData = [
    { month: 'Jan', value: 4200 },
    { month: 'Fev', value: 3800 },
    { month: 'Mar', value: 5100 },
    { month: 'Abr', value: 4600 },
    { month: 'Mai', value: 5900 },
    { month: 'Jun', value: 4300 },
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto p-5 scroll-smooth">
      {/* Header Filters */}
      <div className="card !p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterType('day')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'day' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Hoje</button>
            <button 
              onClick={() => setFilterType('month')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'month' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Mês</button>
            <button 
              onClick={() => setFilterType('custom')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'custom' ? 'bg-white shadow-sm text-brand-dark' : 'text-slate-500'}`}
            >Personalizado</button>
          </div>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <input 
                type="date" 
                className="text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-brand-accent transition-all" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-300 text-[10px] font-bold">A</span>
              <input 
                type="date" 
                className="text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-brand-accent transition-all" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>


      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card flex items-center gap-4 group transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total de Peças Retiradas por Equipe (Qtd) */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Peças Retiradas por Equipe (Qtd)</h3>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamQuantities} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  formatter={(value: any) => [`${value} unidades`, 'Quantidade']}
                />
                <Bar 
                  dataKey="quantidade" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={28}
                  label={{ 
                    position: 'top', 
                    formatter: (val: any) => `${val}`,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#475569'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Withdrawal by Team (Horizontal Bar - Image Reference Style) */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Retiradas por Equipe (R$)</h3>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={[...teamPerformance].sort((a, b) => b.retirada - a.retirada)} 
                layout="vertical" 
                margin={{ left: -10, right: 35, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }}
                  width={70}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Retirado']}
                />
                <Bar 
                  dataKey="retirada" 
                  fill="#EF4444" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  label={{ 
                    position: 'right', 
                    formatter: (val: any) => `R$ ${Math.round(val).toLocaleString('pt-BR')}`,
                    fontSize: 10,
                    fontWeight: 700,
                    fill: '#64748B'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Third Row: Health + Critical + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estoque valorizado */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estoque valorizado</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-tighter">Por Equipe</span>
          </div>

          <div className="mb-4 p-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Valor Total do Estoque</span>
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider mt-0.5">
                Posição em: {teamValuedStock.asOfDate.toLocaleDateString('pt-BR')}
              </span>
            </div>
            <span className="text-[14px] font-extrabold text-slate-900 font-mono">
              R$ {teamValuedStock.globalTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="space-y-4">
            {teamValuedStock.teams.map((team, idx) => {
              const percentage = teamValuedStock.globalTotalValue > 0 
                ? Math.round((team.valorTotal / teamValuedStock.globalTotalValue) * 100) 
                : 0;

              return (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }}></div>
                      <span className="text-[11px] font-bold text-slate-700">{team.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold text-slate-800 font-mono">
                        R$ {team.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {team.quantidadeTotal} un ({percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full rounded-full" style={{ backgroundColor: team.color, width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Withdrawers Ranking */}
        <div className="card">
           <div className="flex items-center justify-between mb-5">
             <div className="flex items-center gap-2">
               <Trophy className="w-4 h-4 text-amber-500" />
               <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top + Retirantes</h3>
             </div>
             <span className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-tighter">Qtd Peças</span>
           </div>

           <div className="space-y-3">
             {withdrawerRanking.length > 0 ? (
               withdrawerRanking.map((person, idx) => (
                 <div key={idx} className="flex flex-col gap-1.5">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className={`text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-50 text-orange-600' : 'text-slate-400'}`}>
                         {idx + 1}
                       </span>
                       <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{person.name}</span>
                     </div>
                     <span className="text-[11px] font-bold text-brand-blue tabular-nums">{person.total}</span>
                   </div>
                   <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                     <div 
                       className={`h-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-600' : idx < 3 ? 'bg-blue-400' : 'bg-slate-300'}`}
                       style={{ width: `${(person.total / (withdrawerRanking[0]?.total || 1)) * 100}%` }}
                     ></div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                 <User className="w-8 h-8 mb-2 opacity-20" />
                 <p className="text-[10px] font-bold uppercase">Sem registros</p>
               </div>
             )}
           </div>
        </div>

        {/* Critical Alerts */}
        <div className="card">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Alertas Críticos
          </h3>
          <div className="space-y-2">
            {materiais
              .filter(m => m.estoqueAtual < m.estoqueMinimo)
              .sort((a, b) => (b.estoqueMinimo - b.estoqueAtual) - (a.estoqueMinimo - a.estoqueAtual))
              .slice(0, 5)
              .map(m => (
                <div key={m.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{m.descricao}</span>
                     <span className="text-[9px] text-slate-400 font-mono">ESTOQUE: <b className="text-red-500">{m.estoqueAtual}</b> / {m.estoqueMinimo}</span>
                   </div>
                   <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${m.estoqueAtual === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                     {m.estoqueAtual === 0 ? 'ZERADO' : 'CRÍTICO'}
                   </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
