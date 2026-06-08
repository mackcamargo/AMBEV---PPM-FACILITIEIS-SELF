import React, { useState, useEffect, useRef } from 'react';
import { Plus, Rocket, Trash2, Search, CheckCircle2, AlertTriangle, X, ArrowUpRight, ArrowDownLeft, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../lib/store';
import { Material, ItemLote, Movimentacao, formatUnit } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playNotificationSound } from '../lib/audio';

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
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'Entrada' | 'Retirada' }[]>([]);
  const [showStockWarning, setShowStockWarning] = useState(false);
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
  const materialRef = useRef<HTMLSelectElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const osRef = useRef<HTMLInputElement>(null);
  const colaboradorRef = useRef<HTMLSelectElement>(null);
  const liberadorRef = useRef<HTMLSelectElement>(null);
  const conferenteRef = useRef<HTMLSelectElement>(null);

  // Clear invalid status for a specific field when data is provided
  const clearInvalidField = (field: string) => {
    setInvalidFields(prev => prev.filter(f => f !== field));
  };

  useEffect(() => {
    if (showStockWarning) {
      playNotificationSound('warning');
    }
  }, [showStockWarning]);

  const showToast = (message: string, toastType: 'Entrada' | 'Retirada', soundType: 'success' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type: toastType }]);
    
    // Play sound based on soundType
    playNotificationSound(soundType);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
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
      if (colabObj.equipe) {
        setEquipe(colabObj.equipe);
      }
      if (colabObj.empresa) {
        setEmpresa(colabObj.empresa);
      }
    }
  };

  const handleEquipeChange = (newEquipe: string) => {
    setEquipe(newEquipe);
    // If current collaborator doesn't belong to the new team, reset it
    const currentColab = colaboradores.find(c => c.nome === colaborador);
    if (currentColab && currentColab.equipe !== newEquipe) {
      setColaborador('');
    }
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
      
      // Auto-select team for Retirada
      if (type === 'Retirada' && mat.equipe) {
        setEquipe(mat.equipe);
        // Clear collaborator if they don't belong to the new team
        setColaborador('');
      }
    } else {
      setPrecoUnitario('');
    }
  };

  const handleDirectProcess = () => {
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

    let finalQuantidade = Number(quantidade);
    if (finalQuantidade < 0) {
      finalQuantidade = Math.abs(finalQuantidade);
      showToast('Quantidade negativa convertida para positiva.', type, 'warning');
    }

    const now = new Date();
    const [year, month, day] = dataMovimentacao.split('-').map(Number);
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const movementDate = finalDate.toISOString();

    const movimento: Movimentacao = {
      id: Math.random().toString(36).substr(2, 9),
      data: movementDate,
      tipo: type,
      materialId: selectedMaterialId,
      materialDesc: selectedMaterial?.descricao || '',
      quantidade: finalQuantidade,
      precoUnitario: precoUnitario !== '' ? Number(precoUnitario) : undefined,
      ...(type === 'Retirada' ? { os, colaborador, empresa, equipe, liberador, observacoes } : { nf, pedidoCompra, pedidoSap, fornecedor, conferente })
    };

    addMovimentacao(movimento);

    // Update material price if it's an Entrada
    if (type === 'Entrada' && precoUnitario !== '') {
      updateMaterial(selectedMaterialId, { precoUnitario: Number(precoUnitario) });
    }

    // Show custom Toast notification instead of general alert
    const unitText = formatUnit(selectedMaterial?.unidade) || 'unidade(s)';
    showToast(
      type === 'Retirada'
        ? `Retirada realizada: ${finalQuantidade} ${unitText} de "${selectedMaterial?.descricao || ''}" retirada com sucesso.`
        : `Material registrado: ${finalQuantidade} ${unitText} de "${selectedMaterial?.descricao || ''}" registrado com sucesso.`,
      type
    );

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

    let finalQuantidade = Number(quantidade);
    if (finalQuantidade < 0) {
      finalQuantidade = Math.abs(finalQuantidade);
      showToast('Quantidade negativa convertida para positiva.', type, 'warning');
    }
    
    const now = new Date();
    const [year, month, day] = dataMovimentacao.split('-').map(Number);
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const itemDate = finalDate.toISOString();
    
    const newItem: ItemLote = {
      tempId: Math.random().toString(36).substr(2, 9),
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

  const handleProcessBatch = () => {
    if (batchItems.length === 0) return;

    const summaryCount = batchItems.length;

    batchItems.forEach(item => {
      const movimento: Movimentacao = {
        id: Math.random().toString(36).substr(2, 9),
        data: item.data || new Date().toISOString(),
        tipo: type,
        materialId: item.materialId,
        materialDesc: item.materialDesc,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        ...item.detalhesAdicionais
      };
      addMovimentacao(movimento);

      // Update material price if it's an Entrada
      if (type === 'Entrada' && item.precoUnitario !== undefined) {
        updateMaterial(item.materialId, { precoUnitario: item.precoUnitario });
      }
    });

    setBatchItems([]);

    // Show custom Toast notification for batch
    showToast(
      type === 'Retirada'
        ? `Lote de retirada concluído: ${summaryCount} material(is) processado(s) com sucesso.`
        : `Lote de registro concluído: ${summaryCount} material(is) registrado(s) com sucesso.`,
      type
    );
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
              <select 
                ref={materialRef}
                className={`input-field transition-all duration-300 ${invalidFields.includes('material') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`}
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
              >
                <option value="">Selecione o Material</option>
                {materiais
                  .slice()
                  .sort((a, b) => a.descricao.localeCompare(b.descricao))
                  .map(m => {
                    const fornName = fornecedores.find(f => f.id === m.fornecedorId)?.nomeFantasia;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.descricao} {fornName ? `(${fornName})` : ''} - COD SAP: {m.sap} ({m.estoqueAtual} {formatUnit(m.unidade)})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input 
                  ref={quantidadeRef}
                  type="number" 
                  className={`input-field transition-all duration-300 ${invalidFields.includes('quantidade') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`}
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
                <div className="h-8 flex items-center px-3 text-[12px] bg-slate-50 border border-brand-border rounded text-slate-500">
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
                <div className={`input-field h-8 flex items-center font-bold ${type === 'Retirada' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {type === 'Retirada' ? '- ' : ''}R$ {((Number(quantidade) || 0) * (Number(precoUnitario) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      className={`input-field transition-all duration-300 ${invalidFields.includes('os') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
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
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                    Retirante <span className="text-red-500">*</span>
                  </label>
                  <select 
                    ref={colaboradorRef}
                    className={`input-field transition-all duration-300 ${invalidFields.includes('colaborador') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
                    value={colaborador} 
                    onChange={(e) => handleColaboradorChange(e.target.value)}
                  >
                    <option value="">Selecione o retirante</option>
                    {colaboradores
                      .filter(c => c.status === 'Ativo' && (!equipe || c.equipe === equipe))
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe</label>
                    <select className="input-field" value={equipe} onChange={(e) => handleEquipeChange(e.target.value)}>
                      <option value="">Selecione</option>
                      {equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                      Liberador <span className="text-red-500">*</span>
                    </label>
                    <select 
                      ref={liberadorRef}
                      className={`input-field transition-all duration-300 ${invalidFields.includes('liberador') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
                      value={liberador} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setLiberador(val);
                        if (val) clearInvalidField('liberador');
                      }}
                    >
                      <option value="">Selecione</option>
                      {colaboradores
                        .filter(c => c.status === 'Ativo')
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))
                      }
                    </select>
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
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
                    Recebedor <span className="text-red-500">*</span>
                  </label>
                  <select 
                    ref={conferenteRef}
                    className={`input-field transition-all duration-300 ${invalidFields.includes('conferente') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
                    value={conferente} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setConferente(val);
                      if (val) clearInvalidField('conferente');
                    }}
                  >
                    <option value="">Selecione o recebedor</option>
                    {colaboradores
                      .filter(c => c.status === 'Ativo')
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))
                    }
                  </select>
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
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
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
                      {type === 'Retirada' ? '- ' : ''}{item.precoUnitario ? `R$ ${item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
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

      {/* Toast notifications container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto w-full bg-white rounded-xl shadow-lg border p-4 flex gap-3 items-start transition-all ${
                t.type === 'Retirada' 
                  ? 'border-l-4 border-l-red-500 border-red-100' 
                  : 'border-l-4 border-l-emerald-500 border-emerald-100'
              }`}
            >
              <div className="flex-shrink-0">
                {t.type === 'Retirada' ? (
                  <div className="p-1.5 rounded-full bg-red-50 text-red-600">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-xs font-bold leading-none ${t.type === 'Retirada' ? 'text-red-700' : 'text-emerald-700'}`}>
                  {t.type === 'Retirada' ? 'Retirada de Material' : 'Registro de Entrada'}
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
          {showStockWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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
                      // Update material stock: In this app's "simulated" behavior for this request, 
                      // if they say "Sim" to "register entrance" for a 0-stock item,
                      // we simulate adding 1 to it so it's not zerado anymore,
                      // and then redirect to Entrada view.
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
        </AnimatePresence>
      </div>

      </div>
    </div>
  );
};
