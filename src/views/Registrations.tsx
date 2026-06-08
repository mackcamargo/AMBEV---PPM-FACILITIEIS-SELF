import React, { useState } from 'react';
import { useApp } from '../lib/store';
import { Save, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle2, Info, AlertCircle, Sparkles, Database, Share2, Printer, Download, Mail, Eye } from 'lucide-react';
import { Material } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import { playNotificationSound } from '../lib/audio';

export const RegistrationView: React.FC<{ type: 'materiais' | 'empresas' | 'fornecedores' | 'colaboradores' | 'equipes' }> = ({ type }) => {
  const store = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controlled form state
  const [formData, setFormData] = useState<any>({});
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEmailChoiceModalOpen, setIsEmailChoiceModalOpen] = useState(false);
  const [shareType, setShareType] = useState<'single' | 'list'>('single');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deletionPasswordInput, setDeletionPasswordInput] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Custom toast notifications list
  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'error' | 'delete';
    sap?: string;
    equipe?: string;
  }[]>([]);

  // Reset form when type changes to avoid data persistence between different views
  React.useEffect(() => {
    setInvalidFields([]);
    if (type === 'materiais') {
      setFormData({ unidade: 'un' });
    } else {
      setFormData({});
    }
  }, [type]);

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const addToast = (title: string, message: string, toastType: 'success' | 'info' | 'error' | 'delete' = 'success', extra?: { sap?: string; equipe?: string }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type: toastType === 'delete' ? 'info' : toastType as any, ...extra }]);

    // Play sound based on toast type
    if (toastType === 'success') {
      playNotificationSound('success');
    } else if (toastType === 'delete') {
      playNotificationSound('delete');
    } else {
      playNotificationSound('warning');
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Auto-fill matricula, codigoFornecedor, and codigoEquipe
  React.useEffect(() => {
    if (type === 'colaboradores' && !formData.matricula) {
      const nextId = store.colaboradores.length + 1;
      const autoMatricula = `COL-${nextId.toString().padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, matricula: autoMatricula }));
    }
    if (type === 'fornecedores' && !formData.codigoFornecedor) {
      const nextId = store.fornecedores.length + 1;
      const autoCodigo = `FORN-${nextId.toString().padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, codigoFornecedor: autoCodigo }));
    }
    if (type === 'equipes' && !formData.codigoEquipe) {
      const nextId = store.equipes.length + 1;
      const autoCodigo = `EQP-${nextId.toString().padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, codigoEquipe: autoCodigo }));
    }
    if (type === 'empresas' && !formData.codigoEmpresa) {
      const nextId = store.empresas.length + 1;
      const autoCodigo = `EMP-${nextId.toString().padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, codigoEmpresa: autoCodigo }));
    }
  }, [type, formData.matricula, formData.codigoFornecedor, formData.codigoEquipe, formData.codigoEmpresa, store.colaboradores.length, store.fornecedores.length, store.equipes.length, store.empresas.length]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (Object.keys(formData).length === 0 && type !== 'materiais') {
      addToast('Erro de Cadastro', 'Preencha os campos obrigatórios para continuar.', 'error');
      return;
    }

    // Specific validation per type with sound-enabled notifications
    if (type === 'materiais') {
      const missing = [];
      const missingKeys = [];
      if (!formData.sap) { missing.push('COD SAP'); missingKeys.push('sap'); }
      if (!formData.descricao) { missing.push('Descrição'); missingKeys.push('descricao'); }
      if (!formData.unidade) { missing.push('Unidade'); missingKeys.push('unidade'); }
      if (!formData.equipe) { missing.push('Equipe'); missingKeys.push('equipe'); }
      if (!formData.fornecedorId) { missing.push('Fornecedor'); missingKeys.push('fornecedorId'); }
      
      if (missing.length > 0) {
        setInvalidFields(missingKeys);
        addToast('Campo(s) Faltando', `Atenção! Faltam os campos: ${missing.join(', ')}`, 'error');
        return;
      }
    } else if (type === 'colaboradores') {
      if (!formData.nome) { setInvalidFields(['nome']); addToast('Erro', 'Informe o Nome do Colaborador.', 'error'); return; }
    } else if (type === 'equipes') {
      if (!formData.nome) { setInvalidFields(['nome']); addToast('Erro', 'Informe o Nome da Equipe.', 'error'); return; }
    } else if (type === 'empresas') {
      if (!formData.razaoSocial) { setInvalidFields(['razaoSocial']); addToast('Erro', 'Informe a Razão Social.', 'error'); return; }
    } else if (type === 'fornecedores') {
      if (!formData.nomeFantasia) { setInvalidFields(['nomeFantasia']); addToast('Erro', 'Informe o Nome Fantasia.', 'error'); return; }
    }
    
    setInvalidFields([]);

    switch(type) {
      case 'materiais': {
        const materialName = formData.descricao || 'Novo Material';
        const sapCode = formData.sap || 'Não informado';
        const equipeName = formData.equipe || store.equipes[0]?.nome || 'Sem equipe';
        
        store.addMaterial({
          sap: formData.sap || '',
          codigoFornecedor: formData.codigoFornecedor || '',
          fornecedorId: formData.fornecedorId || '',
          descricao: materialName,
          unidade: formData.unidade || 'un',
          estoqueMinimo: Number(formData.estoqueMinimo) || 0,
          estoqueIdeal: Number(formData.estoqueIdeal) || 0,
          estoqueAtual: Number(formData.estoqueAtual) || 0,
          precoUnitario: Number(formData.precoUnitario) || 0,
          equipe: equipeName,
          localizacao: formData.localizacao || '',
          detalhes: formData.detalhes || '',
          ultimaMovimentacao: new Date().toLocaleDateString('pt-BR')
        });

        addToast(
          'Material Cadastrado!',
          materialName,
          'success',
          { sap: sapCode, equipe: equipeName }
        );
        break;
      }
      case 'colaboradores': {
        const nomeColab = formData.nome || 'Novo Colaborador';
        store.addColaborador({
          matricula: formData.matricula || '',
          nome: nomeColab,
          empresa: formData.empresa || '',
          equipe: formData.equipe || store.equipes[0]?.nome || '',
          cargo: formData.cargo || '',
          contato: formData.contato || '',
          status: formData.status || 'Ativo'
        });
        addToast('Colaborador Cadastrado!', nomeColab, 'success');
        break;
      }
      case 'equipes': {
        const nomeEquipe = formData.nome || 'Nova Equipe';
        store.addEquipe({
          codigoEquipe: formData.codigoEquipe || '',
          nome: nomeEquipe,
          centroCusto: formData.centroCusto || '',
          gestor: formData.gestor || '',
          cor: formData.cor || '#000000',
          verbaDestinada: Number(formData.verbaDestinada) || 0,
          saldoAtualizado: Number(formData.saldoAtualizado) || 0
        });
        addToast('Equipe Cadastrada!', nomeEquipe, 'success');
        break;
      }
      case 'empresas': {
        const razaoSocial = formData.razaoSocial || 'Nova Empresa';
        store.addEmpresa({
          razaoSocial,
          cnpj: formData.cnpj || '00.000.000/0000-00',
          numContrato: formData.numContrato || '',
          areaAtuacao: formData.areaAtuacao || '',
          emailComercial: formData.emailComercial || '',
          detalhes: formData.detalhes || '',
          codigoEmpresa: formData.codigoEmpresa || '',
          status: 'Ativo'
        });
        addToast('Empresa Cadastrada!', razaoSocial, 'success');
        break;
      }
      case 'fornecedores': {
        const nomeFantasia = formData.nomeFantasia || 'Novo Fornecedor';
        store.addFornecedor({
          nomeFantasia,
          cnpj: formData.cnpj || '',
          email: formData.email || '',
          telefone: formData.telefone || '',
          codigoFornecedor: formData.codigoFornecedor || '',
          categoria: formData.categoria || 'Geral',
          detalhes: formData.detalhes || ''
        });
        addToast('Fornecedor Cadastrado!', nomeFantasia, 'success');
        break;
      }
    }

    setFormData({});
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    setEditFormData({ ...item });
    setIsEditModalOpen(true);
  };

  const handleShareClick = (item: any) => {
    setSelectedItem(item);
    setShareType('single');
    setIsShareModalOpen(true);
  };

  const handleShareStock = () => {
    setShareType('list');
    setIsShareModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setDeletionPasswordInput('');
    setIsDeleteModalOpen(true);
  };

  const handleUpdate = () => {
    if (selectedItem) {
      // Security check for budget (Verba) changes if applicable
      if (type === 'equipes' && store.isDeletionPasswordEnabled && store.deletionPassword) {
        const isBudgetChanged = editFormData.verbaDestinada !== selectedItem.verbaDestinada || 
                               editFormData.saldoAtualizado !== selectedItem.saldoAtualizado;
        
        if (isBudgetChanged && deletionPasswordInput !== store.deletionPassword) {
           addToast('Segurança VRL', 'Senha de autorização necessária para alterar orçamentos.', 'error');
           return;
        }
      }

      // Validation for updates too
      if (type === 'materiais') {
        const missing = [];
        if (!editFormData.sap) missing.push('COD SAP');
        if (!editFormData.descricao) missing.push('Descrição');
        
        if (missing.length > 0) {
          addToast('Campos Pendentes', `Não foi possível salvar. Faltam: ${missing.join(', ')}`, 'error');
          return;
        }
      }

      let label = '';
      switch(type) {
        case 'materiais': 
          store.updateMaterial(selectedItem.id, editFormData); 
          label = editFormData.descricao || 'Material';
          break;
        case 'colaboradores': 
          store.updateColaborador(selectedItem.id, editFormData); 
          label = editFormData.nome || 'Colaborador';
          break;
        case 'equipes': 
          store.updateEquipe(selectedItem.id, editFormData); 
          label = editFormData.nome || 'Equipe';
          break;
        case 'fornecedores': 
          store.updateFornecedor(selectedItem.id, editFormData); 
          label = editFormData.nomeFantasia || 'Fornecedor';
          break;
        case 'empresas': 
          store.updateEmpresa(selectedItem.id, editFormData); 
          label = editFormData.razaoSocial || 'Empresa';
          break;
      }
      setIsEditModalOpen(false);
      setSelectedItem(null);
      addToast('Cadastro Atualizado!', label, 'success');
    }
  };

  const generateMaterialShareMessage = (item: any) => {
    const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || item.codigoFornecedor || '-';
    return `📦 *MATERIAL CADASTRADO*\n\n*Descrição:* ${item.descricao}\n*COD SAP:* ${item.sap}\n*Fornecedor:* ${forn}\n*Equipe:* ${item.equipe}\n*Unidade:* ${item.unidade}\n*Estoque Atual:* ${item.estoqueAtual}\n*Localização:* ${item.localizacao || 'Não informada'}\n\n_Enviado via PPM App_`;
  };

  const generateStockShareMessage = () => {
    const s = searchTerm.toLowerCase();
    const data = store.materiais.filter(item => {
      if (!s) return true;
      const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || '';
      return (item.sap?.toLowerCase().includes(s) || 
              item.descricao?.toLowerCase().includes(s) || 
              item.equipe?.toLowerCase().includes(s) ||
              forn.toLowerCase().includes(s));
    });

    let message = `📊 *ESTOQUE ATUAL - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;
    data.forEach(item => {
      message += `• ${item.descricao}\n  - SAP: ${item.sap}\n  - Qtd: ${item.estoqueAtual} ${item.unidade}\n\n`;
    });
    message += `_Total de ${data.length} itens listados._`;
    return message;
  };

  const shareViaWhatsApp = () => {
    const text = "Cadastro Atual\n\n" + (shareType === 'single' ? generateMaterialShareMessage(selectedItem) : generateStockShareMessage());
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };



  const shareViaEmailChoice = (e: React.MouseEvent, provider: 'gmail' | 'outlook') => {
    e.stopPropagation();
    const subject = "Cadastro Atual";
    const text = shareType === 'single' ? generateMaterialShareMessage(selectedItem) : generateStockShareMessage();
    let formattedBody = text.replace(/\n/g, '\r\n');
    
    // Truncate to avoid 404 / URL too long errors
    if (formattedBody.length > 1500) {
      formattedBody = formattedBody.substring(0, 1500) + "\n\n...[Mensagem truncada devido ao tamanho. Baixe o CSV para ver tudo.]";
    }

    let url = "";

    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    } else {
      url = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    }
    window.open(url, '_blank');
    setIsEmailChoiceModalOpen(false);
  };

  const initiateEmailShare = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      shareViaEmail();
    } else {
      setIsEmailChoiceModalOpen(true);
    }
  };

  const shareViaEmail = () => {
    const subject = "Cadastro Atual";
    const text = shareType === 'single' ? generateMaterialShareMessage(selectedItem) : generateStockShareMessage();
    const formattedBody = text.replace(/\n/g, '\r\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
  };

  const handleGlobalShare = async () => {
    const subject = "Cadastro Atual";
    const text = shareType === 'single' ? generateMaterialShareMessage(selectedItem) : generateStockShareMessage();
    
    const shareData = {
      title: subject,
      text: text
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback or explicit instruction
        shareViaEmail();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback
      shareViaEmail();
    }
  };

  const downloadStockSpreadsheet = () => {
    const s = searchTerm.toLowerCase();
    const data = store.materiais.filter(item => {
      if (!s) return true;
      const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || '';
      return (item.sap?.toLowerCase().includes(s) || 
              item.descricao?.toLowerCase().includes(s) || 
              item.equipe?.toLowerCase().includes(s) ||
              forn.toLowerCase().includes(s));
    });

    const csvContent = [
      ['COD SAP', 'FORNECEDOR', 'DESCRIÇÃO', 'EQUIPE', 'ESTOQUE ATUAL', 'UNIDADE', 'LOCALIZAÇÃO'],
      ...data.map(item => {
        const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || item.codigoFornecedor || '';
        return [
          item.sap,
          forn,
          item.descricao,
          item.equipe,
          item.estoqueAtual,
          item.unidade,
          item.localizacao || ''
        ];
      })
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Estoque_Materiais_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleConfirmBulkDelete = () => {
    if (store.isDeletionPasswordEnabled && store.deletionPassword && deletionPasswordInput !== store.deletionPassword) {
      addToast('Senha Incorreta', 'A senha informada para exclusão é inválida.', 'error');
      return;
    }

    selectedIds.forEach(id => {
      switch(type) {
        case 'materiais': store.deleteMaterial(id); break;
        case 'colaboradores': store.deleteColaborador(id); break;
        case 'equipes': store.deleteEquipe(id); break;
        case 'fornecedores': store.deleteFornecedor(id); break;
        case 'empresas': store.deleteEmpresa(id); break;
      }
    });

    addToast('Excluídos', `${selectedIds.length} itens foram removidos.`, 'delete');
    setIsBulkDeleteModalOpen(false);
    setSelectedItem(null);
    setSelectedIds([]);
    setDeletionPasswordInput('');
  };

  const handleConfirmDelete = () => {
    if (selectedItem) {
      if (store.isDeletionPasswordEnabled && store.deletionPassword && deletionPasswordInput !== store.deletionPassword) {
        addToast('Senha Incorreta', 'A senha informada para exclusão é inválida.', 'error');
        return;
      }

      let label = '';
      switch(type) {
        case 'materiais': 
          store.deleteMaterial(selectedItem.id); 
          label = selectedItem.descricao || 'Material';
          break;
        case 'colaboradores': 
          store.deleteColaborador(selectedItem.id); 
          label = selectedItem.nome || 'Colaborador';
          break;
        case 'equipes': 
          store.deleteEquipe(selectedItem.id); 
          label = selectedItem.nome || 'Equipe';
          break;
        case 'fornecedores': 
          store.deleteFornecedor(selectedItem.id); 
          label = selectedItem.nomeFantasia || 'Fornecedor';
          break;
        case 'empresas': 
          store.deleteEmpresa(selectedItem.id); 
          label = selectedItem.razaoSocial || 'Empresa';
          break;
      }
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      addToast('Cadastro Removido!', label, 'delete');
    }
  };

  const renderMateriaisForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          COD SAP <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('sap') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          placeholder="Ex: 50104266" 
          value={formData.sap || ''}
          onChange={(e) => handleInputChange('sap', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">Fornecedor <span className="text-red-500">*</span></label>
        <select 
          className={`input-field pr-8 transition-all duration-300 ${invalidFields.includes('fornecedorId') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`}
          value={formData.fornecedorId || ''}
          onChange={(e) => handleInputChange('fornecedorId', e.target.value)}
        >
          <option value="">Selecione o Fornecedor...</option>
          {store.fornecedores.map((f, idx) => (
            <option key={`${f.id}_${idx}`} value={f.id}>{f.nomeFantasia}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Fornecedor</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ex: 75151212"
          value={formData.codigoFornecedor || ''}
          onChange={(e) => handleInputChange('codigoFornecedor', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">Unidade <span className="text-red-500">*</span></label>
        <select 
          className={`input-field pr-8 transition-all duration-300 ${invalidFields.includes('unidade') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`}
          value={formData.unidade || 'un'}
          onChange={(e) => handleInputChange('unidade', e.target.value)}
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
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">Equipe <span className="text-red-500">*</span></label>
        <select 
          className={`input-field pr-8 transition-all duration-300 ${invalidFields.includes('equipe') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`}
          value={formData.equipe || ''}
          onChange={(e) => handleInputChange('equipe', e.target.value)}
        >
          <option value="">Selecione...</option>
          {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Atual</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="0" 
          value={formData.estoqueAtual === undefined ? '' : formData.estoqueAtual}
          onChange={(e) => handleInputChange('estoqueAtual', Number(e.target.value))}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          Descrição Completa <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('descricao') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          placeholder="Ex: TORNEIRA COMUM 1/2 BEBEDOURO" 
          value={formData.descricao || ''}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Min.</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="5" 
          value={formData.estoqueMinimo || ''}
          onChange={(e) => handleInputChange('estoqueMinimo', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Ideal</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="10" 
          value={formData.estoqueIdeal || ''}
          onChange={(e) => handleInputChange('estoqueIdeal', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Preço Unitário (R$)</label>
        <input 
          type="number" 
          step="0.01" 
          className="input-field" 
          placeholder="0,00" 
          value={formData.precoUnitario || ''}
          onChange={(e) => handleInputChange('precoUnitario', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Localização</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Corredor A / Prateleira 2" 
          value={formData.localizacao || ''}
          onChange={(e) => handleInputChange('localizacao', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes / Observação</label>
        <textarea 
          className="input-field min-h-[60px] py-2" 
          placeholder="Observações adicionais..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderColaboradoresForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Matrícula / ID</label>
        <input 
          type="text" 
          className="input-field bg-slate-50 font-mono" 
          value={formData.matricula || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe Vinculada</label>
        <select 
          className="input-field pr-8"
          value={formData.equipe || ''}
          onChange={(e) => handleInputChange('equipe', e.target.value)}
        >
          <option value="">Selecione...</option>
          {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          Nome Completo <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('nome') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Empresa</label>
        <select 
          className="input-field pr-10" 
          value={formData.empresa || ''}
          onChange={(e) => handleInputChange('empresa', e.target.value)}
        >
          <option value="">Selecione o Parceiro / Empresa...</option>
          {store.empresas.map((emp, idx) => (
            <option key={`${emp.id}_${idx}`} value={emp.razaoSocial}>
              {emp.razaoSocial}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Contato (Telefone)</label>
        <input 
          type="text" 
          className="input-field" 
          value={formData.contato || ''}
          onChange={(e) => handleInputChange('contato', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cargo / Função</label>
        <select 
          className="input-field pr-8"
          value={formData.cargo || ''}
          onChange={(e) => handleInputChange('cargo', e.target.value)}
        >
          <option value="">Selecione...</option>
          {["ADM", "AJUDANTE", "ENCARREGADO", "GESSEIRO", "GESTOR", "MECÂNICO", "OUTROS", "PEDREIRO", "PINTOR", "SUPERVISOR", "TST"].map(cargo => (
            <option key={cargo} value={cargo}>{cargo}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Status</label>
        <select 
          className="input-field pr-8"
          value={formData.status || 'Ativo'}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="Ativo">Ativo</option>
          <option value="Inativo">Inativo</option>
        </select>
      </div>
    </div>
  );

  const renderEmpresasForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Empresa</label>
        <input 
          type="text" 
          className="input-field bg-slate-50 font-mono" 
          value={formData.codigoEmpresa || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          Razão Social <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('razaoSocial') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          value={formData.razaoSocial || ''}
          onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CNPJ</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="00.000.000/0000-00" 
          value={formData.cnpj || ''}
          onChange={(e) => handleInputChange('cnpj', maskCNPJ(e.target.value))}
          maxLength={18}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nº Contrato</label>
        <input 
          type="text" 
          className="input-field" 
          value={formData.numContrato || ''}
          onChange={(e) => handleInputChange('numContrato', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Área de Atuação</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ex: Elétrica, Logística..." 
          value={formData.areaAtuacao || ''}
          onChange={(e) => handleInputChange('areaAtuacao', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">E-mail Comercial</label>
        <input 
          type="email" 
          className="input-field" 
          placeholder="contato@empresa.com" 
          value={formData.emailComercial || ''}
          onChange={(e) => handleInputChange('emailComercial', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes Adicionais</label>
        <textarea 
          className="input-field min-h-[60px] py-2" 
          placeholder="Observações complementares sobre a empresa..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderFornecedoresForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Fornecedor</label>
        <input 
          type="text" 
          className="input-field bg-slate-50 font-mono" 
          value={formData.codigoFornecedor || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CNPJ / CPF</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="00.000.000/0000-00"
          value={formData.cnpj || ''}
          onChange={(e) => handleInputChange('cnpj', maskCNPJ(e.target.value))}
          maxLength={18}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          Nome Fantasia <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('nomeFantasia') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          value={formData.nomeFantasia || ''}
          onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
        />
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Telefone</label>
        <input 
          type="text" 
          className="input-field" 
          value={formData.telefone || ''}
          onChange={(e) => handleInputChange('telefone', e.target.value)}
        />
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">ÁREA COMERCIAL</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ex: Elétrica, Hidráulica..."
          value={formData.categoria || ''}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">E-mail Comercial</label>
        <input 
          type="email" 
          className="input-field" 
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes Adicionais</label>
        <textarea 
          className="input-field min-h-[60px] py-2" 
          placeholder="Observações complementares sobre o fornecedor..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderEquipesForm = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Equipe</label>
        <input 
          type="text" 
          className="input-field bg-slate-50 font-mono" 
          value={formData.codigoEquipe || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Centro de Custo</label>
        <input 
          type="text" 
          className="input-field" 
          value={formData.centroCusto || ''}
          onChange={(e) => handleInputChange('centroCusto', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block flex items-center gap-1">
          Nome da Equipe <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field transition-all duration-300 ${invalidFields.includes('nome') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Gestor Líder</label>
        <input 
          type="text" 
          className="input-field" 
          value={formData.gestor || ''}
          onChange={(e) => handleInputChange('gestor', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Verba Inicial (R$)</label>
          <input 
            type="number" 
            className="input-field" 
            value={formData.verbaDestinada || ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              handleInputChange('verbaDestinada', val);
              // For new teams, initial balance equals initial budget
              handleInputChange('saldoAtualizado', val);
            }}
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Saldo Atual (R$)</label>
          <input 
            type="number" 
            className="input-field bg-slate-50" 
            value={formData.saldoAtualizado || ''}
            readOnly
          />
        </div>
      </div>
      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cor de Ident.</label>
        <input 
          type="color" 
          className="input-field p-1 h-8 w-24" 
          value={formData.cor || '#000000'}
          onChange={(e) => handleInputChange('cor', e.target.value)}
        />
      </div>
    </div>
  );

  const renderList = () => {
    let data : any[] = [];
    let headers: string[] = [];

    switch(type) {
      case 'materiais': 
        data = store.materiais; 
        headers = ['COD SAP', 'Fornecedor', 'Descrição', 'Equipe', 'Mín.', 'Ideal', 'Estoque', 'Ações'];
        break;
      case 'colaboradores': 
        data = store.colaboradores; 
        headers = ['Matrícula', 'Nome', 'Empresa', 'Cargo', 'Equipe', 'Ações'];
        break;
      case 'empresas': 
        data = store.empresas; 
        headers = ['Razão Social', 'CNPJ', 'Contrato', 'Ações'];
        break;
      case 'fornecedores': 
        data = store.fornecedores; 
        headers = ['Cód.', 'Nome Fantasia', 'CNPJ', 'Email', 'Ações'];
        break;
      case 'equipes': 
        data = store.equipes; 
        headers = ['Nome', 'Centro Custo', 'Gestor', 'Verba Inicial', 'Saldo Atual', 'Ações'];
        break;
    }

    const s = searchTerm.toLowerCase();
    const filteredData = data.filter(item => {
      if (!s) return true;
      if (type === 'materiais') {
        const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || '';
        return (item.sap?.toLowerCase().includes(s) || 
                item.descricao?.toLowerCase().includes(s) || 
                item.equipe?.toLowerCase().includes(s) ||
                forn.toLowerCase().includes(s) ||
                item.codigoFornecedor?.toLowerCase().includes(s));
      }
      if (type === 'colaboradores') {
        return (item.nome?.toLowerCase().includes(s) || 
                item.matricula?.toLowerCase().includes(s) || 
                item.equipe?.toLowerCase().includes(s) ||
                item.empresa?.toLowerCase().includes(s));
      }
      if (type === 'equipes') {
        return (item.nome?.toLowerCase().includes(s) || 
                item.centroCusto?.toLowerCase().includes(s) || 
                item.gestor?.toLowerCase().includes(s));
      }
      if (type === 'fornecedores') {
        return (item.nomeFantasia?.toLowerCase().includes(s) || 
                item.cnpj?.toLowerCase().includes(s) || 
                item.codigoFornecedor?.toLowerCase().includes(s));
      }
      if (type === 'empresas') {
        return (item.razaoSocial?.toLowerCase().includes(s) || 
                item.cnpj?.toLowerCase().includes(s) || 
                item.numContrato?.toLowerCase().includes(s));
      }
      return true;
    }).sort((a, b) => {
      if (type === 'materiais') return (a.descricao || '').localeCompare(b.descricao || '');
      if (type === 'colaboradores') return (a.nome || '').localeCompare(b.nome || '');
      if (type === 'equipes') return (a.nome || '').localeCompare(b.nome || '');
      if (type === 'fornecedores') return (a.nomeFantasia || '').localeCompare(b.nomeFantasia || '');
      if (type === 'empresas') return (a.razaoSocial || '').localeCompare(b.razaoSocial || '');
      return 0;
    });

    return (
      <table className={`w-full text-left table-auto border-separate border-spacing-0 ${type === 'materiais' || type === 'colaboradores' ? 'min-w-[950px]' : 'min-w-[650px]'}`}>
        <thead className="sticky top-0 z-20 bg-slate-100">
          <tr>
            <th className="px-3 py-2.5 text-[10px] w-10 text-center font-bold text-slate-500 uppercase tracking-wider border-b border-brand-border bg-slate-100">
              <input 
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                onChange={() => {
                  if (selectedIds.length === filteredData.length) setSelectedIds([]);
                  else setSelectedIds(filteredData.map((d: any) => d.id));
                }}
              />
            </th>
            {headers.map((h, i) => (
              <th 
                key={i} 
                className={`px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-brand-border bg-slate-100 ${h === 'Descrição' ? 'w-[30%]' : h === 'Ações' ? 'w-[100px]' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 1} className="py-20 text-center text-slate-300 italic text-[11px]">
                Nenhum registro encontrado em {type}.
              </td>
            </tr>
          ) : (
            filteredData.map((item, idx) => (
                <tr key={idx} className="table-row group">
                  <td className="px-3 py-2 text-center border-b border-slate-50">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => {
                        if (selectedIds.includes(item.id)) setSelectedIds(prev => prev.filter(id => id !== item.id));
                        else setSelectedIds(prev => [...prev, item.id]);
                      }}
                    />
                  </td>
                  {type === 'materiais' && (
                      <>
                        <td className="px-3 py-2 font-mono text-slate-500">{item.sap}</td>
                        <td className="px-3 py-2 text-slate-400 font-medium text-[10px]">
                          {store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || item.codigoFornecedor || '-'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{item.descricao}</td>
                        <td className="px-3 py-2 text-slate-500">{item.equipe}</td>
                        <td className="px-3 py-2 text-slate-500 tabular-nums">{item.estoqueMinimo}</td>
                        <td className="px-3 py-2 text-slate-500 tabular-nums">{item.estoqueIdeal}</td>
                        <td className="px-3 py-2 font-bold tabular-nums">{item.estoqueAtual}</td>
                      </>
                    )}
                    {type === 'equipes' && (
                      <>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{item.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{item.centroCusto}</td>
                        <td className="px-3 py-2 text-slate-500">{item.gestor}</td>
                        <td className="px-3 py-2 font-bold tabular-nums text-slate-600">R$ {item.verbaDestinada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className={`px-3 py-2 font-bold tabular-nums ${item.saldoAtualizado < 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {item.saldoAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    {type === 'colaboradores' && (
                      <>
                        <td className="px-3 py-2 font-mono text-slate-500">{item.matricula}</td>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{item.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{item.empresa}</td>
                        <td className="px-3 py-2 text-slate-500">{item.cargo}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                            {item.equipe}
                          </span>
                        </td>
                      </>
                    )}
                    {type === 'empresas' && (
                      <>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{item.razaoSocial}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono italic">{item.cnpj}</td>
                        <td className="px-3 py-2 text-slate-500">{item.numContrato}</td>
                      </>
                    )}
                    {type === 'fornecedores' && (
                      <>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{item.codigoFornecedor}</td>
                        <td className="px-3 py-2 font-semibold text-brand-dark">{item.nomeFantasia}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono italic">{item.cnpj}</td>
                        <td className="px-3 py-2 text-blue-600 underline text-[11px]">{item.email}</td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {type === 'materiais' && (
                          <button 
                            onClick={() => handleShareClick(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                            title="Compartilhar"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-blue-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(item)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg shadow-sm transition-all animate-none"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-5">
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 lg:sticky lg:top-0 z-10">
          <div className="card shadow-md border-brand-primary/10">
            <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 tracking-wider">
              Cadastrar {type === 'materiais' ? 'Material' : type === 'empresas' ? 'Empresa' : type === 'fornecedores' ? 'Fornecedor' : type === 'colaboradores' ? 'Colaborador' : 'Equipe'}
            </h3>
            <form 
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              {type === 'materiais' && renderMateriaisForm()}
              {type === 'colaboradores' && renderColaboradoresForm()}
              {type === 'empresas' && renderEmpresasForm()}
              {type === 'fornecedores' && renderFornecedoresForm()}
              {type === 'equipes' && renderEquipesForm()}

              <button 
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
              >
                <Save className="w-4 h-4" />
                Salvar Cadastro
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 h-[700px]">
          <div className="card !p-0 shadow-sm border-slate-200 flex flex-col h-full overflow-hidden">
            {/* Header Title & Search Welded */}
            <div className="flex-none bg-white border-b border-brand-border rounded-t-2xl z-30">
              <div className="h-[60px] px-4 flex items-center justify-between gap-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">Listagem de {type}</h3>
                
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <button 
                    onClick={() => {
                      const data = store[type as keyof typeof store] as any[];
                      const s = searchTerm.toLowerCase();
                      const filteredData = data.filter(item => {
                        if (!s) return true;
                        const searchStr = JSON.stringify(item).toLowerCase();
                        return searchStr.includes(s);
                      });

                      if (selectedIds.length === filteredData.length) setSelectedIds([]);
                      else setSelectedIds(filteredData.map((d: any) => d.id));
                    }}
                    className="p-1.5 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg mr-1 group"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {selectedIds.length === (store[type as keyof typeof store] as any[]).length && (store[type as keyof typeof store] as any[]).length > 0 ? 'Desmarcar' : 'Selecionar Tudo'}
                  </button>

                  {selectedIds.length > 0 && (
                    <button 
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="p-1.5 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg mr-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir ({selectedIds.length})
                    </button>
                  )}

                  {type === 'materiais' && (
                    <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-slate-200">
                      <button 
                        onClick={handleShareStock}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        title="Compartilhar Estoque"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">Compartilhar</span>
                      </button>
                    </div>
                  )}

                  <div className="relative w-48 shrink-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input 
                      type="text" 
                      className="input-field pl-7 !h-7 !text-[11px]" 
                      placeholder="Pesquisar..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              {renderList()}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Modals for Edit and Delete */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Excluir em Massa</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir <span className="font-bold text-slate-700">{selectedIds.length} {type} selecionados</span>? 
                Esta ação não poderá ser desfeita.
              </p>
              {store.isDeletionPasswordEnabled && store.deletionPassword && (
                <div className="w-full mt-6 text-left">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Senha de Confirmação</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Digite a senha para autorizar"
                    value={deletionPasswordInput}
                    onChange={(e) => setDeletionPasswordInput(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
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

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir <span className="font-bold text-slate-700">"{selectedItem?.descricao || selectedItem?.nome || selectedItem?.nomeFantasia || selectedItem?.razaoSocial}"</span>? 
                Esta ação não poderá ser desfeita.
              </p>
              {store.isDeletionPasswordEnabled && store.deletionPassword && (
                <div className="w-full mt-6 text-left">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Senha de Confirmação</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Digite a senha para autorizar"
                    value={deletionPasswordInput}
                    onChange={(e) => setDeletionPasswordInput(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form 
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Editar {type === 'materiais' ? 'Material' : type === 'empresas' ? 'Empresa' : type === 'fornecedores' ? 'Fornecedor' : type === 'colaboradores' ? 'Colaborador' : 'Equipe'}</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white rounded-full transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              {type === 'materiais' && (
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
                      className="input-field pr-8"
                      value={editFormData.fornecedorId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fornecedorId: e.target.value })}
                    >
                      <option value="">Selecione o Fornecedor...</option>
                      {store.fornecedores.map((f, idx) => (
                        <option key={`${f.id}_${idx}`} value={f.id}>{f.nomeFantasia}</option>
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
                      className="input-field pr-8"
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
                      className="input-field pr-8"
                      value={editFormData.equipe || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, equipe: e.target.value })}
                    >
                      {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
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
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Min.</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={editFormData.estoqueMinimo || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, estoqueMinimo: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Estoque Ideal</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={editFormData.estoqueIdeal || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, estoqueIdeal: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Preço Unitário (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-field" 
                      value={editFormData.precoUnitario || 0}
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
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes / Observação</label>
                    <textarea 
                      className="input-field min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}

              {type === 'colaboradores' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Matrícula / ID</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50 font-mono" 
                      value={editFormData.matricula || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Equipe Vinculada</label>
                    <select 
                      className="input-field pr-8"
                      value={editFormData.equipe || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, equipe: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nome Completo</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.nome || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Empresa</label>
                    <select 
                      className="input-field pr-10" 
                      value={editFormData.empresa || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, empresa: e.target.value })}
                    >
                      <option value="">Selecione a Empresa...</option>
                      {store.empresas.map((emp, idx) => (
                        <option key={`${emp.id}_${idx}`} value={emp.razaoSocial}>
                          {emp.razaoSocial}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Contato (Telefone)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.contato || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, contato: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cargo / Função</label>
                    <select 
                      className="input-field pr-8"
                      value={editFormData.cargo || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cargo: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {["ADM", "AJUDANTE", "ENCARREGADO", "GESSEIRO", "GESTOR", "MECÂNICO", "OUTROS", "PEDREIRO", "PINTOR", "SUPERVISOR", "TST"].map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Status</label>
                    <select 
                      className="input-field pr-8"
                      value={editFormData.status || 'Ativo'}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              )}

              {type === 'fornecedores' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Fornecedor</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50 font-mono" 
                      value={editFormData.codigoFornecedor || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CNPJ / CPF</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="00.000.000/0000-00"
                      value={editFormData.cnpj || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cnpj: maskCNPJ(e.target.value) })}
                      maxLength={18}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nome Fantasia</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.nomeFantasia || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomeFantasia: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Telefone</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.telefone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">ÁREA COMERCIAL</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.categoria || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">E-mail Comercial</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes Adicionais</label>
                    <textarea 
                      className="input-field min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}

              {type === 'equipes' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Equipe</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50 font-mono" 
                      value={editFormData.codigoEquipe || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Centro de Custo</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.centroCusto || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, centroCusto: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nome da Equipe</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.nome || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Gestor Líder</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.gestor || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, gestor: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Verba Inicial (R$)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={editFormData.verbaDestinada || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, verbaDestinada: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Saldo Atual (R$)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={editFormData.saldoAtualizado || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, saldoAtualizado: Number(e.target.value) })}
                    />
                  </div>
                  {type === 'equipes' && store.isDeletionPasswordEnabled && store.isDeletionPasswordEnabled && store.deletionPassword && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[9px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Alteração de Verba requer senha de autorização
                      </p>
                      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Senha de Autorização</label>
                      <input 
                        type="password" 
                        className="input-field h-8" 
                        placeholder="Senha VRL necessária para salvar alterações de orçamento"
                        value={deletionPasswordInput}
                        onChange={(e) => setDeletionPasswordInput(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cor de Identificação</label>
                    <input 
                      type="color" 
                      className="input-field p-1 h-8" 
                      value={editFormData.cor || '#000000'}
                      onChange={(e) => setEditFormData({ ...editFormData, cor: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {type === 'empresas' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cód. Empresa</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50 font-mono" 
                      value={editFormData.codigoEmpresa || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Razão Social</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.razaoSocial || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, razaoSocial: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CNPJ</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="00.000.000/0000-00"
                      value={editFormData.cnpj || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cnpj: maskCNPJ(e.target.value) })}
                      maxLength={18}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nº Contrato</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.numContrato || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, numContrato: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Área de Atuação</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editFormData.areaAtuacao || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, areaAtuacao: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Email Comercial</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={editFormData.emailComercial || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emailComercial: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detalhes</label>
                    <textarea 
                      className="input-field min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn-secondary !h-9 text-[11px]"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="btn-primary !h-9 text-[11px] flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Compartilhar</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {shareType === 'single' ? 'Escolha como compartilhar este material' : 'Escolha como compartilhar a listagem de estoque'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsShareModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {shareType === 'single' && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Eye className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Visualização rápida</span>
                        <p className="text-sm font-bold text-slate-700 leading-tight">{selectedItem?.descricao}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">SAP: {selectedItem?.sap}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    onClick={handleGlobalShare}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">Compartilhar</span>
                  </button>

                  <button 
                    onClick={initiateEmailShare}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-all group"
                  >
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">Email</span>
                  </button>

                  <button 
                    onClick={downloadStockSpreadsheet}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-250 transition-all group"
                  >
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-slate-200">
                      <Download className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">Excel (CSV)</span>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-4 bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 transition-colors border-t border-slate-100"
              >
                Agora não, obrigado
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portal de Notificações Floating Toasts */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.95, x: 10, transition: { duration: 0.15 } }}
              layout
              className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl p-4 flex gap-3 relative overflow-hidden"
              id={`toast-${toast.id}`}
            >
              {/* Type border accent indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'
              }`} />

              <div className="flex-1 min-w-0 pr-4 pl-1">
                <div className="flex items-center gap-2 mb-1">
                  {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
                  {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{toast.title}</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 leading-snug break-words">{toast.message}</p>
                
                {toast.sap && (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="inline-flex items-center text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50">
                      COD SAP: {toast.sap}
                    </span>
                    {toast.equipe && (
                      <span className="inline-flex items-center text-[9px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100/50">
                        {toast.equipe}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="absolute right-2 top-2 p-1 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                id={`toast-close-${toast.id}`}
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

      </div>

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
