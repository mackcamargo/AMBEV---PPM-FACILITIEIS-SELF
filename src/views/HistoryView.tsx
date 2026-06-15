import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../lib/store';
import { playNotificationSound } from '../lib/audio';
import { ColaboradorSelect } from '../components/ColaboradorSelect';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  X, 
  Info, 
  Calendar, 
  Hash, 
  User, 
  Users, 
  FileText, 
  DollarSign, 
  Building, 
  ShoppingBag, 
  MessageSquare,
  ChevronRight,
  Trash2,
  Edit3,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Share2,
  Download,
  Copy,
  FileJson,
  Check,
  Mail,
  AlertTriangle,
  BarChart2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Movimentacao, formatUnit } from '../types';

export const HistoryView: React.FC = () => {
  const { 
    movimentacoes, 
    deleteMovimentacao, 
    updateMovimentacao,
    colaboradores,
    empresas,
    fornecedores,
    materiais,
    equipes,
    deletionPassword,
    isDeletionPasswordEnabled
  } = useApp();
  
  const [selectedMov, setSelectedMov] = useState<Movimentacao | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionPasswordInput, setDeletionPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'Tudo' | 'Entrada' | 'Retirada'>('Tudo');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterTeam, setFilterTeam] = useState('Tudo');
  const [filterMaterialId, setFilterMaterialId] = useState('');
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [isEmailChoiceModalOpen, setIsEmailChoiceModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const selectedMaterial = selectedMov ? materiais.find(m => m.id === selectedMov.materialId) : null;
  
  const teams = Array.from(new Set(equipes.map(e => e.nome))).sort();
  
  // Edit Form Fields State
  const [editQty, setEditQty] = useState(0);
  const [editPrecoUnitario, setEditPrecoUnitario] = useState(0);
  const [editOs, setEditOs] = useState('');
  const [editNf, setEditNf] = useState('');
  const [editPedidoCompra, setEditPedidoCompra] = useState('');
  const [editPedidoSap, setEditPedidoSap] = useState('');
  const [editFornecedor, setEditFornecedor] = useState('');
  const [editColaborador, setEditColaborador] = useState('');
  const [editEmpresa, setEditEmpresa] = useState('');
  const [editLiberador, setEditLiberador] = useState('');
  const [editConferente, setEditConferente] = useState('');
  const [editEquipe, setEditEquipe] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  const startEdit = (m: Movimentacao) => {
    setEditQty(m.quantidade);
    setEditPrecoUnitario(m.precoUnitario || 0);
    setEditOs(m.os || '');
    setEditNf(m.nf || '');
    setEditPedidoCompra(m.pedidoCompra || '');
    setEditPedidoSap(m.pedidoSap || '');
    setEditFornecedor(m.fornecedor || '');
    setEditColaborador(m.colaborador || '');
    setEditEmpresa(m.empresa || '');
    setEditLiberador(m.liberador || '');
    setEditConferente(m.conferente || '');
    setEditEquipe(m.equipe || '');
    setEditObservacoes(m.observacoes || '');
    setIsEditing(true);
  };

  const handleClose = () => {
    setSelectedMov(null);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!selectedMov) return;
    if (editQty <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
    }

    const updatedFields: Partial<Movimentacao> = {
      quantidade: Number(editQty),
      precoUnitario: selectedMov.precoUnitario !== undefined ? Number(editPrecoUnitario) : undefined,
      os: selectedMov.tipo === 'Retirada' ? editOs : undefined,
      nf: selectedMov.tipo === 'Entrada' ? editNf : undefined,
      pedidoCompra: selectedMov.tipo === 'Entrada' ? editPedidoCompra : undefined,
      pedidoSap: selectedMov.tipo === 'Entrada' ? editPedidoSap : undefined,
      fornecedor: selectedMov.tipo === 'Entrada' ? editFornecedor : undefined,
      colaborador: selectedMov.tipo === 'Retirada' ? editColaborador : undefined,
      empresa: selectedMov.tipo === 'Retirada' ? editEmpresa : undefined,
      liberador: selectedMov.tipo === 'Retirada' ? editLiberador : undefined,
      equipe: selectedMov.tipo === 'Retirada' ? editEquipe : undefined,
      conferente: selectedMov.tipo === 'Entrada' ? editConferente : undefined,
      observacoes: editObservacoes,
    };

    updateMovimentacao(selectedMov.id, updatedFields);
    setSelectedMov({ ...selectedMov, ...updatedFields });
    setIsEditing(false);
  };

  const handleConfirmBulkDelete = () => {
    if (isDeletionPasswordEnabled && deletionPassword && deletionPasswordInput !== deletionPassword) {
      setDeleteError('Senha de exclusão inválida.');
      return;
    }
    
    selectedIds.forEach(id => deleteMovimentacao(id));
    playNotificationSound('delete');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
    setDeletionPasswordInput('');
    setDeleteError('');
  };

  const filteredMovs = movimentacoes.filter(m => {
    const mat = materiais.find(mat => mat.id === m.materialId);
    
    // Global Search
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = 
      m.materialDesc.toLowerCase().includes(searchStr) ||
      (m.os?.toLowerCase().includes(searchStr)) ||
      (m.pedidoSap?.toLowerCase().includes(searchStr)) ||
      (m.colaborador?.toLowerCase().includes(searchStr)) ||
      (mat?.sap?.toLowerCase().includes(searchStr));

    if (!matchesSearch) return false;

    // Type Filter
    if (filterType !== 'Tudo' && m.tipo !== filterType) return false;

    // Date Filter
    if (startDate) {
      const movDate = new Date(m.data).toISOString().split('T')[0];
      if (movDate < startDate) return false;
    }
    if (endDate) {
      const movDate = new Date(m.data).toISOString().split('T')[0];
      if (movDate > endDate) return false;
    }

    // Team Filter
    if (filterTeam !== 'Tudo') {
      if (m.equipe !== filterTeam) return false;
    }

    // Material Filter
    if (filterMaterialId && m.materialId !== filterMaterialId) return false;

    return true;
  });

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Material', 'Quantidade', 'Valor Total', 'Responsável', 'Equipe', 'OS', 'NF'];
    const csvHeaders = headers.map(h => `"${h}"`).join(';');
    
    const rows = filteredMovs.map(m => [
      new Date(m.data).toLocaleString('pt-BR'),
      m.tipo,
      m.materialDesc,
      m.quantidade.toString(),
      (m.quantidade * (m.precoUnitario || 0)).toFixed(2).replace('.', ','),
      m.colaborador || m.conferente || '',
      m.equipe || '',
      m.os || '',
      m.nf || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    
    const csvContent = [csvHeaders, ...rows].join("\r\n");
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowSharePopup(false);
  };

  const shareViaEmailChoice = (e: React.MouseEvent, provider: 'gmail' | 'outlook') => {
    e.stopPropagation();
    const subject = `Relatório de Movimentações - ${new Date().toLocaleDateString()}`;
    let body = filteredMovs.map(m => 
      `${new Date(m.data).toLocaleDateString()} - ${m.tipo}: ${m.quantidade}x ${m.materialDesc} (R$ ${(m.quantidade * (m.precoUnitario || 0)).toFixed(2)})`
    ).join('\r\n\r\n');
    
    // Truncate to avoid 404 / URL too long errors
    if (body.length > 1500) {
      body = body.substring(0, 1500) + "\r\n\r\n...[Mensagem truncada devido ao tamanho. Baixe a planilha para ver tudo.]";
    }

    let url = "";
    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      url = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    window.open(url, '_blank');
    setIsEmailChoiceModalOpen(false);
  };

  const initiateEmailShare = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      shareViaEmail();
    } else {
      setIsEmailChoiceModalOpen(true);
    }
    setShowSharePopup(false);
  };

  const shareViaEmail = () => {
    const subject = `Relatório de Movimentações - ${new Date().toLocaleDateString()}`;
    const body = filteredMovs.map(m => 
      `${new Date(m.data).toLocaleDateString()} - ${m.tipo}: ${m.quantidade}x ${m.materialDesc} (R$ ${(m.quantidade * (m.precoUnitario || 0)).toFixed(2)})`
    ).join('\n\n');
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowSharePopup(false);
  };

  const copyToClipboard = () => {
    const text = filteredMovs.map(m => 
      `${new Date(m.data).toLocaleDateString()} - ${m.tipo}: ${m.quantidade}x ${m.materialDesc} (R$ ${(m.quantidade * (m.precoUnitario || 0)).toFixed(2)})`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowSharePopup(false);
      }, 2000);
    });
  };

  const handleWebShare = async () => {
    const fullText = filteredMovs.map(m => 
      `${new Date(m.data).toLocaleDateString()} - ${m.tipo}: ${m.quantidade}x ${m.materialDesc}`
    ).join('\n\n');

    const shareData = {
      title: 'Relatório de Movimentações',
      text: `Resumo de ${filteredMovs.length} movimentações:\n\n${fullText}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyToClipboard();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share API fallback:', err?.message || err);
        copyToClipboard();
      }
    }
    setShowSharePopup(false);
  };

  const teamStats = React.useMemo(() => {
    const stats: Record<string, { entradas: number, saidas: number, cor: string }> = {};
    equipes.forEach(e => {
      stats[e.nome] = { entradas: 0, saidas: 0, cor: e.cor };
    });
    filteredMovs.forEach(m => {
      const eq = m.equipe || 'Outros';
      if (!stats[eq]) {
        stats[eq] = { entradas: 0, saidas: 0, cor: '#ccc' };
      }
      if (m.tipo === 'Entrada') {
        stats[eq].entradas += m.quantidade;
      } else if (m.tipo === 'Retirada') {
        stats[eq].saidas += m.quantidade;
      }
    });
    return stats;
  }, [filteredMovs, equipes]);

  const totalEntradas = React.useMemo(() => filteredMovs.filter(m => m.tipo === 'Entrada').reduce((acc, m) => acc + m.quantidade, 0), [filteredMovs]);
  const totalSaidas = React.useMemo(() => filteredMovs.filter(m => m.tipo === 'Retirada').reduce((acc, m) => acc + m.quantidade, 0), [filteredMovs]);
  const totalValue = filteredMovs.reduce((acc, m) => acc + (m.quantidade * (m.precoUnitario || 0)), 0);

  return (
    <div className="view-container">
      <div className="card !p-0 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por Material, COD SAP, OS ou Colaborador..."
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[11px] font-medium transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <button 
                    onClick={() => setShowSharePopup(!showSharePopup)}
                    className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all ${
                      showSharePopup 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[10.5px] font-bold uppercase tracking-wider hidden sm:block">Compartilhar</span>
                  </button>

                  {showSharePopup && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 p-1.5">
                      <div className="p-2 mb-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opções de Exportação</p>
                      </div>
                      <button 
                        onClick={exportCSV}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                        Baixar Planilha (CSV)
                      </button>
                      <button 
                        onClick={initiateEmailShare}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <Mail className="w-3.5 h-3.5 text-amber-500" />
                        Enviar por E-mail
                      </button>
                      <button 
                        onClick={copyToClipboard}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        {copied ? 'Copiado!' : 'Copiar Lista'}
                      </button>
                      <button 
                        onClick={handleWebShare}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                        Outras Opções
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all ${
                    showFilters || filterType !== 'Tudo' || startDate || endDate || filterTeam !== 'Tudo'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold hover:bg-blue-100/60'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <Filter className={`w-3.5 h-3.5 ${(showFilters || filterType !== 'Tudo' || startDate || endDate || filterTeam !== 'Tudo') ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider hidden sm:block">Filtros</span>
                  {(filterType !== 'Tudo' || startDate || endDate || filterTeam !== 'Tudo') && (
                    <span className="ml-1 bg-blue-600 text-white rounded-full text-[8.5px] font-black w-3.5 h-3.5 flex items-center justify-center">
                      {(filterType !== 'Tudo' ? 1 : 0) + (startDate || endDate ? 1 : 0) + (filterTeam !== 'Tudo' ? 1 : 0)}
                    </span>
                  )}
                </button>
                
                {selectedIds.length > 0 && (
                  <button 
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="btn-danger !h-9 !py-0 px-3 flex items-center gap-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center rounded-lg h-9 px-3 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[10.5px] font-bold uppercase tracking-wider hidden sm:block">
                      Excluir ({selectedIds.length})
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards Dashboard */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs shadow-sm mb-1">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 shrink-0">
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                  <span>Entradas: <strong>{totalEntradas.toLocaleString('pt-BR')}</strong> unids</span>
                </div>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Saídas: <strong>{totalSaidas.toLocaleString('pt-BR')}</strong> unids</span>
                </div>
                <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Valor do Período: <strong className="text-emerald-700">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block shrink-0">Movimentações por Equipe:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(teamStats).map(([eqName, stats]: [string, { entradas: number, saidas: number, cor: string }]) => {
                    if (stats.entradas === 0 && stats.saidas === 0) return null;
                    const isActive = filterTeam === eqName;
                    return (
                      <button 
                        key={eqName}
                        onClick={() => setFilterTeam(prev => prev === eqName ? 'Tudo' : eqName)}
                        className={`inline-flex items-center gap-1.5 border rounded-lg px-2 py-0.5 text-[10px] shadow-2xs transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-200' 
                            : 'bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span 
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'animate-[pulse_1s_ease-in-out_infinite] bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} 
                          style={isActive ? undefined : { backgroundColor: stats.cor || '#94a3b8' }} 
                        />
                        <span className={`font-bold ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>{eqName}:</span>
                        <span className={`text-[9px] font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                          <span className={isActive ? "text-blue-500" : "text-blue-600"}>+{stats.entradas}</span> <span className={isActive ? "text-emerald-500/70" : "opacity-60"}>un</span> / <span className={isActive ? "text-amber-500" : "text-amber-600"}>-{stats.saidas}</span> <span className={isActive ? "text-emerald-500/70" : "opacity-60"}>un</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Tipo</label>
                    <select 
                      className="input-field h-8 !py-0 text-[10px]"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                    >
                      <option value="Tudo">Todas as Operações</option>
                      <option value="Entrada">Somente Entradas</option>
                      <option value="Retirada">Somente Retiradas</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Equipe</label>
                    <select 
                      className="input-field h-8 !py-0 text-[10px]"
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                    >
                      <option value="Tudo">Todas as Equipes</option>
                      {teams.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Peça (Material)</label>
                    <select 
                      className="input-field h-8 !py-0 text-[10px]"
                      value={filterMaterialId}
                      onChange={(e) => setFilterMaterialId(e.target.value)}
                    >
                      <option value="">Todas as Peças</option>
                      {materiais.sort((a, b) => a.descricao.localeCompare(b.descricao)).map(m => (
                        <option key={m.id} value={m.id}>{m.descricao}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Período Início</label>
                    <input 
                      type="date" 
                      className="input-field h-8 !py-0 text-[10px]"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Período Fim</label>
                    <input 
                      type="date" 
                      className="input-field h-8 !py-0 text-[10px]"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="sm:col-span-2 lg:col-span-5 flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200/50">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Total Movimentado</span>
                        <span className="text-xs font-black text-slate-700">{filteredMovs.length} itens</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Valor do Filtro</span>
                        <span className="text-xs font-black text-blue-600">
                          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setFilterType('Tudo');
                        setStartDate('');
                        setEndDate('');
                        setFilterTeam('Tudo');
                        setFilterMaterialId('');
                        setSearchTerm('');
                      }}
                      className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase transition-colors"
                    >
                      Limpar Todos os Filtros
                    </button>
                  </div>
                </div>

                {/* Flow Chart for Selected Material */}
                {filterMaterialId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo de Movimentação</h4>
                        <p className="text-xs font-bold text-slate-800">
                          {materiais.find(m => m.id === filterMaterialId)?.descricao}
                        </p>
                      </div>
                    </div>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredMovs.slice().reverse().map(m => ({
                          data: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                          entrada: m.tipo === 'Entrada' ? m.quantidade : 0,
                          retirada: m.tipo === 'Retirada' ? m.quantidade : 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="data" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} 
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="entrada" 
                            stroke="#10b981" 
                            fillOpacity={0.1} 
                            fill="#10b981" 
                            strokeWidth={3}
                            name="Entrada (+)"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="retirada" 
                            stroke="#ef4444" 
                            fillOpacity={0.1} 
                            fill="#ef4444" 
                            strokeWidth={3}
                            name="Retirada (-)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="scroll-container min-h-0 scroll-smooth">
          {filteredMovs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 italic flex flex-col items-center gap-3">
              <Search className="w-8 h-8 text-slate-200" />
              Nenhuma movimentação encontrada com estes filtros.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMovs.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedMov(m)}
                  className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-all flex items-start gap-4 cursor-pointer group"
                  title="Clique para abrir detalhes desta movimentação"
                >
                  <div className="pt-1.5" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(m.id)}
                      onChange={(e) => {
                        if (selectedIds.includes(m.id)) {
                          setSelectedIds(prev => prev.filter(id => id !== m.id));
                        } else {
                          setSelectedIds(prev => [...prev, m.id]);
                        }
                      }}
                    />
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                    m.tipo === 'Entrada' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}>
                    {m.tipo === 'Entrada' ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[12px] font-extrabold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {m.tipo} de {m.materialDesc}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.data).toLocaleString('pt-BR')}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-600">
                        Qtd: <span className="font-bold text-slate-800">{m.quantidade}</span>
                      </span>
                      {m.precoUnitario !== undefined && m.precoUnitario > 0 && (
                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          R$ {(m.quantidade * m.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {m.equipe && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                          Equipe: {m.equipe}
                        </span>
                      )}
                      {m.os && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                          OS: {m.os}
                        </span>
                      )}
                      {m.pedidoCompra && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                          Pedido: {m.pedidoCompra}
                        </span>
                      )}
                      {m.pedidoSap && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                          COD SAP: {m.pedidoSap}
                        </span>
                      )}
                      {m.nf && !m.pedidoCompra && !m.pedidoSap && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                          NF: {m.nf}
                        </span>
                      )}
                      {m.colaborador && (
                        <span className="text-[10px] text-slate-400">
                           Retirante: <b className="text-slate-600">{m.colaborador}</b>
                        </span>
                      )}
                      {m.conferente && (
                        <span className="text-[10px] text-slate-400">
                           Recebido: <b className="text-slate-600">{m.conferente}</b>
                        </span>
                      )}
                      {m.liberador && (
                        <span className="text-[10px] text-slate-400 italic">
                          (Lib: {m.liberador})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Popup Modal */}
      {selectedMov && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  selectedMov.tipo === 'Entrada' ? 'bg-emerald-100' : 'bg-blue-100'
                }`}>
                  {selectedMov.tipo === 'Entrada' ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      selectedMov.tipo === 'Entrada' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {selectedMov.tipo}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                      ID: {selectedMov.id}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    {isEditing ? 'Editar Movimentação' : 'Detalhes da Movimentação'}
                  </h4>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {isEditing ? (
              /* Modal Edit Form */
              <div className="p-5 space-y-4">
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-3">
                  <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider">Material Associado</p>
                    <p className="text-xs font-black text-slate-850 mt-0.5 truncate">{selectedMov.materialDesc}</p>
                    <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">CÓDIGO ID: {selectedMov.materialId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-400" /> Quantidade
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      value={editQty} 
                      onChange={(e) => setEditQty(Math.max(1, Number(e.target.value) || 0))} 
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                    />
                  </div>

                  {selectedMov.precoUnitario !== undefined && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Preço Unitário (R$)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={editPrecoUnitario} 
                        onChange={(e) => setEditPrecoUnitario(Math.max(0, Number(e.target.value) || 0))} 
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                      />
                    </div>
                  )}

                  {selectedMov.tipo === 'Entrada' ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> Nota Fiscal (NF)
                        </label>
                        <input 
                          type="text" 
                          placeholder="EX: NF-1029"
                          value={editNf} 
                          onChange={(e) => setEditNf(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> Nº PEDIDO COD SAP
                        </label>
                        <input 
                          type="text" 
                          placeholder="EX: COD SAP-1234"
                          value={editPedidoSap} 
                          onChange={(e) => setEditPedidoSap(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" /> Fornecedor
                        </label>
                        <select 
                          value={editFornecedor} 
                          onChange={(e) => setEditFornecedor(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                        >
                          <option value="">Selecione um fornecedor...</option>
                          {fornecedores.map(f => (
                            <option key={f.id} value={f.nomeFantasia}>{f.nomeFantasia}</option>
                          ))}
                          {editFornecedor && !fornecedores.some(f => f.nomeFantasia === editFornecedor) && (
                            <option value={editFornecedor}>{editFornecedor}</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <ColaboradorSelect
                          label="Conferente no Sistema"
                          placeholder="Selecione um recebedor..."
                          value={editConferente}
                          onChange={(val) => setEditConferente(val)}
                          colaboradores={colaboradores}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> Ordem de Serviço (OS)
                        </label>
                        <input 
                          type="text" 
                          placeholder="EX: OS-9982"
                          value={editOs} 
                          onChange={(e) => setEditOs(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <ColaboradorSelect
                          label="Retirante (Colaborador)"
                          placeholder="Selecione um colaborador..."
                          value={editColaborador}
                          onChange={(nome) => {
                            setEditColaborador(nome);
                            const colabObj = colaboradores.find(c => c.nome === nome);
                            if (colabObj) {
                              if (colabObj.empresa) setEditEmpresa(colabObj.empresa);
                            }
                          }}
                          colaboradores={colaboradores}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" /> Empresa
                        </label>
                        <select 
                          value={editEmpresa} 
                          onChange={(e) => setEditEmpresa(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                        >
                          <option value="">Selecione a Empresa...</option>
                          {['Vision', 'BCM'].map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.razaoSocial}>{emp.razaoSocial}</option>
                          ))}
                          {editEmpresa && editEmpresa !== 'Vision' && editEmpresa !== 'BCM' && (
                            <option value={editEmpresa}>{editEmpresa}</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> Equipe
                        </label>
                        <select 
                          value={editEquipe} 
                          onChange={(e) => setEditEquipe(e.target.value)} 
                          className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-mono"
                        >
                          <option value="">Selecione a Equipe...</option>
                          {equipes.map(eq => (
                            <option key={eq.id} value={eq.nome}>{eq.nome}</option>
                          ))}
                          {editEquipe && !equipes.some(eq => eq.nome === editEquipe) && (
                            <option value={editEquipe}>{editEquipe}</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <ColaboradorSelect
                          label="Liberador"
                          placeholder="Selecione um liberador..."
                          value={editLiberador}
                          onChange={(val) => setEditLiberador(val)}
                          colaboradores={colaboradores.filter(c => ["TST", "GESTOR", "SUPERVISOR", "ENCARREGADO"].includes(c.cargo))}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Observações da Operação
                  </label>
                  <textarea 
                    value={editObservacoes} 
                    onChange={(e) => setEditObservacoes(e.target.value)} 
                    rows={2}
                    placeholder="Adicione observações ou justificativas do reparo..."
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            ) : (
              /* Modal Details Read-Only View */
              <div className="p-5 space-y-5">
                {/* Material Info Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Dados do Material</p>
                    <p className="text-sm font-black text-slate-800 mt-1 leading-tight">{selectedMov.materialDesc}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <p className="text-[10px] text-slate-500 font-mono">
                        <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">COD SAP:</span>
                        {selectedMaterial?.sap || '-'}
                      </p>
                      {selectedMaterial?.unidade && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">UND:</span>
                          {(selectedMaterial.unidade || '').toUpperCase()}
                        </p>
                      )}
                      {selectedMaterial?.localizacao && (
                        <p className="text-[10px] text-blue-600 font-bold">
                          <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">LOC:</span>
                          {selectedMaterial.localizacao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Quantidade</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">
                        {selectedMov.quantidade} <span className="text-[10px] text-slate-400 font-bold ml-1">{formatUnit(selectedMaterial?.unidade)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Data &amp; Hora</p>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 leading-tight">
                        {new Date(selectedMov.data).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {selectedMov.precoUnitario !== undefined && selectedMov.precoUnitario > 0 && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preço Unitário</p>
                          <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                            R$ {Number(selectedMov.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Valor Total</p>
                          <p className="text-[11px] font-black text-emerald-600 mt-0.5">
                            R$ {Number(selectedMov.precoUnitario * selectedMov.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedMov.os && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Ordem de Serviço</p>
                        <p className="text-[10px] font-bold text-blue-600 mt-0.5 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100 inline-block font-mono">
                          {selectedMov.os}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMov.nf && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Nota Fiscal (NF)</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block font-mono">
                          {selectedMov.nf}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMov.pedidoSap && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Nº PEDIDO COD SAP</p>
                        <p className="text-[10px] font-bold text-emerald-700 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block font-mono">
                          {selectedMov.pedidoSap}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMov.pedidoCompra && (
                    <div className="flex items-start gap-2">
                      <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Pedido de Compra</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block font-mono">
                          {selectedMov.pedidoCompra}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMov.fornecedor && (
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Fornecedor</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5 truncate max-w-[180px]" title={selectedMov.fornecedor}>
                          {selectedMov.fornecedor}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMov.empresa && (
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Empresa</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5">{selectedMov.empresa}</p>
                      </div>
                    </div>
                  )}

                  {selectedMov.equipe && (
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Equipe</p>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5">{selectedMov.equipe}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Responsibles Header Panel */}
                {(selectedMov.colaborador || selectedMov.liberador || selectedMov.conferente) && (
                  <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-2.5">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Responsáveis pela Operação
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedMov.colaborador && (
                        <div>
                          <p className="text-[8.5px] font-extrabold text-slate-400 uppercase">Retirante</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedMov.colaborador}</p>
                        </div>
                      )}
                      {selectedMov.liberador && (
                        <div>
                          <p className="text-[8.5px] font-extrabold text-slate-400 uppercase">Liberado por</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedMov.liberador}</p>
                        </div>
                      )}
                      {selectedMov.conferente && (
                        <div className="sm:col-span-2">
                          <p className="text-[8.5px] font-extrabold text-slate-400 uppercase">Conferidor no Sistema</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedMov.conferente}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Remarks/Notes */}
                {selectedMov.observacoes && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Observações da Operação
                    </p>
                    <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
                      {selectedMov.observacoes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 flex justify-between">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveEdit}
                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setDeletionPasswordInput('');
                      setDeleteError('');
                      setIsDeleteModalOpen(true);
                    }}
                    className="px-5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-red-100 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                  <button 
                    onClick={() => startEdit(selectedMov)}
                    className="px-5 py-1.5 bg-blue-50 hover:bg-blue-105 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-blue-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={handleClose}
                    className="px-5 py-1.5 bg-slate-900 border border-transparent hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm select-none"
                  >
                    Fechar Detalhes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedMov && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir esta movimentação de <span className="font-bold text-slate-700">"{selectedMov.tipo} ({selectedMov.materialDesc})"</span>? 
                Esta ação não poderá ser desfeita.
              </p>
              {isDeletionPasswordEnabled && deletionPassword && (
                <div className="w-full mt-4 text-left">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Senha de Confirmação</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Digite a senha para autorizar"
                    value={deletionPasswordInput}
                    onChange={(e) => {
                      setDeletionPasswordInput(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1.5">{deleteError}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteError('');
                }}
                className="flex-1 btn-secondary cursor-pointer h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (isDeletionPasswordEnabled && deletionPassword && deletionPasswordInput !== deletionPassword) {
                    setDeleteError('Senha de exclusão inválida.');
                    return;
                  }
                  
                  deleteMovimentacao(selectedMov.id);
                  playNotificationSound('delete');
                  setIsDeleteModalOpen(false);
                  setSelectedMov(null);
                  setDeletionPasswordInput('');
                  setDeleteError('');
                }}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 hover:bg-red-700 transition-all shadow-sm cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Excluir em Massa</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir as <span className="font-bold text-slate-700">{selectedIds.length} movimentações selecionadas</span>? 
                Esta ação não poderá ser desfeita.
              </p>
              {isDeletionPasswordEnabled && deletionPassword && (
                <div className="w-full mt-4 text-left">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Senha de Confirmação</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Digite a senha para autorizar"
                    value={deletionPasswordInput}
                    onChange={(e) => {
                      setDeletionPasswordInput(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1.5">{deleteError}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
                  setDeleteError('');
                  setDeletionPasswordInput('');
                }}
                className="flex-1 btn-secondary cursor-pointer h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmBulkDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 hover:bg-red-700 transition-all shadow-sm cursor-pointer"
              >
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {isEmailChoiceModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Escolha seu provedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={(e) => shareViaEmailChoice(e, 'gmail')}
                className="p-4 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-center font-bold text-sm text-slate-700 transition-colors cursor-pointer"
              >
                Gmail
              </button>
              <button 
                onClick={(e) => shareViaEmailChoice(e, 'outlook')}
                className="p-4 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-center font-bold text-sm text-slate-700 transition-colors cursor-pointer"
              >
                Outlook
              </button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEmailChoiceModalOpen(false); }}
              className="w-full mt-4 p-2 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
};
