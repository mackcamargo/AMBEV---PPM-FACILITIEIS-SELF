import React, { useState, useEffect, useRef } from 'react';
import { Plus, Rocket, Trash2, Search, CheckCircle2, AlertTriangle, X, ArrowUpRight, ArrowDownLeft, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../lib/store';
import { generateId } from '../lib/idUtils';
import { Material, ItemLote, Movimentacao, formatUnit, Fornecedor } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playNotificationSound } from '../lib/audio';
import { ColaboradorSelect } from '../components/ColaboradorSelect';

const MaterialSelect = React.forwardRef<HTMLButtonElement, {
  materials: Material[];
  selectedId: string;
  onSelect: (id: string) => void;
  fornecedores: Fornecedor[];
  invalid?: boolean;
}>(({ materials, selectedId, onSelect, fornecedores, invalid }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMaterial = materials.find(m => m.id === selectedId);

  const filteredMaterials = materials
    .filter(m => 
      m.descricao.toLowerCase().includes(search.toLowerCase()) || 
      m.sap.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.descricao.localeCompare(b.descricao));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white border rounded-xl flex items-center justify-between px-3 h-10 transition-all ${
          invalid 
            ? 'ring-2 ring-red-600 border-red-600 bg-red-100 animate-error-pulse' 
            : 'border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-blue-500/20'
        }`}
      >
        <span className="truncate flex-1">
          {selectedMaterial ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{selectedMaterial.descricao}</span>
              <span className="text-slate-300 font-bold">-</span>
              <span className="text-slate-500 text-[10px] uppercase font-bold">SAP: {selectedMaterial.sap}</span>
              <span className="text-slate-300 font-bold">-</span>
              <span className={`text-[10px] font-black uppercase ${
                selectedMaterial.estoqueAtual >= (selectedMaterial.estoqueIdeal || 0) ? 'text-emerald-600' :
                selectedMaterial.estoqueAtual === 0 ? 'text-red-600' : 'text-amber-500'
              }`}>
                ({selectedMaterial.estoqueAtual} {formatUnit(selectedMaterial.unidade)})
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs font-bold uppercase">Selecione o Material...</span>
          )}
        </span>
        <Search className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 scale-110' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[350px] flex flex-col"
          >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Pesquisar por nome ou código SAP..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredMaterials.map(m => {
                const isBelowIdeal = m.estoqueAtual < (m.estoqueIdeal || 0);
                const isZero = m.estoqueAtual === 0;
                const fornName = fornecedores.find(f => f.id === m.fornecedorId)?.nomeFantasia;
                
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelect(m.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100/50 last:border-0 transition-all flex flex-col gap-1 group"
                  >
                    <div className="flex justify-between items-start gap-3">
                       <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                         {m.descricao}
                       </span>
                       <span className={`text-[10px] font-black shrink-0 px-2 py-0.5 rounded-full ${
                         !isBelowIdeal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                         isZero ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-500 border border-amber-100'
                       }`}>
                         {m.estoqueAtual} {formatUnit(m.unidade)}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SAP: {m.sap}</span>
                      {fornName && (
                        <>
                          <span className="text-slate-200">•</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">
                            {fornName}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredMaterials.length === 0 && (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 text-slate-100" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum resultado</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const MaterialMovement: React.FC<{ type: 'Entrada' | 'Retirada' }> = ({ type }) => {
  const { materiais, colaboradores, empresas, equipes, fornecedores, addMovimentacao, updateMaterial, setView } = useApp();
  
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dataMovimentacao, setDataMovimentacao] = useState(getTodayString());
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantidade, setQuantidade] = useState<number | string>('1');
  const [precoUnitario, setPrecoUnitario] = useState<number | string>('');
  const [os, setOs] = useState('');
  const [batchItems, setBatchItems] = useState<ItemLote[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'Entrada' | 'Retirada'; severity?: 'success' | 'warning' | 'error' }[]>([]);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [insufficientStockModal, setInsufficientStockModal] = useState<{
    isOpen: boolean;
    available: number;
    requested: number;
    materialName: string;
  } | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Reset fields when changing between Entrada and Retirada
  useEffect(() => {
    setSelectedMaterialId('');
    setQuantidade('1');
    setPrecoUnitario('');
    setBatchItems([]);
    setInvalidFields([]);
    setNf('');
    setPedidoCompra('');
    setPedidoSap('');
    setFornecedor('');
    setConferente('');
    setOs('');
    setColaborador('');
    setEmpresa('');
    setEquipe('');
    setLiberador('');
    setObservacoes('');
  }, [type]);

  // Refs for focusing
  const materialRef = useRef<HTMLButtonElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const osRef = useRef<HTMLInputElement>(null);
  const colaboradorRef = useRef<HTMLButtonElement>(null);
  const liberadorRef = useRef<HTMLButtonElement>(null);
  const conferenteRef = useRef<HTMLButtonElement>(null);

  // Clear invalid status for a specific field when data is provided
  const clearInvalidField = (field: string) => {
    setInvalidFields(prev => prev.filter(f => f !== field));
  };

  useEffect(() => {
    if (showStockWarning) {
      playNotificationSound('warning');
    }
  }, [showStockWarning]);

  const showToast = (message: string, toastType: 'Entrada' | 'Retirada', severity: 'success' | 'warning' | 'error' = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type: toastType, severity }]);
    
    // Play sound based on severity/type
    if (severity === 'error') playNotificationSound('delete');
    else playNotificationSound(severity === 'warning' ? 'warning' : 'success');

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Specific fields for Entrada
  const [nf, setNf] = useState('');
  const [pedidoCompra, setPedidoCompra] = useState('');
  const [pedidoSap, setPedidoSap] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [conferente, setConferente] = useState('');

  // Specific fields for Retirada
  const [colaborador, setColaborador] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [equipe, setEquipe] = useState('');
  const [liberador, setLiberador] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const handleColaboradorChange = (nome: string) => {
    setColaborador(nome);
    if (nome) clearInvalidField('colaborador');
    const colabObj = colaboradores.find(c => c.nome === nome && c.status === 'Ativo');
    if (colabObj) {
      if (colabObj.empresa) {
        setEmpresa(colabObj.empresa);
      }
    }
  };

  const handleEquipeChange = (newEquipe: string) => {
    setEquipe(newEquipe);
  };

  const selectedMaterial = materiais.find(m => m.id === selectedMaterialId);

  const handleMaterialChange = (id: string) => {
    setSelectedMaterialId(id);
    if (id) clearInvalidField('material');
    
    const mat = materiais.find(m => m.id === id);
    if (mat) {
      if (type === 'Retirada' && mat.estoqueAtual === 0) {
        setShowStockWarning(true);
      }
      setPrecoUnitario(mat.precoUnitario);
      // ALWAYS set quantity back to 1 for every new selection
      setQuantidade('1');
      
      // Auto-select team for Retirada (Material context is primary)
      if (type === 'Retirada' && mat.equipe) {
        setEquipe(mat.equipe);
      }
    } else {
      setPrecoUnitario('');
    }
  };

  const handleDirectProcess = async () => {
    const missing: string[] = [];
    
    if (!selectedMaterialId) missing.push('material');
    if (!quantidade || Number(quantidade) === 0) missing.push('quantidade');
    
    if (type === 'Entrada') {
      if (!conferente) missing.push('conferente');
    } else {
      if (!os.trim()) missing.push('os');
      if (!colaborador) missing.push('colaborador');
      if (!liberador) missing.push('liberador');
    }

    if (missing.length > 0) {
      setInvalidFields(missing);
      showToast('Atenção! Faltam campos obrigatórios.', type, 'warning');
      
      // Auto-focus the first missing field
      const first = missing[0];
      if (first === 'material') materialRef.current?.focus();
      else if (first === 'quantidade') quantidadeRef.current?.focus();
      else if (first === 'conferente') conferenteRef.current?.focus();
      else if (first === 'os') osRef.current?.focus();
      else if (first === 'colaborador') colaboradorRef.current?.focus();
      else if (first === 'liberador') liberadorRef.current?.focus();
      return;
    }

    const finalQuantityNum = Number(quantidade);

    // Stock check for Retirada
    if (type === 'Retirada') {
      const mat = materiais.find(m => m.id === selectedMaterialId);
      if (mat && finalQuantityNum > mat.estoqueAtual) {
        setInsufficientStockModal({
          isOpen: true,
          available: mat.estoqueAtual,
          requested: finalQuantityNum,
          materialName: mat.descricao
        });
        return;
      }
    }

    let finalQuantidade = finalQuantityNum;
    if (finalQuantidade < 0) {
      finalQuantidade = Math.abs(finalQuantidade);
      showToast('Quantidade negativa convertida para positiva.', type, 'warning');
    }

    const now = new Date();
    const [year, month, day] = dataMovimentacao.split('-').map(Number);
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const movementDate = finalDate.toISOString();

    const movimento: Movimentacao = {
      id: generateId(),
      data: movementDate,
      tipo: type,
      materialId: selectedMaterialId,
      materialDesc: selectedMaterial?.descricao || '',
      quantidade: finalQuantidade,
      precoUnitario: precoUnitario !== '' ? Number(precoUnitario) : undefined,
      ...(type === 'Retirada' ? { os, colaborador, empresa, equipe, liberador, observacoes } : { nf, pedidoCompra, pedidoSap, fornecedor, conferente })
    };

    const result = await addMovimentacao(movimento);

    // Update material price if it's an Entrada
    if (type === 'Entrada' && precoUnitario !== '') {
      updateMaterial(selectedMaterialId, { precoUnitario: Number(precoUnitario) });
    }

    // Show custom Toast notification instead of general alert
    const unitText = formatUnit(selectedMaterial?.unidade) || 'unidade(s)';
    if (result.success) {
      showToast(
        type === 'Retirada'
          ? `Retirada realizada: ${finalQuantidade} ${unitText} de "${selectedMaterial?.descricao || ''}" retirada com sucesso.`
          : `Material registrado: ${finalQuantidade} ${unitText} de "${selectedMaterial?.descricao || ''}" registrado com sucesso.`,
        type
      );
    } else {
      showToast(
        `Atenção: Salvo localmente, mas erro ao sincronizar com Supabase: ${result.error}`,
        type,
        'error'
      );
    }

    // Clear item fields
    setSelectedMaterialId('');
    setQuantidade('1');
    setPrecoUnitario('');
    if (type === 'Entrada') {
      setNf('');
      setPedidoCompra('');
      setPedidoSap('');
      setFornecedor('');
      setConferente('');
    } else {
      setOs('');
      setColaborador('');
      setEmpresa('');
      setEquipe('');
      setLiberador('');
      setObservacoes('');
    }
  };

  const handleAddToBatch = () => {
    const missing: string[] = [];
    
    if (!selectedMaterialId) missing.push('material');
    if (!quantidade || Number(quantidade) === 0) missing.push('quantidade');
    
    if (type === 'Entrada') {
      if (!conferente) missing.push('conferente');
    } else {
      if (!os.trim()) missing.push('os');
      if (!colaborador) missing.push('colaborador');
      if (!liberador) missing.push('liberador');
    }

    if (missing.length > 0) {
      setInvalidFields(missing);
      showToast('Atenção! Faltam campos obrigatórios para o lote.', type, 'warning');
      
      const first = missing[0];
      if (first === 'material') materialRef.current?.focus();
      else if (first === 'quantidade') quantidadeRef.current?.focus();
      else if (first === 'conferente') conferenteRef.current?.focus();
      else if (first === 'os') osRef.current?.focus();
      else if (first === 'colaborador') colaboradorRef.current?.focus();
      else if (first === 'liberador') liberadorRef.current?.focus();
      return;
    }

    const finalQuantityNum = Number(quantidade);

    // Stock check for Retirada
    if (type === 'Retirada') {
      const mat = materiais.find(m => m.id === selectedMaterialId);
      if (mat && finalQuantityNum > mat.estoqueAtual) {
        setInsufficientStockModal({
          isOpen: true,
          available: mat.estoqueAtual,
          requested: finalQuantityNum,
          materialName: mat.descricao
        });
        return;
      }
    }

    let finalQuantidade = finalQuantityNum;
    if (finalQuantidade < 0) {
      finalQuantidade = Math.abs(finalQuantidade);
      showToast('Quantidade negativa convertida para positiva.', type, 'warning');
    }
    
    const now = new Date();
    const [year, month, day] = dataMovimentacao.split('-').map(Number);
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const itemDate = finalDate.toISOString();
    
    const newItem: ItemLote = {
      tempId: generateId(),
      materialId: selectedMaterialId,
      materialDesc: selectedMaterial?.descricao || '',
      quantidade: finalQuantidade,
      precoUnitario: precoUnitario !== '' ? Number(precoUnitario) : undefined,
      detalhesAdicionais: type === 'Retirada' ? { os, colaborador, empresa, equipe, liberador, observacoes } : { nf, pedidoCompra, pedidoSap, fornecedor, conferente },
      data: itemDate
    };

    setBatchItems([...batchItems, newItem]);
    
    // Play sound for adds to batch as well
    playNotificationSound();
    
    // Clear item fields
    setSelectedMaterialId('');
    setQuantidade('1');
  };

  const handleRemoveFromBatch = (tempId: string) => {
    setBatchItems(batchItems.filter(item => item.tempId !== tempId));
    playNotificationSound('delete');
  };

  const handleProcessBatch = async () => {
    if (batchItems.length === 0) return;

    const summaryCount = batchItems.length;
    let failedSyncs = 0;
    let lastError = '';

    for (const item of batchItems) {
      const movimento: Movimentacao = {
        id: generateId(),
        data: item.data || new Date().toISOString(),
        tipo: type,
        materialId: item.materialId,
        materialDesc: item.materialDesc,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        ...item.detalhesAdicionais
      };
      const result = await addMovimentacao(movimento);
      if (!result.success) {
        failedSyncs++;
        lastError = result.error || 'Erro desconhecido';
      }

      // Update material price if it's an Entrada
      if (type === 'Entrada' && item.precoUnitario !== undefined) {
        updateMaterial(item.materialId, { precoUnitario: item.precoUnitario });
      }
    }

    setBatchItems([]);

    // Show custom Toast notification for batch
    if (failedSyncs === 0) {
      showToast(
        type === 'Retirada'
          ? `Lote de retirada concluído: ${summaryCount} material(is) processado(s) com sucesso.`
          : `Lote de registro concluído: ${summaryCount} material(is) registrado(s) com sucesso.`,
        type
      );
    } else {
      showToast(
        `Lote processado: ${summaryCount - failedSyncs} OK, ${failedSyncs} erros de sincronização. Último erro: ${lastError}`,
        type,
        'error'
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
        {/* Form Card */}
      <div className="lg:col-span-1 h-full">
        <div className="card h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Novo Item ({type})</h3>
             {type === 'Entrada' && (
              <button 
                onClick={() => showToast('Funcionalidade de importação de planilhas (Excel/CSV) estará disponível em breve.', 'Entrada', 'warning')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase transition-colors"
                title="Importar planilha de materiais"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Planilha</span>
              </button>
            )}
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col">
             <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Data da Movimentação</label>
              <input 
                type="date" 
                className="input-field cursor-pointer"
                value={dataMovimentacao}
                onChange={(e) => setDataMovimentacao(e.target.value)}
              />
             </div>

             <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                Material <span className="text-red-500">*</span>
              </label>
              <MaterialSelect 
                ref={materialRef}
                materials={materiais}
                selectedId={selectedMaterialId}
                onSelect={(id) => handleMaterialChange(id)}
                fornecedores={fornecedores}
                invalid={invalidFields.includes('material')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input 
                  ref={quantidadeRef}
                  type="number" 
                  className={`input-field transition-all duration-300 ${invalidFields.includes('quantidade') ? 'ring-2 ring-red-600 border-red-600 bg-red-100 animate-error-pulse' : ''}`}
                  value={quantidade}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantidade(val);
                    if (val && Number(val) !== 0) clearInvalidField('quantidade');
                  }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Unidade</label>
                <div className="h-8 flex items-center px-3 text-[12px] bg-slate-50 border border-brand-border rounded-xl text-slate-500">
                  {selectedMaterial ? formatUnit(selectedMaterial.unidade) : '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Valor Unitário (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-field" 
                  value={precoUnitario}
                  onChange={(e) => setPrecoUnitario(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Valor Total (R$)</label>
                <div className={`input-field h-8 flex items-center font-bold ${type === 'Retirada' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {type === 'Retirada' ? '- ' : ''}R${((Number(quantidade) || 0) * (Number(precoUnitario) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {type === 'Retirada' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">COD SAP</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50 text-slate-500 font-mono" 
                      value={selectedMaterial?.sap || ''} 
                      readOnly 
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                      Nº da OS <span className="text-red-500">*</span>
                    </label>
                    <input 
                      ref={osRef}
                      type="text" 
                      className={`input-field transition-all duration-300 ${invalidFields.includes('os') ? 'ring-2 ring-red-600 border-red-600 bg-red-100 animate-error-pulse' : ''}`} 
                      value={os} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setOs(val);
                        if (val.trim()) clearInvalidField('os');
                      }}
                      placeholder="OS-0000" 
                    />
                  </div>
                </div>
                <div>
                  <ColaboradorSelect
                    ref={colaboradorRef}
                    label="Retirante"
                    required
                    placeholder="Selecione o retirante"
                    value={colaborador}
                    onChange={handleColaboradorChange}
                    colaboradores={colaboradores}
                    error={invalidFields.includes('colaborador')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe</label>
                    <select className="input-field" value={equipe} onChange={(e) => handleEquipeChange(e.target.value)}>
                      <option value="">Selecione</option>
                      {equipes
                        .slice()
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                        .map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)
                      }
                    </select>

                  </div>
                  <div>
                    <ColaboradorSelect
                      ref={liberadorRef}
                      label="Liberador"
                      required
                      placeholder="Selecione"
                      value={liberador}
                      onChange={(val) => {
                        setLiberador(val);
                        if (val) clearInvalidField('liberador');
                      }}
                      colaboradores={colaboradores.filter(c => ["TST", "GESTOR", "SUPERVISOR", "ENCARREGADO"].includes(c.cargo))}
                      error={invalidFields.includes('liberador')}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nº Nota Fiscal (NF)</label>
                    <input type="text" className="input-field" value={nf} onChange={(e) => setNf(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nº PEDIDO COD SAP</label>
                    <input type="text" className="input-field" value={pedidoSap} onChange={(e) => setPedidoSap(e.target.value)} placeholder="Ex: COD SAP-1234" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fornecedor</label>
                  <select 
                    className="input-field" 
                    value={fornecedor} 
                    onChange={(e) => setFornecedor(e.target.value)}
                  >
                    <option value="">Selecione o fornecedor</option>
                    {fornecedores
                      .slice()
                      .sort((a, b) => a.nomeFantasia.localeCompare(b.nomeFantasia))
                      .map(f => (
                        <option key={f.id} value={f.nomeFantasia}>{f.nomeFantasia}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <ColaboradorSelect
                    ref={conferenteRef}
                    label="Recebedor"
                    required
                    placeholder="Selecione o recebedor"
                    value={conferente}
                    onChange={(val) => {
                      setConferente(val);
                      if (val) clearInvalidField('conferente');
                    }}
                    colaboradores={colaboradores}
                    error={invalidFields.includes('conferente')}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 mt-auto pt-4">
              <button 
                onClick={handleDirectProcess}
                className={`flex-1 flex items-center justify-center gap-2 font-bold text-xs h-10 rounded-xl transition-all shadow-sm ${type === 'Retirada' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                <Rocket className="w-4 h-4" />
                {type === 'Retirada' ? 'Retirar' : 'Registrar'}
              </button>
              <button 
                onClick={handleAddToBatch}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Lote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Table */}
      <div className="lg:col-span-2 h-full">
        <div className="card h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lote em Preparação</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">
              {batchItems.length} ITENS
            </span>
          </div>

          <div className="overflow-auto min-h-[300px] flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 backdrop-blur-sm shadow-sm">
                  <th className="table-header">Material</th>
                  <th className="table-header">Qtd.</th>
                  <th className="table-header text-right">V. Unit</th>
                  <th className="table-header">{type === 'Retirada' ? 'OS' : 'Nº PEDIDO COD SAP'}</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody>
                {batchItems.map((item) => (
                  <tr key={item.tempId} className={`table-row ${type === 'Retirada' ? 'text-red-600' : 'text-emerald-600'}`}>
                    <td className="px-3 py-2 font-semibold">{item.materialDesc}</td>
                    <td className="px-3 py-2 font-mono">{item.quantidade}</td>
                    <td className={`px-3 py-2 text-right font-mono text-[11px] ${type === 'Retirada' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {type === 'Retirada' ? '- ' : ''}{item.precoUnitario ? `R$${item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className={`px-3 py-2 ${type === 'Retirada' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {type === 'Retirada' ? item.detalhesAdicionais.os : (item.detalhesAdicionais.pedidoSap || item.detalhesAdicionais.nf)}
                    </td>
                    <td className="px-3 py-2">
                      <button 
                        onClick={() => handleRemoveFromBatch(item.tempId)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {batchItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-400 italic">
                      Lote vazio. Adicione itens para processar a {type}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto pt-6 border-t border-brand-border flex justify-end gap-3">
             <button 
                onClick={() => setBatchItems([])}
                className="btn-secondary"
                disabled={batchItems.length === 0}
              >
                Limpar Lote
              </button>
              <button 
                onClick={handleProcessBatch}
                className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={batchItems.length === 0}
              >
                <Rocket className="w-4 h-4" />
                Processar Lote
              </button>
          </div>
        </div>
      </div>
    </div>

      {/* Toast notifications container */}
      {/* Modals outside the toast container for proper layering */}
      <AnimatePresence>
        {showStockWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          >
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-center text-red-600">ITEM ZERADO</h2>
              </div>
              <p className="text-center text-slate-600 leading-relaxed">
                Este item não possui estoque disponível para retirada. Deseja realizar uma entrada no estoque agora?
              </p>
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => {
                    setShowStockWarning(false);
                    setSelectedMaterialId('');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Não
                </button>
                <button 
                  onClick={() => {
                    setShowStockWarning(false);
                    setView('entrada-materiais');
                  }}
                  className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-200"
                >
                  Sim
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {insufficientStockModal?.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          >
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-black text-center text-slate-800 uppercase tracking-tight">Estoque Insuficiente</h2>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Material: <span className="text-slate-900">{insufficientStockModal.materialName}</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitado</p>
                    <p className="text-lg font-black text-red-600">{insufficientStockModal.requested}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Disponível</p>
                    <p className="text-lg font-black text-emerald-600">{insufficientStockModal.available}</p>
                  </div>
                </div>
              </div>

              <p className="text-center text-slate-500 text-sm leading-relaxed">
                Você está tentando retirar mais do que possui. Deseja realizar uma <strong>Entrada</strong> para acertar o estoque ou retirar apenas o <strong>saldo de {insufficientStockModal.available}</strong>?
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => {
                    setView('entrada-materiais');
                    setInsufficientStockModal(null);
                  }}
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  ACERTAR ESTOQUE (FAZER ENTRADA)
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setQuantidade(insufficientStockModal.available);
                      setInsufficientStockModal(null);
                      showToast(`Quantidade ajustada para o saldo disponível (${insufficientStockModal.available}).`, 'Retirada', 'success');
                    }}
                    className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors border border-blue-100"
                  >
                    RETIRAR {insufficientStockModal.available}
                  </button>
                  <button 
                    onClick={() => setInsufficientStockModal(null)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto w-full bg-white rounded-xl shadow-lg border p-4 flex gap-3 items-start transition-all ${
                t.severity === 'error' ? 'border-l-4 border-l-red-600 border-red-200' :
                t.type === 'Retirada' 
                  ? 'border-l-4 border-l-orange-500 border-orange-100' 
                  : t.severity === 'warning' ? 'border-l-4 border-l-yellow-500 border-yellow-100' : 'border-l-4 border-l-emerald-500 border-emerald-100'
              }`}
            >
              <div className="flex-shrink-0">
                {t.severity === 'error' ? (
                  <div className="p-1.5 rounded-full bg-red-100 text-red-600">
                    <X className="w-5 h-5 font-bold" />
                  </div>
                ) : t.type === 'Retirada' ? (
                  <div className="p-1.5 rounded-full bg-orange-50 text-orange-600">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-xs font-bold leading-none ${
                    t.severity === 'error' ? 'text-red-700' :
                    t.type === 'Retirada' ? 'text-orange-700' : 'text-emerald-700'
                  }`}>
                  {t.severity === 'error' ? 'Erro de Sincronização' : t.type === 'Retirada' ? 'Retirada de Material' : 'Registro de Entrada'}
                </p>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal font-semibold">
                  {t.message}
                </p>
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 pointer-events-auto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
