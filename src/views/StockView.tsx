import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Edit2, Trash2, X, Save, AlertTriangle, Share2, Download, Copy, Check, Mail } from 'lucide-react';
import { useApp } from '../lib/store';
import { Material, formatUnit } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playNotificationSound } from '../lib/audio';

export const StockView: React.FC = () => {
  const { materiais, updateMaterial, deleteMaterial, equipes, deletionPassword, isDeletionPasswordEnabled } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [deletionPasswordInput, setDeletionPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  const teamStats = useMemo(() => {
    const stats: Record<string, { valor: number, qtd: number, cor: string }> = {};
    equipes.forEach(e => {
      stats[e.nome] = { valor: 0, qtd: 0, cor: e.cor };
    });
    materiais.forEach(m => {
      if (!stats[m.equipe]) return;
      stats[m.equipe].valor += m.estoqueAtual * m.precoUnitario;
      stats[m.equipe].qtd += m.estoqueAtual;
    });
    return stats;
  }, [materiais, equipes]);
  
  const totalGeralQtd = useMemo(() => materiais.reduce((acc, m) => acc + m.estoqueAtual, 0), [materiais]);
  const totalGeralValor = useMemo(() => materiais.reduce((acc, m) => acc + (m.estoqueAtual * m.precoUnitario), 0), [materiais]);
  
  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Material>>({});

  // Filters state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterEquipe, setFilterEquipe] = useState<string>('TODAS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('descricao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const { fornecedores } = useApp();

  // Filter materials based on search term, active team, and stock status
  const filtered = useMemo(() => {
    return materiais.filter(m => {
      // Search term match
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        m.descricao.toLowerCase().includes(searchLower) ||
        m.sap.toLowerCase().includes(searchLower) ||
        (m.codigoFornecedor && m.codigoFornecedor.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;

      // Equipe filter
      if (filterEquipe !== 'TODAS' && m.equipe !== filterEquipe) return false;

      // Status filter
      if (filterStatus !== 'TODOS') {
        const isZerado = m.estoqueAtual === 0;
        const isAbaixo = m.estoqueAtual < m.estoqueMinimo && m.estoqueAtual > 0;
        const isLibera = m.estoqueAtual >= m.estoqueMinimo && m.estoqueAtual > 0;
        const isOkFilter = m.estoqueAtual >= m.estoqueMinimo && m.estoqueAtual > 0;

        if (filterStatus === 'ZERADO' && !isZerado) return false;
        if (filterStatus === 'ABAIXO' && !isAbaixo) return false;
        if (filterStatus === 'OK' && !isOkFilter) return false;
      }

      return true;
    });
  }, [materiais, searchTerm, filterEquipe, filterStatus]);

  // Sort filtered materials
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortBy === 'descricao') {
        valA = a.descricao.toLowerCase();
        valB = b.descricao.toLowerCase();
      } else if (sortBy === 'sap') {
        valA = a.sap;
        valB = b.sap;
      } else if (sortBy === 'estoque') {
        valA = a.estoqueAtual;
        valB = b.estoqueAtual;
      } else if (sortBy === 'preco') {
        valA = a.precoUnitario;
        valB = b.precoUnitario;
      } else if (sortBy === 'equipe') {
        valA = a.equipe.toLowerCase();
        valB = b.equipe.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortOrder]);

  const handleEditClick = (material: Material) => {
    setSelectedMaterial(material);
    setEditFormData({ ...material });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (material: Material) => {
    setSelectedMaterial(material);
    setDeletionPasswordInput('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleUpdate = () => {
    if (selectedMaterial) {
      updateMaterial(selectedMaterial.id, editFormData);
      playNotificationSound();
      setIsEditModalOpen(false);
      setSelectedMaterial(null);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedMaterial) {
      if (isDeletionPasswordEnabled && deletionPassword && deletionPasswordInput !== deletionPassword) {
        setDeleteError('Senha de exclusão inválida.');
        return;
      }
      
      deleteMaterial(selectedMaterial.id);
      playNotificationSound('delete');
      setIsDeleteModalOpen(false);
      setSelectedMaterial(null);
      setDeletionPasswordInput('');
      setDeleteError('');
    }
  };

  const handleConfirmBulkDelete = () => {
    if (isDeletionPasswordEnabled && deletionPassword && deletionPasswordInput !== deletionPassword) {
      setDeleteError('Senha de exclusão inválida.');
      return;
    }
    
    selectedIds.forEach(id => deleteMaterial(id));
    playNotificationSound('delete');
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
    setDeletionPasswordInput('');
    setDeleteError('');
  };

  const exportCSV = () => {
    const headers = ['COD SAP', 'Descrição', 'Equipe', 'Fornecedor', 'Est. Minimo', 'Est. Ideal', 'Est. Atual', 'Unidade', 'Preço Unit', 'Valor Total'];
    const csvHeaders = headers.map(h => `"${h}"`).join(';');

    const rows = sorted.flatMap(m => {
      const fornecedorName = fornecedores.find(f => f.id === m.fornecedorId)?.nomeFantasia || m.codigoFornecedor || '-';
      return [
        [
          m.sap,
          m.descricao,
          m.equipe,
          fornecedorName,
          m.estoqueMinimo.toString(),
          m.estoqueIdeal.toString(),
          m.estoqueAtual.toString(),
          m.unidade,
          m.precoUnitario.toFixed(2).replace('.', ','),
          (m.estoqueAtual * m.precoUnitario).toFixed(2).replace('.', ',')
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'),
        '' // Pula uma linha entre registros
      ];
    });
    
    const csvContent = [csvHeaders, ...rows].join("\r\n");
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Estoque_Atual_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowSharePopup(false);
  };

  const shareViaEmail = () => {
    const subject = `Relatório de Estoque Atual - ${new Date().toLocaleDateString()}`;
    const body = sorted.map(m => 
      `${m.sap} - ${m.descricao}: ${m.estoqueAtual} ${formatUnit(m.unidade)} (Total: R$ ${(m.estoqueAtual * m.precoUnitario).toFixed(2)})`
    ).join('\n\n');
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowSharePopup(false);
  };

  const copyToClipboard = () => {
    const text = sorted.map(m => 
      `${m.sap} - ${m.descricao}: ${m.estoqueAtual} ${formatUnit(m.unidade)} (Total: R$ ${(m.estoqueAtual * m.precoUnitario).toFixed(2)})`
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
    const fullText = sorted.map(m => 
      `${m.sap} - ${m.descricao}: ${m.estoqueAtual} ${formatUnit(m.unidade)}`
    ).join('\n\n');

    const shareData = {
      title: 'Relatório de Estoque Atual',
      text: `Resumo de ${sorted.length} itens em estoque:\n\n${fullText}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyToClipboard();
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
    setShowSharePopup(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5 pt-2">
      {/* Fixed Top Section: Stats + Search + Filters */}
      <div className="bg-brand-light space-y-4 pb-4 shrink-0 z-30">
        {/* Stats Cards */}
        <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide py-1 px-1">
          <button 
            onClick={() => setFilterEquipe('TODAS')}
            className={`p-3 rounded-xl border transition-all text-left shrink-0 w-[150px] sm:flex-1 relative group ${
              filterEquipe === 'TODAS'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <p className="text-[10px] uppercase font-black opacity-60 tracking-wider">Total de Peças</p>
            <div className="mt-1">
              <p className="text-lg font-black leading-tight">{totalGeralQtd}</p>
              <p className={`text-[10px] font-bold tracking-tight ${filterEquipe === 'TODAS' ? 'opacity-70' : 'text-slate-500'}`}>
                R$ {totalGeralValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </button>
          {equipes.map((equipe, idx) => {
            const stats = teamStats[equipe.nome] || { valor: 0, qtd: 0, cor: '#ccc' };
            const isActive = filterEquipe === equipe.nome;
            return (
              <button 
                key={equipe.id || `equipe-${idx}`}
                onClick={() => setFilterEquipe(equipe.nome)}
                className={`p-3 rounded-xl border transition-all text-left shrink-0 w-[150px] sm:flex-1 relative group ${
                  isActive
                    ? 'bg-white border-2 shadow-lg scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
                style={isActive ? { borderColor: stats.cor } : {}}
              >
                <p className="text-[10px] uppercase font-black tracking-wider" style={{ color: stats.cor }}>{equipe.nome}</p>
                <div className="mt-1">
                  <p className="text-lg font-black leading-tight">{stats.qtd}</p>
                  <p className="text-[10px] text-slate-500 font-bold tracking-tight">R$ {stats.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="input-field !py-2 pl-10 !text-xs" 
              placeholder="Buscar por nome ou COD SAP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowSharePopup(!showSharePopup)}
                className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all ${
                  showSharePopup 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Share2 className={`w-3.5 h-3.5 ${showSharePopup ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-[10.5px] font-bold uppercase tracking-wider">Compartilhar</span>
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
                    Baixar Estoque (CSV)
                  </button>
                  <button 
                    onClick={shareViaEmail}
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
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsSortOpen(false);
              }}
              className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all ${
                isFilterOpen || filterEquipe !== 'TODAS' || filterStatus !== 'TODOS'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold hover:bg-blue-100/60'
                  : 'hover:bg-slate-50'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${(isFilterOpen || filterEquipe !== 'TODAS' || filterStatus !== 'TODOS') ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="text-[10.5px] font-bold uppercase tracking-wider">Filtros</span>
              {(filterEquipe !== 'TODAS' || filterStatus !== 'TODOS') && (
                <span className="ml-1 bg-blue-600 text-white rounded-full text-[8.5px] font-black w-3.5 h-3.5 flex items-center justify-center">
                  {(filterEquipe !== 'TODAS' ? 1 : 0) + (filterStatus !== 'TODOS' ? 1 : 0)}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsFilterOpen(false);
              }}
              className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all ${
                isSortOpen || sortBy !== 'descricao' || sortOrder !== 'asc'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold hover:bg-blue-100/60'
                  : 'hover:bg-slate-50'
              }`}
            >
              <ArrowUpDown className={`w-3.5 h-3.5 ${(isSortOpen || sortBy !== 'descricao' || sortOrder !== 'asc') ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="text-[10.5px] font-bold uppercase tracking-wider">Ordenar</span>
              {(sortBy !== 'descricao' || sortOrder !== 'asc') && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
              )}
            </button>
            
            <button 
              onClick={() => {
                if (selectedIds.length === sorted.length) setSelectedIds([]);
                else setSelectedIds(sorted.map(m => m.id));
              }}
              className={`btn-secondary !h-9 !py-0 px-3 flex items-center gap-2 transition-all group ${
                selectedIds.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-slate-50'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="text-[10.5px] font-bold uppercase tracking-wider">
                {selectedIds.length === sorted.length && sorted.length > 0 ? 'Desmarcar' : 'Selecionar Tudo'}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <button 
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="btn-danger !h-9 !py-0 px-3 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[10.5px] font-bold uppercase tracking-wider">
                  Excluir ({selectedIds.length})
                </span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Filtrar por Equipe</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => setFilterEquipe('TODAS')}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        filterEquipe === 'TODAS' 
                          ? 'bg-slate-900 text-white border-slate-900 font-medium' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Todas as Equipes
                    </button>
                    {equipes.map(e => (
                      <button 
                        key={e.id}
                        onClick={() => setFilterEquipe(e.nome)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${
                          filterEquipe === e.nome 
                            ? 'bg-blue-600 text-white border-blue-600 font-medium' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        style={filterEquipe === e.nome ? { backgroundColor: e.cor, borderColor: e.cor, color: '#fff' } : {}}
                      >
                        {e.nome}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Filtrar por Status do Estoque</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'TODOS', label: 'Todos os Status', activeClass: 'bg-slate-900 text-white border-slate-900' },
                      { id: 'ZERADO', label: 'Estoque Zerado', activeClass: 'bg-red-500 text-white border-red-500' },
                      { id: 'ABAIXO', label: 'Abaixo do Mínimo', activeClass: 'bg-amber-500 text-white border-amber-500' },
                      { id: 'OK', label: 'Estoque OK', activeClass: 'bg-emerald-600 text-white border-emerald-600' }
                    ].map(st => {
                      const isActive = filterStatus === st.id;
                      return (
                        <button 
                          key={st.id}
                          onClick={() => setFilterStatus(st.id)}
                          className={`px-3 py-1 text-xs rounded-full border transition-all ${
                            isActive 
                              ? `${st.activeClass} font-medium` 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(filterEquipe !== 'TODAS' || filterStatus !== 'TODOS') && (
                  <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200/50 flex justify-end">
                    <button 
                      onClick={() => {
                        setFilterEquipe('TODAS');
                        setFilterStatus('TODOS');
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSortOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ordenar por:</span>
                  <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'descricao', label: 'Descrição' },
                        { id: 'sap', label: 'COD SAP' },
                        { id: 'estoque', label: 'Estoque' },
                        { id: 'preco', label: 'Custo Unitário' },
                        { id: 'equipe', label: 'Equipe' }
                      ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        className={`px-3 py-1 text-xs rounded-lg border transition-all font-medium ${
                          sortBy === opt.id 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Direção:</span>
                  <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex gap-0.5">
                    <button 
                      onClick={() => setSortOrder('asc')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                        sortOrder === 'asc' 
                          ? 'bg-slate-100 text-slate-900 font-bold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Menor/A-Z
                    </button>
                    <button 
                      onClick={() => setSortOrder('desc')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                        sortOrder === 'desc' 
                          ? 'bg-slate-100 text-slate-900 font-bold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Maior/Z-A
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table Section - Consolidated and Fixed Header */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="card !p-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr className="shadow-sm">
                  <th className="table-header w-10 py-3 border-b border-slate-200 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.length === sorted.length && sorted.length > 0} 
                      onChange={() => {
                        if (selectedIds.length === sorted.length) setSelectedIds([]);
                        else setSelectedIds(sorted.map(m => m.id));
                      }} 
                    />
                  </th>
                  <th className="table-header w-20 py-3 border-b border-slate-200">COD SAP</th>
                  <th className="table-header w-32 py-3 border-b border-slate-200">Fornecedor</th>
                  <th className="table-header py-3 border-b border-slate-200">Descrição</th>
                  <th className="table-header py-3 border-b border-slate-200">Equipe</th>
                  <th className="table-header py-3 border-b border-slate-200 text-center">Mín.</th>
                  <th className="table-header py-3 border-b border-slate-200 text-center">Ideal</th>
                  <th className="table-header py-3 border-b border-slate-200 text-center">Estoque</th>
                  <th className="table-header py-3 border-b border-slate-200">Status</th>
                  <th className="table-header text-right py-3 border-b border-slate-200">Custo Unit.</th>
                  <th className="table-header text-right py-3 border-b border-slate-200">Valor Total</th>
                  <th className="table-header text-center w-24 py-3 border-b border-slate-200">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                      Nenhum material encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
                {sorted.map((m, idx) => {
                let statusClass = 'pill-ok';
                let statusLabel = 'OK';

                if (m.estoqueAtual === 0) {
                  statusClass = 'pill-crit';
                  statusLabel = 'ZERADO';
                } else if (m.estoqueAtual < m.estoqueMinimo) {
                  statusClass = 'pill-warn';
                  statusLabel = 'ABAIXO';
                }

                return (
                  <tr key={m.id || `mat-${idx}`} className="table-row group">
                    <td className="px-3 py-2 text-center border-b border-slate-50">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => {
                          if (selectedIds.includes(m.id)) {
                            setSelectedIds(prev => prev.filter(id => id !== m.id));
                          } else {
                            setSelectedIds(prev => [...prev, m.id]);
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500">{m.sap}</td>
                    <td className="px-3 py-2 text-slate-400 font-medium text-[10px]">
                      {useApp().fornecedores.find(f => f.id === m.fornecedorId)?.nomeFantasia || m.codigoFornecedor || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-brand-dark">{m.descricao}</p>
                      {m.detalhes && <p className="text-[9px] text-slate-400 italic line-clamp-1">{m.detalhes}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded border border-slate-100">
                        {m.equipe}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 tabular-nums text-xs font-semibold">{m.estoqueMinimo}</td>
                    <td className="px-3 py-2 text-center text-slate-500 tabular-nums text-xs font-semibold">{m.estoqueIdeal}</td>
                    <td className="px-3 py-2 font-bold text-brand-dark text-center">
                      <span className="inline-flex items-center gap-1">
                        {m.estoqueAtual} <span className="font-normal text-slate-400 text-[10px] uppercase">{formatUnit(m.unidade)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`status-pill ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-right tabular-nums">
                      R$ {m.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-slate-900 font-semibold text-right tabular-nums">
                      R$ {(m.estoqueAtual * m.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                          title="Editar Material"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-blue-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(m)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg shadow-sm transition-all animate-none"
                          title="Excluir Material"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir o material <span className="font-bold text-slate-700">"{selectedMaterial?.descricao}"</span>? 
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
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-sm h-10 hover:bg-red-700 transition-all shadow-sm"
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
              <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão em Massa</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir os <span className="font-bold text-slate-700">{selectedIds.length} materiais selecionados</span>? 
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
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmBulkDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-sm h-10 hover:bg-red-700 transition-all shadow-sm"
              >
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Editar Detalhes do Material</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white rounded-full transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">COD SAP</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editFormData.sap || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, sap: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fornecedor</label>
                  <select 
                    className="input-field"
                    value={editFormData.fornecedorId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, fornecedorId: e.target.value })}
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {useApp().fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nomeFantasia}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Fornecedor</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editFormData.codigoFornecedor || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, codigoFornecedor: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Unidade</label>
                  <select 
                    className="input-field"
                    value={editFormData.unidade || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, unidade: e.target.value })}
                  >
                    <option value="un">UN (Unidade)</option>
                    <option value="gl">GL (Galão)</option>
                    <option value="sc">SC (Saco)</option>
                    <option value="m">MT (Metro)</option>
                    <option value="kg">KG (Quilo)</option>
                    <option value="l">LT (Litro)</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe</label>
                  <select 
                    className="input-field"
                    value={editFormData.equipe || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, equipe: e.target.value })}
                  >
                    {equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Atual</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editFormData.estoqueAtual === undefined ? '' : editFormData.estoqueAtual}
                    onChange={(e) => setEditFormData({ ...editFormData, estoqueAtual: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Descrição do Material</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editFormData.descricao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Mínimo</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editFormData.estoqueMinimo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, estoqueMinimo: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Ideal</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editFormData.estoqueIdeal || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, estoqueIdeal: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Custo Unitário (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-field" 
                    value={editFormData.precoUnitario || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, precoUnitario: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Localização</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editFormData.localizacao || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, localizacao: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="btn-secondary !h-9 text-[11px]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdate}
                className="btn-primary !h-9 text-[11px] flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
