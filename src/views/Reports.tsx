import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, LabelList } from 'recharts';
import { 
  Download, FileText, Filter, Calendar, Search, X, Check, ArrowUpRight, 
  ArrowDownLeft, Info, HelpCircle, Users, Settings, Tag, ShieldAlert, Award,
  Play, Pause, RefreshCw, Coins
} from 'lucide-react';
import { useApp } from '../lib/store';
import { normalizeText } from '../lib/stringUtils';

export const ReportsView: React.FC = () => {
  const { equipes, movimentacoes, materiais, fornecedores } = useApp();

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEquipe, setSelectedEquipe] = useState('Tudo');
  const [selectedTipo, setSelectedTipo] = useState('Tudo');
  
  // Selected Report State
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Details Modal state
  const [detailFilter, setDetailFilter] = useState<{
    type: 'material' | 'equipe' | 'fornecedor';
    id?: string;
    name?: string;
    title: string;
    subtitle: string;
  } | null>(null);

  // 1. Filter Movements based on active filters
  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(m => {
      // Date filter
      if (m.data) {
        const mDate = new Date(m.data);
        if (!isNaN(mDate.getTime())) {
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
        }
      }

      // Type Filter
      if (selectedTipo !== 'Tudo' && m.tipo !== selectedTipo) {
        return false;
      }

      // Equipe Filter
      if (selectedEquipe !== 'Tudo') {
        const mat = materiais.find(x => x.id === m.materialId);
        const materialTeam = mat?.equipe || '';
        const movementTeam = m.equipe || '';
        if (materialTeam !== selectedEquipe && movementTeam !== selectedEquipe) {
          return false;
        }
      }

      return true;
    });
  }, [movimentacoes, materiais, startDate, endDate, selectedTipo, selectedEquipe]);

  // Is any filter active?
  const hasActiveFilters = useMemo(() => {
    return startDate !== '' || endDate !== '' || selectedEquipe !== 'Tudo' || selectedTipo !== 'Tudo';
  }, [startDate, endDate, selectedEquipe, selectedTipo]);

  // Reset Filters helper
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEquipe('Tudo');
    setSelectedTipo('Tudo');
  };

  // 2. Dynamic Monthly Data Generator for main chart (from filtered movements)
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const tracker: Record<string, { name: string; consumption: number; entries: number; index: number }> = {};
    
    // Auto populate last 6 months to ensure a continuous beautiful graph
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      tracker[key] = {
        name: `${mName}/${String(d.getFullYear()).slice(-2)}`,
        consumption: 0,
        entries: 0,
        index: d.getTime()
      };
    }

    filteredMovimentacoes.forEach(m => {
      if (!m.data) return;
      const d = new Date(m.data);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const value = (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0);

      if (!tracker[key]) {
        const mName = months[d.getMonth()];
        tracker[key] = {
          name: `${mName}/${String(d.getFullYear()).slice(-2)}`,
          consumption: 0,
          entries: 0,
          index: d.getTime()
        };
      }

      if (m.tipo === 'Retirada') {
        tracker[key].consumption += value;
      } else {
        tracker[key].entries += value;
      }
    });

    return Object.values(tracker).sort((a, b) => a.index - b.index);
  }, [filteredMovimentacoes]);

  // 3. CC Efficiency (Entries & Consumption per CC Team Name)
  const ccEfficiencyData = useMemo(() => {
    return equipes.map(eq => {
      const entries = filteredMovimentacoes.filter(m => {
        if (m.tipo !== 'Entrada') return false;
        const mat = materiais.find(x => x.id === m.materialId);
        return mat?.equipe === eq.nome || m.equipe === eq.nome;
      });

      const withdrawals = filteredMovimentacoes.filter(m => {
        if (m.tipo !== 'Retirada') return false;
        const mat = materiais.find(x => x.id === m.materialId);
        return mat?.equipe === eq.nome || m.equipe === eq.nome;
      });

      const consumptionValue = withdrawals.reduce((acc, m) => acc + (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0), 0);
      const entriesValue = entries.reduce((acc, m) => acc + (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0), 0);

      return {
        name: eq.nome,
        consumption: consumptionValue,
        entries: entriesValue
      };
    });
  }, [equipes, filteredMovimentacoes, materiais]);

  // --- CONFIGURAÇÃO DO GRÁFICO ROTATIVO DE INVESTIMENTOS POR EQUIPE ---
  // Alternância automática a cada 10 segundos das equipes (mais lento para navegação calma)
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  useEffect(() => {
    if (!isAutoplay || equipes.length === 0) return;
    const interval = setInterval(() => {
      setActiveTeamIndex((prev) => (prev + 1) % equipes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoplay, equipes.length]);

  // Pause autoplay and sync with filters up top on any configuration change
  useEffect(() => {
    const hasAnyFilter = startDate !== '' || endDate !== '' || selectedEquipe !== 'Tudo' || selectedTipo !== 'Tudo';
    if (hasAnyFilter) {
      setIsAutoplay(false); // Pause rotating animation calmly
      if (selectedEquipe !== 'Tudo') {
        const idx = equipes.findIndex(e => e.nome === selectedEquipe);
        if (idx !== -1) {
          setActiveTeamIndex(idx);
        }
      }
    }
  }, [startDate, endDate, selectedEquipe, selectedTipo, equipes]);

  // Equipe ativa selecionada
  const activeRotatingTeam = useMemo(() => {
    if (equipes.length === 0) return null;
    return equipes[activeTeamIndex % equipes.length];
  }, [equipes, activeTeamIndex]);

  // Linha do tempo mensal de Entradas (investimentos efetuados) da equipe ativa
  const teamInvestmentTimeline = useMemo(() => {
    if (!activeRotatingTeam) return [];
    
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const tracker: Record<string, { monthName: string; totalVal: number; index: number }> = {};
    
    // Inicializar os últimos 6 meses com valor zero para manter gráfico uniforme e bonito
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      tracker[key] = {
        monthName: `${mName}/${String(d.getFullYear()).slice(-2)}`,
        totalVal: 0,
        index: d.getTime()
      };
    }

    filteredMovimentacoes.forEach(m => {
      if (m.tipo !== 'Entrada') return;
      
      const mTeamName = m.equipe || '';
      let finalTeam = mTeamName;
      if (!finalTeam && m.materialId) {
        const mat = materiais.find(x => x.sap === m.materialId || x.id === m.materialId);
        if (mat) {
          finalTeam = mat.equipe || '';
        }
      }

      if (finalTeam !== activeRotatingTeam.nome) return;

      if (!m.data) return;
      const d = new Date(m.data);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const val = (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0);

      if (!tracker[key]) {
        const mName = months[d.getMonth()];
        tracker[key] = {
          monthName: `${mName}/${String(d.getFullYear()).slice(-2)}`,
          totalVal: 0,
          index: d.getTime()
        };
      }
      tracker[key].totalVal += val;
    });

    return Object.values(tracker).sort((a, b) => a.index - b.index);
  }, [activeRotatingTeam, filteredMovimentacoes, materiais]);

  // Somatório total investido da equipe ativa no período
  const activeTeamTotalInvestment = useMemo(() => {
    return teamInvestmentTimeline.reduce((acc, t) => acc + t.totalVal, 0);
  }, [teamInvestmentTimeline]);

  // 4. General Global Export function (CSV UTF-8 with BOM for Portuguese character safety in excel)
  const handleExportGeral = () => {
    if (filteredMovimentacoes.length === 0) {
      alert('Nenhuma movimentação encontrada para exportar no período filtrado.');
      return;
    }

    let csvContent = '\uFEFF'; // Excel UTF-8 BOM
    
    const headers = [
      'ID Movimentacao', 'Data', 'Tipo', 'COD SAP', 'Descricao Material', 
      'Quantidade', 'Preco Unitario (R$)', 'Total (R$)', 'Nota Fiscal (NF)', 
      'Pedido Compra', 'PEDIDO COD SAP', 'Fornecedor', 'OS/NF Adicionais', 'Colaborador', 
      'Empresa', 'Equipe', 'Liberador/Conferente', 'Observacoes'
    ];
    csvContent += headers.join(';') + '\n';

    filteredMovimentacoes.forEach(m => {
      const dateStr = m.data ? new Date(m.data).toLocaleString('pt-BR') : '';
      const total = (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0);
      const row = [
        m.id || '',
        dateStr,
        m.tipo || '',
        m.materialId || '',
        m.materialDesc ? m.materialDesc.replace(/;/g, ',') : '',
        m.quantidade || '0',
        m.precoUnitario ? m.precoUnitario.toFixed(2) : '0.00',
        total.toFixed(2),
        m.nf || '',
        m.pedidoCompra || '',
        m.pedidoSap || '',
        m.fornecedor ? m.fornecedor.replace(/;/g, ',') : '',
        m.os || '',
        m.colaborador ? m.colaborador.replace(/;/g, ',') : '',
        m.empresa || '',
        m.equipe || '',
        m.tipo === 'Entrada' ? (m.conferente || '') : (m.liberador || ''),
        m.observacoes ? m.observacoes.replace(/;/g, ',').replace(/\n/g, ' ') : ''
      ];
      csvContent += row.map(cell => `"${cell}"`).join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PPM_Movimentacoes_Filtro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- REPORT GENERATING LOGIC ---

  // Report 1: Inventário Geral
  const inventarioData = useMemo(() => {
    return materiais
      .filter(m => selectedEquipe === 'Tudo' || m.equipe === selectedEquipe)
      .map(m => {
        const valorTotal = (Number(m.estoqueAtual) || 0) * (Number(m.precoUnitario) || 0);
        return {
          sap: m.sap,
          descricao: m.descricao,
          equipe: m.equipe,
          unidade: m.unidade,
          precoUnitario: m.precoUnitario,
          estoqueMinimo: m.estoqueMinimo,
          estoqueIdeal: m.estoqueIdeal,
          estoqueAtual: m.estoqueAtual,
          valorTotal
        };
      })
      .filter(item => {
        if (!reportSearchQuery) return true;
        const q = normalizeText(reportSearchQuery);
        return normalizeText(item.descricao).includes(q) || normalizeText(item.sap).includes(q) || normalizeText(item.equipe).includes(q);
      });
  }, [materiais, reportSearchQuery, selectedEquipe]);

  // Report 2: Movimentação por Equipe
  const equipeMovData = useMemo(() => {
    return equipes
      .filter(eq => selectedEquipe === 'Tudo' || eq.nome === selectedEquipe)
      .map(eq => {
        const entries = filteredMovimentacoes.filter(m => {
          if (m.tipo !== 'Entrada') return false;
          const mat = materiais.find(x => x.id === m.materialId);
          return mat?.equipe === eq.nome || m.equipe === eq.nome;
        });

        const withdrawals = filteredMovimentacoes.filter(m => {
          if (m.tipo !== 'Retirada') return false;
          const mat = materiais.find(x => x.id === m.materialId);
          return mat?.equipe === eq.nome || m.equipe === eq.nome;
        });

        const xVal = entries.reduce((acc, m) => acc + (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0), 0);
        const wVal = withdrawals.reduce((acc, m) => acc + (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0), 0);

        return {
          equipe: eq.nome,
          centroCusto: eq.centroCusto,
          gestor: eq.gestor,
          qtdEntrada: entries.reduce((acc, m) => acc + (Number(m.quantidade) || 0), 0),
          valEntrada: xVal,
          qtdRetirada: withdrawals.reduce((acc, m) => acc + (Number(m.quantidade) || 0), 0),
          valRetirada: wVal,
          saldo: xVal - wVal
        };
      })
      .filter(item => {
        if (!reportSearchQuery) return true;
        const q = normalizeText(reportSearchQuery);
        return normalizeText(item.equipe).includes(q) || normalizeText(item.centroCusto).includes(q) || normalizeText(item.gestor).includes(q);
      });
  }, [equipes, filteredMovimentacoes, materiais, reportSearchQuery]);

  // Report 3: Curva ABC de Materiais
  const curvaABCData = useMemo(() => {
    const usage: Record<string, { id: string; sap: string; desc: string; valTotal: number; qtdTotal: number }> = {};
    
    // Seed with all materials to ensure active tracking
    materiais.forEach(m => {
      usage[m.id] = { id: m.id, sap: m.sap, desc: m.descricao, valTotal: 0, qtdTotal: 0 };
    });

    filteredMovimentacoes.filter(mov => mov.tipo === 'Retirada').forEach(mov => {
      const q = Number(mov.quantidade) || 0;
      const val = q * (Number(mov.precoUnitario) || 0);
      if (usage[mov.materialId]) {
        usage[mov.materialId].valTotal += val;
        usage[mov.materialId].qtdTotal += q;
      }
    });

    const activeList = Object.values(usage)
      .filter(x => x.valTotal > 0)
      .sort((a, b) => b.valTotal - a.valTotal);

    const grandTotal = activeList.reduce((acc, x) => acc + x.valTotal, 0);

    let accum = 0;
    return activeList
      .map(item => {
        accum += item.valTotal;
        const p = grandTotal > 0 ? (item.valTotal / grandTotal) * 100 : 0;
        const cumP = grandTotal > 0 ? (accum / grandTotal) * 100 : 0;
        
        let classe: 'A' | 'B' | 'C' = 'C';
        if (cumP <= 80) classe = 'A';
        else if (cumP <= 95) classe = 'B';

        return {
          ...item,
          percentage: p,
          cumulativePercentage: cumP,
          classe
        };
      })
      .filter(item => {
        if (!reportSearchQuery) return true;
        const q = normalizeText(reportSearchQuery);
        return normalizeText(item.desc).includes(q) || normalizeText(item.sap).includes(q) || normalizeText(item.classe).includes(q);
      });
  }, [materiais, filteredMovimentacoes, reportSearchQuery]);

  // Report 4: Performance de Fornecedores
  const fornecedorPerformanceData = useMemo(() => {
    const sums: Record<string, { nome: string; entries: number; volume: number; val: number; itemsSet: Set<string> }> = {};
    
    fornecedores.forEach(f => {
      sums[f.nomeFantasia] = { nome: f.nomeFantasia, entries: 0, volume: 0, val: 0, itemsSet: new Set() };
    });

    filteredMovimentacoes.filter(mov => mov.tipo === 'Entrada').forEach(mov => {
      const sup = mov.fornecedor || 'Geral/Outros';
      if (!sums[sup]) {
        sums[sup] = { nome: sup, entries: 0, volume: 0, val: 0, itemsSet: new Set() };
      }
      const q = Number(mov.quantidade) || 0;
      sums[sup].entries += 1;
      sums[sup].volume += q;
      sums[sup].val += q * (Number(mov.precoUnitario) || 0);
      if (mov.materialDesc) sums[sup].itemsSet.add(mov.materialDesc);
    });

    return Object.values(sums)
      .filter(s => s.entries > 0)
      .map(s => ({
        ...s,
        media: s.volume > 0 ? s.val / s.volume : 0,
        mainItemsStr: Array.from(s.itemsSet).slice(0, 3).join(', ') || 'Nenhum'
      }))
      .filter(item => {
        if (!reportSearchQuery) return true;
        const q = normalizeText(reportSearchQuery);
        return normalizeText(item.nome).includes(q) || normalizeText(item.mainItemsStr).includes(q);
      });
  }, [fornecedores, filteredMovimentacoes, reportSearchQuery]);

  // Report 5: Auditoria de Saldo (Self)
  const auditoriaSaldoData = useMemo(() => {
    return equipes
      .filter(eq => selectedEquipe === 'Tudo' || eq.nome === selectedEquipe)
      .map(eq => {
        const teamWiths = filteredMovimentacoes.filter(m => {
          if (m.tipo !== 'Retirada') return false;
          const mat = materiais.find(x => x.id === m.materialId);
          return mat?.equipe === eq.nome || m.equipe === eq.nome;
        });

        const totalConsumido = teamWiths.reduce((acc, m) => acc + (Number(m.quantidade) || 0) * (Number(m.precoUnitario) || 0), 0);
        const verba = Number(eq.verbaDestinada) || 0;
        const saldoLiquido = Math.max(0, verba - totalConsumido);
        const percent = verba > 0 ? (totalConsumido / verba) * 100 : 0;

        return {
          equipe: eq.nome,
          gestor: eq.gestor,
          verbaDestinada: verba,
          totalConsumido,
          saldoLiquido,
          percent
        };
      })
      .filter(item => {
        if (!reportSearchQuery) return true;
        const q = normalizeText(reportSearchQuery);
        return normalizeText(item.equipe).includes(q) || normalizeText(item.gestor).includes(q);
      });
  }, [equipes, filteredMovimentacoes, materiais, reportSearchQuery, selectedEquipe]);

  // Download specific active report to CSV
  const handleExportSelectedReport = () => {
    if (!selectedReport) return;
    let csvContent = '\uFEFF'; // UTF-8 BOM
    let filename = `PPM_${selectedReport}_Export_${new Date().toISOString().split('T')[0]}.csv`;

    if (selectedReport === 'inventario_geral') {
      const headers = ['COD SAP', 'Descricao', 'Equipe Area', 'Unidade', 'Preco Unitario (R$)', 'Estoque Minimo', 'Estoque Ideal', 'Estoque Atual', 'Valor Total (R$)'];
      csvContent += headers.join(';') + '\n';
      inventarioData.forEach(row => {
        csvContent += [row.sap, row.descricao, row.equipe, row.unidade, row.precoUnitario, row.estoqueMinimo, row.estoqueIdeal, row.estoqueAtual, row.valorTotal].map(cell => `"${cell}"`).join(';') + '\n';
      });
    } else if (selectedReport === 'movimentacao_equipe') {
      const headers = ['Equipe', 'Centro de Custo', 'Gestor', 'Qtd Entradas', 'Valor Entradas (R$)', 'Qtd Retiradas', 'Valor Retiradas (R$)', 'Saldo Liquido (R$)'];
      csvContent += headers.join(';') + '\n';
      equipeMovData.forEach(row => {
        csvContent += [row.equipe, row.centroCusto, row.gestor, row.qtdEntrada, row.valEntrada, row.qtdRetirada, row.valRetirada, row.saldo].map(cell => `"${cell}"`).join(';') + '\n';
      });
    } else if (selectedReport === 'curva_abc_materiais') {
      const headers = ['COD SAP', 'Descricao', 'Quantidade Retirada', 'Valor Retirado (R$)', 'Coparticipacao (%)', 'Percentual Acumulado (%)', 'Classe ABC'];
      csvContent += headers.join(';') + '\n';
      curvaABCData.forEach(row => {
        csvContent += [row.sap, row.desc, row.qtdTotal, row.valTotal, row.percentage.toFixed(2), row.cumulativePercentage.toFixed(2), row.classe].map(cell => `"${cell}"`).join(';') + '\n';
      });
    } else if (selectedReport === 'performance_fornecedores') {
      const headers = ['Fornecedor', 'N de Entradas', 'Volume de Pecas', 'Valor Total Fornecido (R$)', 'Media Preco/Peca (R$)', 'Principais Materiais'];
      csvContent += headers.join(';') + '\n';
      fornecedorPerformanceData.forEach(row => {
        csvContent += [row.nome, row.entries, row.volume, row.val, row.media, row.mainItemsStr].map(cell => `"${cell}"`).join(';') + '\n';
      });
    } else if (selectedReport === 'auditoria_saldo') {
      const headers = ['Equipe', 'Gestor', 'Verba Destinada (R$)', 'Total Consumido (R$)', 'Saldo Liquido (R$)', 'Uso (%)'];
      csvContent += headers.join(';') + '\n';
      auditoriaSaldoData.forEach(row => {
        csvContent += [row.equipe, row.gestor, row.verbaDestinada, row.totalConsumido, row.saldoLiquido, row.percent.toFixed(2)].map(cell => `"${cell}"`).join(';') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedReportName = useMemo(() => {
    switch (selectedReport) {
      case 'inventario_geral': return 'Inventário Geral';
      case 'movimentacao_equipe': return 'Movimentação por Equipe';
      case 'curva_abc_materiais': return 'Curva ABC de Materiais';
      case 'performance_fornecedores': return 'Performance de Fornecedores';
      case 'auditoria_saldo': return 'Auditoria de Saldo (Self)';
      default: return '';
    }
  }, [selectedReport]);

  return (
    <div className="view-container !p-0 overflow-hidden bg-brand-light">
      <div className="scroll-container p-5 space-y-6 scroll-smooth">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Centro de Relatórios e BI</h2>
          <p className="text-xs text-slate-400 font-medium">Gere relatórios, filtre e exporte dados para planilhas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center justify-center gap-2 cursor-pointer transition-all ${showFilters ? 'bg-slate-200 border-slate-300' : ''}`}
          >
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filtros</span>
            {hasActiveFilters && (
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse"></span>
            )}
          </button>

          <button 
            onClick={handleExportGeral}
            className="btn-primary flex items-center justify-center gap-2 cursor-pointer bg-brand-dark hover:bg-brand-dark/95 text-white shadow-md shadow-brand-dark/20"
          >
            <Download className="w-4 h-4 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Exportar Geral (XLS)</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="card border-dashed ring-2 ring-slate-100 bg-slate-50/50 space-y-4 p-5 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-brand-dark/10 pb-2">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Filtros Avançados</h4>
            {hasActiveFilters && (
              <button 
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Início do Período</label>
              <input 
                type="date" 
                className="p-1 px-2 border border-brand-dark/20 rounded-lg text-xs font-medium text-slate-700 bg-white w-full shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fim do Período</label>
              <input 
                type="date" 
                className="p-1 px-2 border border-brand-dark/20 rounded-lg text-xs font-medium text-slate-700 bg-white w-full shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe/Área Técnica</label>
              <select
                className="p-1 px-2 border border-brand-dark/20 rounded-lg text-xs font-semibold text-slate-700 bg-white w-full shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                value={selectedEquipe}
                onChange={(e) => setSelectedEquipe(e.target.value)}
              >
                <option value="Tudo">Todas as Equipes</option>
                {equipes.map(eq => (
                  <option key={eq.id || eq.nome} value={eq.nome}>{eq.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Tipo de Movimentação</label>
              <select
                className="p-1 px-2 border border-brand-dark/20 rounded-lg text-xs font-semibold text-slate-700 bg-white w-full shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
              >
                <option value="Tudo">Ambos (Entrada/Retirada)</option>
                <option value="Entrada">Somente Entradas</option>
                <option value="Retirada">Somente Retiradas</option>
              </select>
            </div>
          </div>
          
          <div className="flex bg-slate-100/60 p-2.5 rounded-lg items-center gap-2 border border-brand-dark/20/50 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Filtro ativo: {filteredMovimentacoes.length} movimentações no período selecionado.</span>
          </div>
        </div>
      )}

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column / Dynamic Report Views or Analytics Charts */}
        <div className="lg:col-span-2 space-y-6 order-last lg:order-first">
          
          {/* Main Visual Panels when no specific report is opened */}
          {!selectedReport ? (
            <>
              {/* Auto-Rotating Team Investment Timeline Card (Exibido acima por solicitação do usuário) */}
              <div className="card shadow-sm border border-brand-dark/10 relative overflow-hidden bg-white">
                {/* Inline CSS animation for the progress bar */}
                <style>{`
                  @keyframes teamProgress {
                    from { width: 0%; }
                    to { width: 100%; }
                  }
                  .animate-team-progress {
                    animation: teamProgress 10000ms linear;
                  }
                `}</style>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <div className="flex items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Entradas e Investimento por Equipe
                      </span>
                    </div>
                    <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider mt-1.5 flex items-center gap-2">
                      <span>Linha do Tempo:</span>
                      <span className="text-emerald-600 font-extrabold underline decoration-emerald-200 decoration-2 underline-offset-4 animate-in fade-in duration-300">
                        {activeRotatingTeam?.nome || 'Nenhuma'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase">
                      Total Investido: <span className="text-slate-700 font-black whitespace-nowrap">R$ {activeTeamTotalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>

                  {/* Autoplay play/pause controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setIsAutoplay(!isAutoplay)}
                      className={`p-1.5 px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        isAutoplay 
                          ? 'bg-slate-50 hover:bg-slate-100 border-brand-dark/20 text-slate-600' 
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-bold shadow-sm'
                      }`}
                      title={isAutoplay ? "Pausar rotação automática" : "Iniciar rotação automática (10s)"}
                    >
                      {isAutoplay ? (
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider">
                          <Pause className="w-3 h-3 text-slate-600" />
                          <span>Pausar</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider">
                          <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>Iniciar</span>
                        </div>
                      )}
                    </button>
                    {isAutoplay && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Horizontal row of interactive team selectors */}
                <div className="bg-slate-50/60 p-2.5 rounded-xl border border-brand-dark/10/80 mb-5">
                  <span className="text-[9px] uppercase font-bold text-slate-400 mb-2 block tracking-wider">Selecione para fixar no gráfico:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                    {equipes.map((eq, idx) => {
                      const isSelected = idx === (activeTeamIndex % equipes.length);
                      return (
                        <button
                          key={eq.id || eq.nome}
                          onClick={() => {
                            setActiveTeamIndex(idx);
                            setIsAutoplay(false); // Pause automatic rotation when selecting manually
                          }}
                          className={`px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 scale-105 font-black'
                              : 'bg-white hover:bg-slate-100/80 text-slate-500 border border-brand-dark/20/60'
                          }`}
                        >
                          {eq.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline AreaChart */}
                <div className="h-56 sm:h-64 md:h-72 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teamInvestmentTimeline} margin={{ left: 30, right: 40, top: 50, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="monthName" 
                        padding={{ left: 20, right: 20 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 600 }} 
                      />
                      <YAxis 
                        width={50} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 600 }} 
                        tickFormatter={(value: any) => {
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                          return Number(value).toLocaleString('pt-BR');
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#fff', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Investido']}
                        labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalVal" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorInvest)" 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6 }}
                      >
                        <LabelList 
                          dataKey="totalVal" 
                          position="top" 
                          offset={20} 
                          formatter={(value: any) => {
                            const num = Number(value) || 0;
                            if (num === 0) return '';
                            return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          }}
                          fill="#1e293b"
                          fontSize={8}
                          fontWeight={800}
                        />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Animated progress line indicator */}
                {isAutoplay && (
                  <div className="w-full bg-slate-50 h-1 absolute bottom-0 left-0 overflow-hidden">
                    <div 
                      key={activeTeamIndex} 
                      className="h-full bg-emerald-500 animate-team-progress"
                    ></div>
                  </div>
                )}
              </div>

              {/* Dynamic Chart card (Exibido abaixo por solicitação do usuário) */}
              <div className="card shadow-sm border border-brand-dark/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Consumo vs. Abastecimento (Fluxo Dinâmico)</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Valores totais agregados por mês nas movimentações selecionadas</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Altas/Consumo</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Entradas</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#fff', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]}
                      />
                      <Bar name="Consumos" dataKey="consumption" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar name="Entradas" dataKey="entries" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            
            /* DYNAMIC SELECTED TABLE EXCHANGER */
            <div className="card shadow-lg border border-brand-dark/20/60 p-5 space-y-4 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-dark/10 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{selectedReportName}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Gerado a partir do Banco de Dados Ativo
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportSelectedReport}
                    className="p-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-100"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />Exportar XLS
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedReport(null);
                      setReportSearchQuery('');
                    }}
                    className="p-1.5 px-2.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4 text-slate-400" />Fechar Relatório
                  </button>
                </div>
              </div>

              {/* Internal Report Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder={`Pesquisar dados neste relatório...`}
                  className="p-2 pl-9 border border-brand-dark/20 rounded-xl text-xs font-semibold text-slate-700 bg-white w-full focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all placeholder:text-slate-400"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                />
                {reportSearchQuery && (
                  <button 
                    onClick={() => setReportSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-xs font-bold p-1 rounded-full cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* --- TABULAR DATA RENDERING ACCORDING TO USER REPORT SELECTION --- */}
              <div className="overflow-x-auto rounded-xl border border-brand-dark/10 max-h-[500px]">
                
                {selectedReport === 'inventario_geral' && (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">COD SAP</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Descrição Material</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Área / Equipe</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Unid</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Preço Unitário</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Estoque Atual</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor em Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs">
                      {inventarioData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 font-bold uppercase tracking-wider">
                            Nenhum item encontrado no estoque ativo
                          </td>
                        </tr>
                      ) : (
                        inventarioData.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => {
                              const mat = materiais.find(m => m.sap === item.sap);
                              if (mat) {
                                setDetailFilter({
                                  type: 'material',
                                  id: mat.id,
                                  title: mat.sap,
                                  subtitle: mat.descricao
                                });
                              }
                            }}
                          >
                            <td className="px-4 py-3 font-mono font-medium text-slate-500 whitespace-nowrap">{item.sap}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{item.descricao}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><span className="p-1 px-2 text-[10px] font-extrabold uppercase rounded-full bg-slate-100 text-slate-600">{item.equipe}</span></td>
                            <td className="px-4 py-3 text-center uppercase font-bold text-slate-500 whitespace-nowrap">{item.unidade}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600 whitespace-nowrap">R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">{item.estoqueAtual}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-800 whitespace-nowrap">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {selectedReport === 'movimentacao_equipe' && (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Equipe</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Centro de Custo</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Gestor Técnico</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Entradas (Qtd)</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Entradas (R$)</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Consumos (Qtd)</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Consumos (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs">
                      {equipeMovData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 font-bold uppercase tracking-wider">
                            Nenhum dado encontrado para as equipes
                          </td>
                        </tr>
                      ) : (
                        equipeMovData.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailFilter({
                              type: 'equipe',
                              name: item.equipe,
                              title: `Equipe: ${item.equipe}`,
                              subtitle: `Gestor: ${item.gestor}`
                            })}
                          >
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{item.equipe}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{item.centroCusto}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{item.gestor}</td>
                            <td className="px-4 py-3 text-center text-slate-600 font-medium whitespace-nowrap">{item.qtdEntrada}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold whitespace-nowrap">R$ {item.valEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-center text-slate-600 font-medium whitespace-nowrap">{item.qtdRetirada}</td>
                            <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold whitespace-nowrap">R$ {item.valRetirada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {selectedReport === 'curva_abc_materiais' && (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Grupo ABC</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">COD SAP</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Material</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Qtd Consumida</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor Consumo</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Coparticipação</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Acumulado %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                      {curvaABCData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 font-bold uppercase tracking-wider">
                            Nenhum consumo registrado ou encontrado para análise curva ABC
                          </td>
                        </tr>
                      ) : (
                        curvaABCData.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group/row"
                            onClick={() => setDetailFilter({
                              type: 'material',
                              id: item.id,
                              title: item.sap,
                              subtitle: item.desc
                            })}
                          >
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center font-black rounded-lg w-7 h-7 text-xs ${
                                item.classe === 'A' ? 'bg-red-50 text-red-600 border border-red-100' :
                                item.classe === 'B' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-slate-50 text-slate-500 border border-brand-dark/10'
                              }`}>
                                {item.classe}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-slate-500 whitespace-nowrap">{item.sap}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{item.desc}</td>
                            <td className="px-4 py-3 text-center font-medium font-mono text-slate-600 whitespace-nowrap">{item.qtdTotal}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-800 whitespace-nowrap">R$ {item.valTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-500 whitespace-nowrap">{item.percentage.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-500 whitespace-nowrap">{item.cumulativePercentage.toFixed(2)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {selectedReport === 'performance_fornecedores' && (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Fornecedor</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Nº de Entradas</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Volumes Entregues</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor total Abastecido</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Média de Preço/Peça</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Frentes/Principais Materiais</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs">
                      {fornecedorPerformanceData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-bold uppercase tracking-wider">
                            Nenhum movimento de entrada associado a fornecedores
                          </td>
                        </tr>
                      ) : (
                        fornecedorPerformanceData.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailFilter({
                              type: 'fornecedor',
                              name: item.nome,
                              title: `Fornecedor: ${item.nome}`,
                              subtitle: `Performance Global`
                            })}
                          >
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{item.nome}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">{item.entries}</td>
                            <td className="px-4 py-3 text-center font-mono font-semibold text-slate-500 whitespace-nowrap">{item.volume}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">R$ {item.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600 whitespace-nowrap">R$ {item.media.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={item.mainItemsStr}>{item.mainItemsStr}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {selectedReport === 'auditoria_saldo' && (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Equipe</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-wider">Gestor CC</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Verba Destinada</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Consumido (Retirado)</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Saldo Líquido Real</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Fase de Utilização (%)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs">
                      {auditoriaSaldoData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-bold uppercase tracking-wider">
                            Nenhum centro de custo cadastrado em verbas
                          </td>
                        </tr>
                      ) : (
                        auditoriaSaldoData.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailFilter({
                              type: 'equipe',
                              name: item.equipe,
                              title: `Equipe: ${item.equipe}`,
                              subtitle: `Auditoria de Saldo - Gestor: ${item.gestor}`
                            })}
                          >
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{item.equipe}</td>
                            <td className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{item.gestor}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500 whitespace-nowrap">R$ {item.verbaDestinada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-500 font-bold whitespace-nowrap">R$ {item.totalConsumido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold whitespace-nowrap">R$ {item.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono font-bold text-slate-600 text-[11px]">{item.percent.toFixed(1)}%</span>
                                <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className={`h-full ${item.percent > 90 ? 'bg-red-500' : item.percent > 65 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, item.percent)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

              </div>
              
            </div>
          )}

        </div>

        {/* Sidebar displaying available report templates */}
        <div className="space-y-4 order-first lg:order-last">
          <div className="card shadow-sm border border-brand-dark/10 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Relatórios Gerais e BI</h3>
            
            {[
              { id: 'inventario_geral', title: 'Inventário Geral', desc: 'Posição atual de todos os itens em estoque.' },
              { id: 'movimentacao_equipe', title: 'Movimentação por Equipe', desc: 'Detalhamento de custos e retiradas.' },
              { id: 'curva_abc_materiais', title: 'Curva ABC de Materiais', desc: 'Itens com maior giro e impacto financeiro.' },
              { id: 'performance_fornecedores', title: 'Performance de Fornecedores', desc: 'Análise de compras e fornecimento.' },
              { id: 'auditoria_saldo', title: 'Auditoria de Saldo (Self)', desc: 'Conciliação de verbas e retiradas efetuadas por equipe.' }
            ].map((report) => {
              const isActive = selectedReport === report.id;
              return (
                <div 
                  key={report.id} 
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex items-start justify-between ${
                    isActive 
                      ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-200' 
                      : 'border-brand-dark/10 bg-white hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/60'
                  }`}
                  onClick={() => {
                    setSelectedReport(isActive ? null : report.id);
                    setReportSearchQuery('');
                  }}
                >
                  <div className="space-y-1">
                    <h4 className={`text-[12px] font-black uppercase tracking-wider transition-colors ${
                      isActive ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-700'
                    }`}>
                      {report.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                      {report.desc}
                    </p>
                  </div>
                  <FileText className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-400'
                  }`} />
                </div>
              )
            })}
          </div>

          {/* Quick instructions widget card */}
          <div className="bg-slate-50/60 border border-brand-dark/10 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Award className="w-5 h-5 text-brand-accent flex-shrink-0" />
              <h5 className="text-xs font-black uppercase tracking-wider">Como utilizar os relatórios</h5>
            </div>
            <ul className="text-[11px] text-slate-400 font-semibold space-y-2 uppercase leading-relaxed">
              <li className="flex gap-2">
                <span className="text-brand-accent">✦</span>
                <span>Filtre as datas no topo para segregar períodos de faturamento específicos.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-accent">✦</span>
                <span>Selecione uma categoria técnica para reduzir o escopo às equipes desejadas.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-accent">✦</span>
                <span>Clique em um dos 5 relatórios e use a barra de pesquisa para buscar termos em tempo real.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-accent">✦</span>
                <span>Exporte qualquer versão gerada contendo cabeçalhos compatíveis com Excel (formato CSV/XLS).</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
      {/* Details Modal */}
      {detailFilter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailFilter(null)}></div>
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-dark/10 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Movimentações</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{detailFilter.title}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">• {detailFilter.subtitle}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setDetailFilter(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Data/Hora</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Material / COD SAP</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Qtd</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">P. Unit.</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Colaborador / Equipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimentacoes
                    .filter(mov => {
                      if (detailFilter.type === 'material') {
                        return mov.materialId === detailFilter.id || materiais.find(m => m.id === detailFilter.id)?.sap === mov.materialId;
                      }
                      if (detailFilter.type === 'equipe') {
                        const mat = materiais.find(m => m.sap === mov.materialId || m.id === mov.materialId);
                        return mov.equipe === detailFilter.name || mat?.equipe === detailFilter.name;
                      }
                      if (detailFilter.type === 'fornecedor') {
                        return mov.fornecedor === detailFilter.name;
                      }
                      return false;
                    })
                    .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())
                    .map((mov) => {
                      const total = (Number(mov.quantidade) || 0) * (Number(mov.precoUnitario) || 0);
                      const mat = materiais.find(m => m.sap === mov.materialId || m.id === mov.materialId);
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                            {mov.data ? new Date(mov.data).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                              mov.tipo === 'Entrada' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{mat?.descricao || mov.materialDesc || '-'}</span>
                              <span className="text-[10px] font-mono text-slate-400">{mat?.sap || mov.materialId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-xs font-bold text-slate-700">
                            {mov.quantidade}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-xs font-mono text-slate-500">
                            R$ {(Number(mov.precoUnitario) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-xs font-mono font-bold text-slate-800">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{mov.colaborador || '-'}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{mov.equipe || mat?.equipe || '-'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {movimentacoes.filter(mov => {
                if (detailFilter.type === 'material') {
                  return mov.materialId === detailFilter.id || materiais.find(m => m.id === detailFilter.id)?.sap === mov.materialId;
                }
                if (detailFilter.type === 'equipe') {
                  const mat = materiais.find(m => m.sap === mov.materialId || m.id === mov.materialId);
                  return mov.equipe === detailFilter.name || mat?.equipe === detailFilter.name;
                }
                if (detailFilter.type === 'fornecedor') {
                  return mov.fornecedor === detailFilter.name;
                }
                return false;
              }).length === 0 && (
                <div className="py-20 text-center">
                  <Info className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Nenhuma movimentação histórica encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
