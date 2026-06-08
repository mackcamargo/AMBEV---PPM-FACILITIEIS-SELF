import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../lib/store';
import { Material, Equipe, AtaReuniao, Movimentacao, formatUnit } from '../types';
import { Save, AlertCircle, ShoppingCart, Plus, Trash2, Download, Mail, Share2 } from 'lucide-react';

export const SelfMeeting: React.FC = () => {
  const { materiais, equipes, setEquipes, setAtas, addMovimentacao, colaboradores, updateMaterial } = useApp();
  
  // Local state for shopping list items: { materialId: quantity }
  const [compras, setCompras] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('selfMeeting_compras');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedTeam, setSelectedTeam] = useState<string | null>(() => {
    return localStorage.getItem('selfMeeting_selectedTeam');
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [externalSearchTerm, setExternalSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ZERADO' | 'CRITICO' | 'OK'>('TODOS');

  // Inline editing for Min/Ideal values
  const [editingStock, setEditingStock] = useState<{ id: string, field: 'min' | 'ideal' | 'atual', value: string } | null>(null);
  
  // New Timer State
  const [elapsed, setElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selfMeeting_compras', JSON.stringify(compras));
  }, [compras]);

  useEffect(() => {
    if (selectedTeam) {
      localStorage.setItem('selfMeeting_selectedTeam', selectedTeam);
    } else {
      localStorage.removeItem('selfMeeting_selectedTeam');
    }
  }, [selectedTeam]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTeam, setShareTeam] = useState<string>('Todas');
  const [showConfirmNewMeeting, setShowConfirmNewMeeting] = useState(false);
  const [clearOnShareClose, setClearOnShareClose] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll position to top when selected team changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [selectedTeam]);
  
  // Materials list for the table
  const tableData = materiais
    .filter(m => !selectedTeam || m.equipe === selectedTeam)
    .filter(m => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        m.sap.toLowerCase().includes(search) ||
        m.descricao.toLowerCase().includes(search) ||
        m.equipe.toLowerCase().includes(search) ||
        (m.codigoFornecedor || '').toLowerCase().includes(search) ||
        (m.localizacao || '').toLowerCase().includes(search) ||
        (m.detalhes || '').toLowerCase().includes(search)
      );

      const isZerado = m.estoqueAtual === 0;
      const isCritico = m.estoqueAtual < m.estoqueMinimo && m.estoqueAtual > 0;
      const isOk = m.estoqueAtual > 0 && m.estoqueAtual >= m.estoqueMinimo;

      const matchesStatus = 
        filterStatus === 'TODOS' || 
        (filterStatus === 'ZERADO' && isZerado) || 
        (filterStatus === 'CRITICO' && isCritico) ||
        (filterStatus === 'OK' && isOk);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''))
    .map(m => ({
      ...m,
      status: m.estoqueAtual === 0 ? 'Zerado' : m.estoqueAtual < m.estoqueMinimo ? 'Crítico' : 'OK',
      qtdComprar: compras[m.id] || 0,
      subtotal: (compras[m.id] || 0) * m.precoUnitario
    }));

  // Calculate totals per team based on all materials in compras (unfiltered)
  const impactPerTeam = useMemo(() => {
    const impacts: Record<string, number> = {};
    equipes.forEach(e => {
      impacts[e.nome] = 0;
    });
    
    materiais.forEach(m => {
      const q = compras[m.id] || 0;
      if (q > 0) {
        const subtotal = q * m.precoUnitario;
        const currentImpact = impacts[m.equipe] || 0;
        impacts[m.equipe] = currentImpact + subtotal;
      }
    });
    
    return impacts;
  }, [compras, materiais, equipes]);

  const totalGeral = Object.values(impactPerTeam).reduce((a, b) => (a as number) + (b as number), 0) as number;
  const totalSaldoEquipes = useMemo(() => equipes.reduce((acc, e) => acc + e.saldoAtualizado, 0), [equipes]);
  const totalExibido = selectedTeam ? (impactPerTeam[selectedTeam] || 0) : totalGeral;

  const handleUpdateQtd = (id: string, val: string) => {
    const q = Math.max(0, parseInt(val) || 0);
    setCompras(prev => ({ ...prev, [id]: q }));
  };

  const handleNovaReuniaoClick = () => {
    const hasItems = Object.values(compras).some(q => (q as number) > 0);
    if (hasItems) {
      setShowConfirmNewMeeting(true);
    } else {
      setCompras({});
      setSelectedTeam(null);
      setElapsed(0);
      setIsTimerRunning(true); // Start timer on new meeting
    }
  };

  const handleDiscardAndNewMeeting = () => {
    setCompras({});
    setSelectedTeam(null);
    setShowConfirmNewMeeting(false);
  };

  const handleSaveAndNewMeeting = () => {
    setClearOnShareClose(true);
    handleSaveReuniao();
    setShowConfirmNewMeeting(false);
  };

  const handleSaveReuniao = () => {
    // Create Ata
    const novaAta: AtaReuniao = {
      id: Math.random().toString(36).substr(2, 9),
      data: new Date().toISOString(),
      descricao: 'Ata de Reunião de Self Service - ' + new Date().toLocaleDateString(),
      orçamentosSnapshot: equipes.map(e => {
        const impact = impactPerTeam[e.nome] || 0;
        const isOverspent = impact > e.saldoAtualizado;
        return {
          equipe: e.nome,
          saldoAnterior: e.saldoAtualizado,
          saldoNovo: e.saldoAtualizado - impact,
          estouro: isOverspent ? impact - e.saldoAtualizado : 0
        };
      }),
      itensComprados: Object.entries(compras)
        .filter(([_, q]) => (q as number) > 0)
        .map(([id, q]) => ({
          materialId: id,
          quantidade: q as number,
          custoTotal: (q as number) * (materiais.find(m => m.id === id)?.precoUnitario || 0)
        }))
    };

    setAtas(prev => [novaAta, ...prev]);

    setShowShareModal(true);
  };

  const shareViaWhatsApp = () => {
    const text = generateShareMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Solicitação de Orçamento - ${new Date().toLocaleDateString()}`;
    const text = generateShareMessage();
    const formattedBody = text.replace(/\n/g, '\r\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
  };

  const handleGlobalShare = async () => {
    const subject = `Solicitação de Orçamento - ${new Date().toLocaleDateString()}`;
    const text = generateShareMessage();
    
    const shareData = {
      title: subject,
      text: text
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        shareViaEmail();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      shareViaEmail();
    }
  };

  const handleWebShare = async () => {
    const text = generateShareMessage();
    const shareData = {
      title: 'Solicitação de Orçamento',
      text: text,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        alert('Resumo copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const generateShareMessage = () => {
    const items = Object.entries(compras)
      .filter(([id, q]) => {
        const isSelected = (q as number) > 0;
        if (!isSelected) return false;
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === id);
        return m?.equipe === shareTeam;
      })
      .map(([id, q]) => {
        const m = materiais.find(mat => mat.id === id);
        return `• ${m?.descricao}\n  - COD SAP: ${m?.sap}\n  - Qtd: ${q} ${formatUnit(m?.unidade)}`;
      });
    
    const teamLabel = shareTeam === 'Todas' ? 'todas as equipes' : `a equipe ${shareTeam}`;
    return `Olá,\n\nGostaria de solicitar um orçamento para os materiais referentes à ${teamLabel}:\n\n${items.length > 0 ? items.join('\n\n') : 'Nenhum material selecionado para esta equipe.'}\n\nFico no aguardo do retorno.\nAtenciosamente.`;
  };

  const downloadSpreadsheet = () => {
    const items = Object.entries(compras)
      .filter(([id, q]) => {
        const isSelected = (q as number) > 0;
        if (!isSelected) return false;
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === id);
        return m?.equipe === shareTeam;
      })
      .map(([id, q]) => {
        const m = materiais.find(mat => mat.id === id);
        return {
          COD_SAP: m?.sap,
          Descricao: m?.descricao,
          Quantidade: q,
          Unidade: formatUnit(m?.unidade),
          PrecoUnit: m?.precoUnitario,
          Subtotal: (q as number) * (m?.precoUnitario || 0)
        };
      });

    const headers = ['COD SAP', 'Descrição', 'Quantidade', 'Unidade', 'Preço Unit.', 'Subtotal'];
    const csvRows = [
      headers.join(';'),
      ...items.flatMap(row => [
        [
          row.COD_SAP,
          `"${row.Descricao}"`,
          row.Quantidade,
          row.Unidade,
          row.PrecoUnit?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          row.Subtotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        ].join(';'),
        '' // Pula uma linha entre registros
      ])
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Orcamento_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    if (clearOnShareClose) {
      setCompras({});
      setSelectedTeam(null);
      setClearOnShareClose(false);
    }
  };

  const onButtonKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    const item = tableData[index];
    if (!item) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (item.qtdComprar === 0) {
        const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
        handleUpdateQtd(id, needed.toString());
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleUpdateQtd(id, '0');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextItem = tableData[index + 1];
      if (nextItem) {
        buttonRefs.current[nextItem.id]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevItem = tableData[index - 1];
      if (prevItem) {
        buttonRefs.current[prevItem.id]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Ensure it's marked as SIM (autofill) if it's currently at 0
      if (item.qtdComprar === 0) {
        const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
        handleUpdateQtd(id, needed.toString());
      }
      
      setTimeout(() => {
        const input = inputRefs.current[id];
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextItem = tableData[index + 1];
      if (nextItem) {
        buttonRefs.current[nextItem.id]?.focus();
      }
    }
  };

  const isInvalid = equipes.some(e => (e.saldoAtualizado - (impactPerTeam[e.nome] || 0)) < 0);

  const handleOuterClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Keep filter selected if clicking on the materials table or typing quantity
    const clickedTeamCard = target.closest('.card-equipe');
    const isFilterStatusClick = target.closest('.status-filter-chip');
    if (!clickedTeamCard && !isFilterStatusClick && !target.closest('button') && !target.closest('input') && !target.closest('table')) {
      setSelectedTeam(null);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden p-5" onClick={handleOuterClick}>
        {/* Fixed Header Content (Sticky) */}
        <div className="bg-slate-50 shrink-0 z-20 pb-1 space-y-4">
          {/* Budget Grid */}
          <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pb-2 sm:pb-0 shrink-0 snap-x scrollbar-hide">
            {/* Todas as Equipes Card */}
            <div 
              onClick={() => setSelectedTeam(null)}
              className={`card card-equipe border-l-4 cursor-pointer transition-all hover:shadow-md shrink-0 snap-start w-[240px] sm:w-auto ${selectedTeam === null ? 'ring-2 ring-slate-800 ring-offset-2 bg-slate-50/50' : 'bg-white'}`} 
              style={{ borderLeftColor: '#475569' }}
            >
              <div className="flex justify-between items-center bg-transparent">
                <p className="text-[10px] font-extrabold text-black uppercase tracking-wider">Todas as Equipes</p>
                {selectedTeam === null && <div className="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse" />}
              </div>
              <div className="mt-1">
                <p className="text-[9px] text-slate-500 uppercase">Verba Inicial</p>
                <p className="text-sm font-bold text-slate-800">R$ {totalSaldoEquipes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="mt-2">
                <p className="text-[9px] text-slate-500 uppercase">Gasto Previsto</p>
                <p className={`text-sm font-semibold ${totalGeral > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                   R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {/* Barra de progresso geral */}
                <div className="w-full h-1.5 bg-slate-100/80 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${(totalSaldoEquipes - totalGeral) < 0 ? 'bg-red-500' : ((totalGeral / (totalSaldoEquipes || 1)) >= 0.8 ? 'bg-orange-500' : 'bg-emerald-500')}`}
                    style={{ 
                      width: `${totalGeral > 0 ? Math.max(12, Math.min(100, (totalGeral / (totalSaldoEquipes || 1)) * 100)) : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {equipes.map(e => {
              const impact = impactPerTeam[e.nome] || 0;
              const novoSaldo = e.saldoAtualizado - impact;
              const isNegative = novoSaldo < 0;
              const isSelected = selectedTeam === e.nome;

              return (
                <div 
                  key={e.id} 
                  onClick={() => setSelectedTeam(isSelected ? null : e.nome)}
                  className={`card card-equipe border-l-4 cursor-pointer transition-all hover:shadow-md shrink-0 snap-start w-[240px] sm:w-auto ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} 
                  style={{ borderLeftColor: e.cor }}
                >
                  <div className="flex justify-between items-center bg-transparent">
                    <p className="text-[9px] font-extrabold text-black uppercase tracking-wider">{e.nome}</p>
                    {e.nome === 'Pintura' && isTimerRunning && (
                      <div className="text-[9px] text-emerald-600 font-extrabold animate-pulse">
                        {formatTime(elapsed)}
                      </div>
                    )}
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                  <div className="mt-1 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Verba Inicial</p>
                      <p className="text-[11px] font-bold text-slate-700">R$ {e.verbaDestinada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Saldo</p>
                      <p className={`text-[11px] font-black ${e.saldoAtualizado < 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {e.saldoAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Gasto Previsto</p>
                    <p className={`text-xs font-semibold ${impact > 0 ? 'text-blue-600 font-black' : 'text-slate-400 font-medium'}`}>
                       R$ {impact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {/* Barra de progresso do gasto */}
                    <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500 rounded-full"
                        style={{ 
                          width: `${impact > 0 ? Math.max(12, Math.min(100, (impact / (e.saldoAtualizado || 1)) * 100)) : 0}%`,
                          backgroundColor: isNegative ? '#EF4444' : ((impact / (e.saldoAtualizado || 1)) >= 0.8 ? '#F97316' : '#10B981')
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Header com pesquisa e botôes */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-2">
              <div className="flex flex-col gap-2 flex-1 max-w-xs">
                {/* Primeiro campo: busca interna */}
                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="w-3 h-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Pesquisar material, COD SAP..."
                      className="w-full pl-8 pr-4 py-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/10 rounded-lg text-[9px] font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium transition-all h-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                </div>

                {/* Segundo campo: Busca Externa */}
                <div className="relative group w-full">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (externalSearchTerm.trim()) {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(externalSearchTerm)}`, '_blank');
                      }
                    }}
                    className="relative group w-full h-8"
                  >
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <svg className="w-3 h-3 text-emerald-600 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Busca Externa: Pesquisar no Google..."
                        className="w-full pl-8 pr-16 py-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10 rounded-lg text-[9px] font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium transition-all h-8"
                        value={externalSearchTerm}
                        onChange={(e) => setExternalSearchTerm(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                        {externalSearchTerm && (
                          <button 
                            type="button"
                            onClick={() => setExternalSearchTerm('')}
                            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <button 
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[8px] font-black uppercase tracking-wider px-2 py-0.5 transition-all h-6 flex items-center justify-center cursor-pointer select-none active:scale-95"
                        >
                          Ir
                        </button>
                      </div>
                  </form>
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setFilterStatus('TODOS')}
                  className={`status-filter-chip px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all ${filterStatus === 'TODOS' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Todos
                </button>
                <div className="w-px h-2.5 bg-slate-200 mx-0.5" />
                <button 
                  onClick={() => setFilterStatus('ZERADO')}
                  className={`status-filter-chip px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'ZERADO' ? 'bg-white shadow-sm text-red-600 border border-red-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'ZERADO' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                  Zerados
                </button>
                <div className="w-px h-2.5 bg-slate-200 mx-0.5" />
                <button 
                  onClick={() => setFilterStatus('CRITICO')}
                  className={`status-filter-chip px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'CRITICO' ? 'bg-white shadow-sm text-amber-600 border border-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'CRITICO' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                  Estoque Baixo
                </button>
                <div className="w-px h-2.5 bg-slate-200 mx-0.5" />
                <button 
                  onClick={() => setFilterStatus('OK')}
                  className={`status-filter-chip px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'OK' ? 'bg-white shadow-sm text-emerald-600 border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${filterStatus === 'OK' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  Estoque OK
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  {/* Limpar Lista */}
                  <button 
                    onClick={() => setShowConfirmClear(true)}
                    disabled={totalGeral === 0}
                    className="flex-1 md:flex-none px-3 py-1.5 border border-emerald-600 hover:bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Lista</span>
                  </button>

                  <button 
                    onClick={handleNovaReuniaoClick}
                    className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Reunião</span>
                  </button>

                  <button 
                    onClick={handleSaveReuniao}
                    disabled={totalGeral === 0}
                    className="flex-1 md:flex-none px-3 py-1.5 bg-slate-900 hover:bg-black text-white border border-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Reunião</span>
                  </button>
                </div>
            </div>
          </div>
        </div>

        {/* Divisor Visual Sutil */}
        <div className="w-full h-0.5 bg-slate-100 animate-pulse my-4" />

        {/* Decision Table */}
        <div className="card !p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-slate-50/30">
            <h3 className="text-[11px] font-black text-black uppercase tracking-widest flex items-center gap-2">
              <div className={`w-1.5 h-4 rounded-full ${selectedTeam ? 'bg-blue-600' : 'bg-slate-800'}`} />
              Área de Decisão de Compras {selectedTeam ? ` - ${selectedTeam}` : ' - Todas as Equipes'}
            </h3>
            <div className="flex items-center gap-4">
               <div className="text-right shrink-0">
                  <p className="text-[9px] text-slate-400 uppercase font-black leading-none mb-0.5">
                    {selectedTeam ? `Pedido (${selectedTeam})` : 'Pedido (Todas)'}
                  </p>
                  <p className={`text-xl font-black tabular-nums transition-colors animate-pulse ${isInvalid ? 'text-red-600' : 'text-blue-600'}`}>
                    R$ {totalExibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
            </div>
          </div>

          {isInvalid && (
            <div className="bg-red-50 p-3 flex items-center gap-3 border-b border-red-100 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-[11px] text-red-600 font-medium">Orçamento estourado em uma ou mais equipes. A reunião pode ser salva, mas o saldo ficará negativo.</p>
            </div>
          )}

          {/* Área de Decisão de Compras */}
          <div ref={tableContainerRef} className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
                <tr className="bg-slate-50">
                  <th className="table-header">COD SAP</th>
                  <th className="table-header">Cód. Forn.</th>
                  <th className="table-header">Material</th>
                  <th className="table-header">Local</th>
                  <th className="table-header">Estoque</th>
                  <th className="table-header">Mín/Ideal</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Comprar?</th>
                  <th className="table-header text-right">Preço Un.</th>
                  <th className="table-header w-24">Qtd Comprar</th>
                  <th className="table-header text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                      Nenhum material encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
                {tableData.map((item, index) => (
                  <tr key={item.id} className="table-row">
                    <td className="px-2 py-1.5 font-mono text-slate-500 text-[9px]">{item.sap}</td>
                    <td className="px-2 py-1.5 font-mono text-[8px] text-slate-400">{item.codigoFornecedor || '-'}</td>
                    <td className="px-2 py-1.5">
                      <p className="font-bold text-slate-800 text-[10px] leading-tight">{item.descricao}</p>
                      <div className="flex gap-1.5 items-center">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{item.equipe}</p>
                        {item.ultimaMovimentacao && (
                          <p className="text-[7.5px] text-slate-300 font-normal">| {item.ultimaMovimentacao}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{item.localizacao || '-'}</td>
                    <td className="px-2 py-1.5 text-[9px] text-slate-600 font-medium">
                      {editingStock?.id === item.id && editingStock?.field === 'atual' ? (
                        <input
                          autoFocus
                          className="w-10 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none"
                          value={editingStock.value}
                          onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                          onBlur={() => {
                            updateMaterial(item.id, { estoqueAtual: Number(editingStock.value) || 0 });
                            setEditingStock(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateMaterial(item.id, { estoqueAtual: Number(editingStock.value) || 0 });
                              setEditingStock(null);
                            }
                            if (e.key === 'Escape') setEditingStock(null);
                          }}
                        />
                      ) : (
                        <span 
                          onDoubleClick={() => setEditingStock({ id: item.id, field: 'atual', value: item.estoqueAtual.toString() })}
                          className="cursor-edit hover:text-blue-600 transition-colors"
                          title="Duplo clique para editar estoque atual"
                        >
                          {item.estoqueAtual} {formatUnit(item.unidade)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[8.5px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        {editingStock?.id === item.id && editingStock?.field === 'min' ? (
                          <input
                            autoFocus
                            className="w-8 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none"
                            value={editingStock.value}
                            onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                            onBlur={() => {
                              updateMaterial(item.id, { estoqueMinimo: Number(editingStock.value) || 0 });
                              setEditingStock(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateMaterial(item.id, { estoqueMinimo: Number(editingStock.value) || 0 });
                                setEditingStock(null);
                              }
                              if (e.key === 'Escape') setEditingStock(null);
                            }}
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => setEditingStock({ id: item.id, field: 'min', value: item.estoqueMinimo.toString() })}
                            className="cursor-edit hover:text-blue-600 transition-colors"
                            title="Duplo clique para editar"
                          >
                            {item.estoqueMinimo}
                          </span>
                        )}
                        <span>/</span>
                        {editingStock?.id === item.id && editingStock?.field === 'ideal' ? (
                          <input
                            autoFocus
                            className="w-8 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none"
                            value={editingStock.value}
                            onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                            onBlur={() => {
                              updateMaterial(item.id, { estoqueIdeal: Number(editingStock.value) || 0 });
                              setEditingStock(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateMaterial(item.id, { estoqueIdeal: Number(editingStock.value) || 0 });
                                setEditingStock(null);
                              }
                              if (e.key === 'Escape') setEditingStock(null);
                            }}
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => setEditingStock({ id: item.id, field: 'ideal', value: (item.estoqueIdeal || 0).toString() })}
                            className="cursor-edit hover:text-blue-600 transition-colors"
                            title="Duplo clique para editar"
                          >
                            {item.estoqueIdeal || '-'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`status-pill !text-[8.5px] !py-0 !px-1.5 !h-4 ${
                        item.status === 'Zerado' ? 'pill-crit' : 
                        item.status === 'Crítico' ? 'pill-warn' : 'pill-ok'}`}>
                        {item.status === 'OK' ? 'OK' : item.status === 'Crítico' ? 'BAIXO' : 'ZERADO'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                       <button 
                         ref={el => buttonRefs.current[item.id] = el}
                         onKeyDown={(e) => onButtonKeyDown(e, item.id, index)}
                         onClick={() => {
                           if (item.qtdComprar > 0) {
                             handleUpdateQtd(item.id, '0');
                           } else {
                             const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
                             handleUpdateQtd(item.id, needed.toString());
                           }
                         }}
                         className={`text-[9.5px] font-black h-7 px-3 rounded-full border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 touch-manipulation uppercase tracking-tighter w-14 ${
                           item.qtdComprar > 0 
                           ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                           : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                         }`}
                       >
                         {item.qtdComprar > 0 ? 'SIM' : 'NÃO'}
                       </button>
                    </td>
                    <td className="px-2 py-1.5 text-slate-500 tabular-nums text-right text-[9px] font-medium">
                      R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1.5">
                      <input 
                        ref={el => inputRefs.current[item.id] = el}
                        onKeyDown={(e) => onInputKeyDown(e, index)}
                        type="number" 
                        className={`input-field tabular-nums focus:bg-blue-50/10 h-7 px-2 text-[9px] font-bold ${item.qtdComprar > 0 ? 'bg-blue-50/30 border-blue-200' : ''}`}
                        value={item.qtdComprar || ''}
                        placeholder="0"
                        onChange={(e) => handleUpdateQtd(item.id, e.target.value)}
                        style={{ minWidth: '50px' }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-black tabular-nums text-slate-900 text-[10px]">
                      {item.subtotal > 0 ? `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 animate-custom-blink mb-1">Reunião Salva!</h3>
              <p className="text-sm text-slate-500 mt-2">Deseja compartilhar a solicitação de orçamento agora?</p>

              <div className="mt-6 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Enviar de qual equipe?</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                     onClick={() => setShareTeam('Todas')}
                     className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        shareTeam === 'Todas' 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                     }`}
                   >
                     TODAS
                   </button>
                   {equipes.map(e => (
                     <button 
                       key={e.id}
                       onClick={() => setShareTeam(e.nome)}
                       className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          shareTeam === e.nome 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                       }`}
                     >
                       {e.nome.toUpperCase()}
                     </button>
                   ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                <button 
                  onClick={handleGlobalShare}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">Compartilhar</span>
                </button>

                <button 
                  onClick={shareViaWhatsApp}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">WhatsApp</span>
                </button>
                

                <button 
                  onClick={shareViaEmail}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">E-mail</span>
                </button>
                
                <button 
                  onClick={downloadSpreadsheet}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform relative shadow-lg shadow-emerald-200">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">Planilha</span>
                </button>
              </div>

              <button 
                onClick={closeShareModal}
                className="mt-6 w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Agora não, obrigado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Save or Discard current unsaved choosing */}
      {showConfirmNewMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2">Iniciar Nova Reunião?</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                Você possui peças selecionadas nesta tela. Deseja <strong>salvar</strong> a reunião com as escolhas atuais ou prefere <strong>descartar</strong> tudo?
              </p>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={handleSaveAndNewMeeting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Iniciar Nova
                </button>
                
                <button 
                  onClick={handleDiscardAndNewMeeting}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-extrabold text-xs py-3 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Descartar Alterações
                </button>

                <button 
                  onClick={() => setShowConfirmNewMeeting(false)}
                  className="w-full mt-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer"
                >
                  Continuar Editando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear list items */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 font-sans tracking-tight">Limpar Lista de Materiais?</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                Você pode optar por apenas limpar a lista ou pode salvar a reunião antes de apagá-la.
              </p>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setClearOnShareClose(true);
                    handleSaveReuniao();
                    setShowConfirmClear(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar e Limpar
                </button>
                <button 
                  onClick={() => {
                    setCompras({});
                    setShowConfirmClear(false);
                  }}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 border border-transparent hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Sem Salvar
                </button>

                <button 
                  onClick={() => setShowConfirmClear(false)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px] py-2.5 mt-1 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
