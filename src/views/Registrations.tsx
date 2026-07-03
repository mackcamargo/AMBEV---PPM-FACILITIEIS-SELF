import React, { useState, useMemo } from 'react';
import { useApp } from '../lib/store';
import { generateId } from '../lib/idUtils';
import { normalizeText } from '../lib/stringUtils';
import { Save, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle2, Info, AlertCircle, Sparkles, Database, Share2, Printer, Download, Mail, Eye, FileUp, Upload, Package, Users, Truck, MapPin, FilterX, Cloud, CloudOff, RefreshCw, Copy, Check } from 'lucide-react';
import { Material } from '../types';
import { materialsToImport } from '../data/materials';
import { motion, AnimatePresence } from 'motion/react';

import { playNotificationSound } from '../lib/audio';
import { supabase } from '../lib/supabase';

const playCopySound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Silence errors if audio context is blocked
  }
};

const CopyableInput: React.FC<{
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  readOnly?: boolean;
}> = ({ value, onChange, placeholder, className, type = "text", readOnly = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    
    navigator.clipboard.writeText(value);
    setCopied(true);
    playCopySound();
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/copy">
      <input
        type={type}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          const sanitized = typeof val === 'string' ? val.replace(/^"|"$/g, '').trim() : val;
          onChange?.(sanitized);
        }}
        placeholder={placeholder}
        className={className}
        readOnly={readOnly}
      />
      {value && (
        <button
          onClick={handleCopy}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/copy:opacity-100 transition-all p-1 hover:bg-slate-100 rounded-md bg-white/80 backdrop-blur-sm shadow-sm border border-slate-200 z-10"
          title="Copiar"
        >
          {copied ? (
            <div className="flex items-center gap-1 px-1">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
              <span className="text-[8px] font-bold text-emerald-600">Copiado!</span>
            </div>
          ) : (
            <Copy className="w-2.5 h-2.5 text-slate-400" />
          )}
        </button>
      )}
    </div>
  );
};

const CopyableText: React.FC<{ value: string; className?: string; truncate?: boolean; maxW?: string; title?: string }> = ({ value, className, truncate, maxW, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    
    navigator.clipboard.writeText(value);
    setCopied(true);
    playCopySound();
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group/copy-text flex items-center gap-1.5 ${maxW || ''}`}>
      <span 
        className={`${className || ''} ${truncate ? 'truncate' : ''}`} 
        title={title || value}
      >
        {value || '-'}
      </span>
      {value && value !== '-' && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/copy-text:opacity-100 transition-all p-0.5 hover:bg-slate-100 rounded bg-white/80 backdrop-blur-sm shadow-sm border border-slate-200 shrink-0 ml-auto"
          title="Copiar"
        >
          {copied ? (
            <Check className="w-2 h-2 text-emerald-600" />
          ) : (
            <Copy className="w-2 h-2 text-slate-400" />
          )}
        </button>
      )}
    </div>
  );
};

export const RegistrationView: React.FC<{ type: 'materiais' | 'empresas' | 'fornecedores' | 'colaboradores' | 'equipes' }> = ({ type }) => {
  const store = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controlled form state
  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem(`registration_draft_${type}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse initial registration draft", e);
      }
    }
    return type === 'materiais' ? { unidade: 'UNI' } : {};
  });
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    equipe: '',
    fornecedorId: '',
    localizacao: '',
    ordemValor: ''
  });

  const data = useMemo(() => {
    switch(type) {
      case 'materiais': return store.materiais;
      case 'colaboradores': return store.colaboradores;
      case 'empresas': return store.empresas;
      case 'fornecedores': return store.fornecedores;
      case 'equipes': return store.equipes;
      default: return [];
    }
  }, [type, store]);

  const headers = useMemo(() => {
    switch(type) {
      case 'materiais': return ['COD SAP', 'FORNECEDOR', 'CÓD. FORN.', 'NCM', 'DESCRIÇÃO', 'DESC. SIMPLES SAP', 'DESC. COMPLETA SAP', 'EQUIPE', 'EST. ATUAL', 'EST. MÍN.', 'EST. IDEAL', 'PREÇO UNIT.', 'VALOR TOTAL', 'UNID.', 'LOCALIZAÇÃO', 'AÇÕES'];
      case 'colaboradores': return ['Matrícula', 'Nome', 'Empresa', 'Cargo', 'Equipe', 'Ações'];
      case 'empresas': return ['Razão Social', 'CNPJ', 'Contrato', 'Ações'];
      case 'fornecedores': return ['Cód.', 'Nome Fantasia', 'CNPJ', 'Email', 'Ações'];
      case 'equipes': return ['Nome', 'Centro Custo', 'Gestor', 'Verba Inicial', 'Saldo Atual', 'Ações'];
      default: return [];
    }
  }, [type]);

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    
    let result = data;

    // Apply specific field filters - Advanced Filtering
    if (type === 'materiais') {
      if (activeFilters.equipe) {
        result = result.filter(item => item.equipe === activeFilters.equipe);
      }
      if (activeFilters.fornecedorId) {
        result = result.filter(item => item.fornecedorId === activeFilters.fornecedorId);
      }
      if (activeFilters.localizacao) {
        const locFilter = normalizeText(activeFilters.localizacao);
        result = result.filter(item => normalizeText(item.localizacao || '').includes(locFilter));
      }
    }

    if (!s) return result;
    
    const searchTerms = s.split(/\s+/).map(t => normalizeText(t)).filter(t => t);

    return result.filter(item => {
      // Create a unified string of searchable text for this item
      let searchContent = '';
      
      if (type === 'materiais') {
        const forn = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || '';
        searchContent = [
          item.sap,
          item.descricao,
          item.equipe,
          forn,
          item.codigoFornecedor,
          item.localizacao,
          item.unidade,
          item.ncm,
          item.descricaoSimplesSap,
          item.descricaoCompletaSap,
          item.detalhes
        ].filter(Boolean).map(val => normalizeText(val.toString())).join(' ');
      } else if (type === 'colaboradores') {
        searchContent = [
          item.nome,
          item.matricula,
          item.equipe,
          item.empresa,
          item.cargo,
          item.contato,
          item.status
        ].filter(Boolean).map(val => normalizeText(val.toString())).join(' ');
      } else if (type === 'equipes') {
        searchContent = [
          item.nome,
          item.centroCusto,
          item.gestor,
          item.codigoEquipe
        ].filter(Boolean).map(val => normalizeText(val.toString())).join(' ');
      } else if (type === 'fornecedores') {
        searchContent = [
          item.nomeFantasia,
          item.cnpj,
          item.codigoFornecedor,
          item.email,
          item.telefone,
          item.categoria,
          item.detalhes
        ].filter(Boolean).map(val => normalizeText(val.toString())).join(' ');
      } else if (type === 'empresas') {
        searchContent = [
          item.razaoSocial,
          item.cnpj,
          item.numContrato,
          item.areaAtuacao,
          item.codigoEmpresa
        ].filter(Boolean).map(val => normalizeText(val.toString())).join(' ');
      }

      // Every search term must be found in the search content (AND logic)
      return searchTerms.every(term => searchContent.includes(term));
    });
  }, [data, searchTerm, type, store.fornecedores, activeFilters]);

  const sortedData = useMemo(() => {
    // Sort logic
    return [...filteredData].sort((a, b) => {
      // Sort by value if selected
      if (type === 'materiais' && activeFilters.ordemValor) {
        if (activeFilters.ordemValor === 'maior' || activeFilters.ordemValor === 'menor') {
          const valA = (Number(a.estoqueAtual) || 0) * (Number(a.precoUnitario) || 0);
          const valB = (Number(b.estoqueAtual) || 0) * (Number(b.precoUnitario) || 0);
          return activeFilters.ordemValor === 'maior' ? valB - valA : valA - valB;
        }
        if (activeFilters.ordemValor === 'preco_maior' || activeFilters.ordemValor === 'preco_menor') {
          const valA = Number(a.precoUnitario) || 0;
          const valB = Number(b.precoUnitario) || 0;
          return activeFilters.ordemValor === 'preco_maior' ? valB - valA : valA - valB;
        }
      }

      // Alphabetical sorting for all types (default)
      let nameA = '';
      let nameB = '';

      switch(type) {
        case 'materiais':
          nameA = a.descricao || '';
          nameB = b.descricao || '';
          break;
        case 'colaboradores':
          nameA = a.nome || '';
          nameB = b.nome || '';
          break;
        case 'empresas':
          nameA = a.razaoSocial || '';
          nameB = b.razaoSocial || '';
          break;
        case 'fornecedores':
          nameA = a.nomeFantasia || '';
          nameB = b.nomeFantasia || '';
          break;
        case 'equipes':
          nameA = a.nome || '';
          nameB = b.nome || '';
          break;
        default:
          return 0;
      }

      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [filteredData, type, activeFilters.ordemValor]);

  const sortedFornecedoresList = useMemo(() => {
    return [...store.fornecedores].sort((a, b) => 
      (a.nomeFantasia || '').localeCompare(b.nomeFantasia || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [store.fornecedores]);

  const sortedEquipesList = useMemo(() => {
    return [...store.equipes].sort((a, b) => 
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [store.equipes]);

  const sortedEmpresasList = useMemo(() => {
    return [...store.empresas].sort((a, b) => 
      (a.razaoSocial || '').localeCompare(b.razaoSocial || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [store.empresas]);

  const statsPorEquipe = useMemo(() => {
    if (type !== 'materiais') return [];
    
    // Group materials by team
    const groups: { [key: string]: { count: number; totalStock: number; color?: string } } = {};
    
    // Initialize groups with existing teams so we don't miss empty ones
    store.equipes.forEach(eq => {
      groups[eq.nome] = { count: 0, totalStock: 0, color: eq.cor };
    });
    
    // Aggregate material data
    store.materiais.forEach(item => {
      const eqName = item.equipe || 'Sem Equipe';
      if (!groups[eqName]) {
        groups[eqName] = { count: 0, totalStock: 0, color: '#64748b' };
      }
      groups[eqName].count += 1;
      groups[eqName].totalStock += (Number(item.estoqueAtual) || 0);
    });
    
    return Object.entries(groups).map(([nome, val]) => ({
      nome,
      ...val
    })).sort((a, b) => b.totalStock - a.totalStock);
  }, [type, store.materiais, store.equipes]);

  const totalMateriais = store.materiais.length;
  const totalStockGeral = useMemo(() => {
    return store.materiais.reduce((acc, item) => acc + (Number(item.estoqueAtual) || 0), 0);
  }, [store.materiais]);


  // Custom toast notifications list
  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'error' | 'delete';
    sap?: string;
    equipe?: string;
  }[]>([]);

  const lastTypeRef = React.useRef(type);

  // Reset form when type changes to avoid data persistence between different views, loading type-specific drafts
  React.useEffect(() => {
    setInvalidFields([]);
    const saved = localStorage.getItem(`registration_draft_${type}`);
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
        lastTypeRef.current = type;
        return;
      } catch (e) {
        console.error("Failed to parse saved registration form draft", e);
      }
    }

    if (type === 'materiais') {
      setFormData({ unidade: 'UNI' });
    } else {
      setFormData({});
    }
    lastTypeRef.current = type;
  }, [type]);

  // Persist form changes in real time for currently active tab
  React.useEffect(() => {
    if (lastTypeRef.current === type) {
      const hasRealData = Object.keys(formData).some(k => {
        if (k === 'unidade' && formData[k] === 'UNI' && type === 'materiais') return false;
        if (['matricula', 'codigoFornecedor', 'codigoEquipe', 'codigoEmpresa'].includes(k)) return false;
        return formData[k] !== undefined && formData[k] !== '';
      });

      if (hasRealData) {
        localStorage.setItem(`registration_draft_${type}`, JSON.stringify(formData));
      } else {
        localStorage.removeItem(`registration_draft_${type}`);
      }
    }
  }, [formData, type]);

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
    const id = generateId();
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

  const handleInlineUpdate = async (id: string, field: string, value: any, label: string) => {
    let result;
    if (type === 'materiais') {
      result = await store.updateMaterial(id, { [field]: value });
    }
    
    if (result && result.success) {
      addToast('Sincronizado', `${label} atualizado com sucesso.`, 'success');
    } else if (result) {
      addToast('Erro na Sincronização', `Falha ao salvar no banco. (${result.error})`, 'error');
    }
  };

  // Auto-fill matricula, codigoFornecedor, and codigoEquipe
  React.useEffect(() => {
    if (type === 'colaboradores' && !formData.matricula) {
      // Find the highest number in existing matriculas to avoid duplicates
      const lastNumber = store.colaboradores.reduce((max, c) => {
        const num = parseInt(c.matricula.replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      
      const nextId = lastNumber + 1;
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
    let finalValue = value;
    if (typeof value === 'string') {
      // Remove surrounding quotes and trim
      finalValue = value.replace(/^"|"$/g, '').trim();
      if (type === 'materiais') {
        finalValue = finalValue.toUpperCase();
      }
    }
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleSave = async () => {
    if (Object.keys(formData).length === 0 && type !== 'materiais') {
      addToast('Erro de Cadastro', 'Preencha os campos obrigatórios para continuar.', 'error');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // Specific validation per type with sound-enabled notifications
      if (type === 'materiais') {
        const missing = [];
        const missingKeys = [];
        // SAP is now optional per user request
        if (!formData.descricao) { missing.push('Descrição'); missingKeys.push('descricao'); }
        if (!formData.unidade) { missing.push('Unidade'); missingKeys.push('unidade'); }
        
        if (missing.length > 0) {
          setInvalidFields(missingKeys);
          addToast('Campo(s) Faltando', `Atenção! Faltam os campos: ${missing.join(', ')}`, 'error');
          setIsSaving(false);
          return;
        }
      } else if (type === 'colaboradores') {
        if (!formData.nome) { setInvalidFields(['nome']); addToast('Erro', 'Informe o Nome do Colaborador.', 'error'); setIsSaving(false); return; }
      } else if (type === 'equipes') {
        if (!formData.nome) { setInvalidFields(['nome']); addToast('Erro', 'Informe o Nome da Equipe.', 'error'); setIsSaving(false); return; }
      } else if (type === 'empresas') {
        if (!formData.razaoSocial) { setInvalidFields(['razaoSocial']); addToast('Erro', 'Informe a Razão Social.', 'error'); setIsSaving(false); return; }
      } else if (type === 'fornecedores') {
        if (!formData.nomeFantasia) { setInvalidFields(['nomeFantasia']); addToast('Erro', 'Informe o Nome Fantasia.', 'error'); setIsSaving(false); return; }
      }
      
      setInvalidFields([]);

      let result: { success: boolean; id?: string; error?: string } = { success: true };
      let label = '';

      switch(type) {
        case 'materiais': {
          const materialName = (formData.descricao || 'Novo Material').trim();
          const sapCode = (formData.sap || '').trim();
          const equipeName = formData.equipe || store.equipes[0]?.nome || 'Sem equipe';
          
          result = await store.addMaterial({
            sap: sapCode,
            codigoFornecedor: formData.codigoFornecedor || '',
            fornecedorId: formData.fornecedorId || '',
            descricao: materialName,
            unidade: formData.unidade || 'UNI',
            estoqueMinimo: typeof formData.estoqueMinimo === 'number' ? formData.estoqueMinimo : Number(String(formData.estoqueMinimo || 0).replace(/\./g, '').replace(',', '.')) || 0,
            estoqueIdeal: typeof formData.estoqueIdeal === 'number' ? formData.estoqueIdeal : Number(String(formData.estoqueIdeal || 0).replace(/\./g, '').replace(',', '.')) || 0,
            estoqueAtual: typeof formData.estoqueAtual === 'number' ? formData.estoqueAtual : Number(String(formData.estoqueAtual || 0).replace(/\./g, '').replace(',', '.')) || 0,
            precoUnitario: typeof formData.precoUnitario === 'number' ? formData.precoUnitario : Number(String(formData.precoUnitario || 0).replace(/\./g, '').replace(',', '.')) || 0,
            equipe: equipeName,
            localizacao: formData.localizacao || '',
            detalhes: formData.detalhes || '',
            ncm: formData.ncm || '',
            descricaoSimplesSap: formData.descricaoSimplesSap || '',
            descricaoCompletaSap: formData.descricaoCompletaSap || '',
            ultimaMovimentacao: new Date().toLocaleDateString('pt-BR')
          });

          label = materialName;
          if (result.success) {
            addToast(
              'Material Cadastrado!',
              materialName,
              'success',
              { sap: sapCode, equipe: equipeName }
            );

            // Check if we need to return to movement screen
            const returnTo = localStorage.getItem('return_to_view');
            if (returnTo) {
              if (result.id) {
                localStorage.setItem('preselect_material_id', result.id);
              }
              localStorage.removeItem('return_to_view');
              store.setView(returnTo as any);
            }
          }
          break;
        }
        case 'colaboradores': {
          const nomeColab = formData.nome || 'Novo Colaborador';
          result = await store.addColaborador({
            matricula: formData.matricula || '',
            nome: nomeColab,
            empresa: formData.empresa || '',
            equipe: formData.equipe || store.equipes[0]?.nome || '',
            cargo: formData.cargo || '',
            contato: formData.contato || '',
            status: formData.status || 'Ativo'
          });
          label = nomeColab;
          if (result.success) addToast('Colaborador Cadastrado!', nomeColab, 'success');
          break;
        }
        case 'equipes': {
          const nomeEquipe = formData.nome || 'Nova Equipe';
          result = await store.addEquipe({
            codigoEquipe: formData.codigoEquipe || '',
            nome: nomeEquipe,
            centroCusto: formData.centroCusto || '',
            gestor: formData.gestor || '',
            cor: formData.cor || '#000000',
            verbaDestinada: Number(formData.verbaDestinada) || 0,
            saldoAtualizado: Number(formData.saldoAtualizado) || 0
          });
          label = nomeEquipe;
          if (result.success) addToast('Equipe Cadastrada!', nomeEquipe, 'success');
          break;
        }
        case 'empresas': {
          const razaoSocial = formData.razaoSocial || 'Nova Empresa';
          result = await store.addEmpresa({
            razaoSocial,
            cnpj: formData.cnpj || '00.000.000/0000-00',
            numContrato: formData.numContrato || '',
            areaAtuacao: formData.areaAtuacao || '',
            emailComercial: formData.emailComercial || '',
            detalhes: formData.detalhes || '',
            codigoEmpresa: formData.codigoEmpresa || '',
            status: 'Ativo'
          });
          label = razaoSocial;
          if (result.success) addToast('Empresa Cadastrada!', razaoSocial, 'success');
          break;
        }
        case 'fornecedores': {
          const nomeFantasia = formData.nomeFantasia || 'Novo Fornecedor';
          result = await store.addFornecedor({
            nomeFantasia,
            cnpj: formData.cnpj || '',
            email: formData.email || '',
            telefone: formData.telefone || '',
            codigoFornecedor: formData.codigoFornecedor || '',
            categoria: formData.categoria || 'Geral',
            detalhes: formData.detalhes || ''
          });
          label = nomeFantasia;
          if (result.success) addToast('Fornecedor Cadastrado!', nomeFantasia, 'success');
          break;
        }
      }

      if (!result.success) {
        addToast('Erro ao Sincronizar', `O item "${label}" foi salvo apenas localmente. Verifique sua conexão. (${result.error})`, 'error');
      }

      setFormData({});
      if (type === 'materiais') {
        setFormData({ unidade: 'UNI' });
      }
    } finally {
      setIsSaving(false);
    }
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

  const exportMaterialsCSV = () => {
    const headers = ['COD SAP', 'FORNECEDOR', 'CÓD. FORN.', 'NCM', 'DESCRIÇÃO', 'EQUIPE', 'EST. ATUAL', 'EST. MÍN.', 'EST. IDEAL', 'PREÇO UNIT.', 'VALOR TOTAL', 'UNID.', 'LOCALIZAÇÃO'];
    const csvHeaders = headers.map(h => `"${h}"`).join(';');

    const rows = store.materiais.map(item => {
      const fornecedorName = store.fornecedores.find(f => f.id === item.fornecedorId)?.nomeFantasia || item.codigoFornecedor || '-';
      return [
        item.sap,
        fornecedorName,
        item.codigoFornecedor || '-',
        item.ncm || '-',
        item.descricao,
        item.equipe,
        item.estoqueAtual.toString(),
        item.estoqueMinimo.toString(),
        item.estoqueIdeal.toString(),
        item.precoUnitario.toFixed(2).replace('.', ','),
        ((item.estoqueAtual || 0) * (item.precoUnitario || 0)).toFixed(2).replace('.', ','),
        item.unidade,
        item.localizacao || '-'
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';');
    });
    
    const csvContent = [csvHeaders, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cadastro_Materiais_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addToast('Backup Iniciado', 'O download do cadastro de materiais começou.', 'success');
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setDeletionPasswordInput('');
    setIsDeleteModalOpen(true);
  };

  const handleUpdate = async () => {
    if (selectedItem) {
      // Sanitize all string fields to remove surrounding quotes
      const sanitizedEditData = Object.keys(editFormData).reduce((acc, key) => {
        const val = editFormData[key];
        acc[key] = typeof val === 'string' ? val.replace(/^"|"$/g, '').trim() : val;
        return acc;
      }, {} as any);

      // Security check for budget (Verba) changes if applicable
      if (type === 'equipes') {
        const isBudgetChanged = sanitizedEditData.verbaDestinada !== selectedItem.verbaDestinada || 
                               sanitizedEditData.saldoAtualizado !== selectedItem.saldoAtualizado;
        
        if (isBudgetChanged && store.isDeletionPasswordEnabled) {
           if (deletionPasswordInput !== store.deletionPassword) {
             addToast('Segurança VRL', 'Senha de acesso incorreta. Alteração não autorizada.', 'error');
             return;
           }
        }
      }

      // Validation for updates too
      if (type === 'materiais') {
        const missing = [];
        if (!sanitizedEditData.descricao) missing.push('Descrição');
        
        if (missing.length > 0) {
          addToast('Campos Pendentes', `Não foi possível salvar. Faltam: ${missing.join(', ')}`, 'error');
          return;
        }
      }

      let result: { success: boolean; id?: string; error?: string } = { success: true };
      let label = '';
      switch(type) {
        case 'materiais': {
          const parseNumeric = (val: any) => {
            if (typeof val === 'number') return val;
            const cleaned = String(val || '0').replace(/\./g, '').replace(',', '.');
            return Number(cleaned) || 0;
          };

          const parsedData = { 
            ...sanitizedEditData,
            estoqueAtual: parseNumeric(sanitizedEditData.estoqueAtual),
            estoqueMinimo: parseNumeric(sanitizedEditData.estoqueMinimo),
            estoqueIdeal: parseNumeric(sanitizedEditData.estoqueIdeal),
            precoUnitario: parseNumeric(sanitizedEditData.precoUnitario),
          };
          result = await store.updateMaterial(selectedItem.id, parsedData); 
          label = sanitizedEditData.descricao || 'Material';
          break;
        }
        case 'colaboradores': 
          result = await store.updateColaborador(selectedItem.id, sanitizedEditData); 
          label = sanitizedEditData.nome || 'Colaborador';
          break;
        case 'equipes': 
          result = await store.updateEquipe(selectedItem.id, sanitizedEditData); 
          label = sanitizedEditData.nome || 'Equipe';
          break;
        case 'fornecedores': 
          result = await store.updateFornecedor(selectedItem.id, sanitizedEditData); 
          label = sanitizedEditData.nomeFantasia || 'Fornecedor';
          break;
        case 'empresas': 
          result = await store.updateEmpresa(selectedItem.id, sanitizedEditData); 
          label = sanitizedEditData.razaoSocial || 'Empresa';
          break;
      }

      if (result.success) {
        setIsEditModalOpen(false);
        setSelectedItem(null);
        addToast('Cadastro Atualizado!', label, 'success');
      } else {
        addToast('Erro ao Sincronizar', `A atualização de "${label}" falhou no Supabase. (${result.error})`, 'error');
      }
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
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share API fallback:', err?.message || err);
        shareViaEmail();
      }
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

  const downloadImportTemplate = () => {
    const headers = [
      'SAP', 
      'FORNECEDOR_NOME', 
      'COD_FORNECEDOR', 
      'UNIDADE', 
      'EQUIPE', 
      'ESTOQUE_ATUAL', 
      'DESCRICAO', 
      'ESTOQUE_MINIMO', 
      'ESTOQUE_IDEAL', 
      'PRECO_UNITARIO', 
      'LOCALIZACAO', 
      'DETALHES'
    ];
    
    const examples = [
      ['50104266', 'MACK CAMARGO', '75151212', 'UNI', 'Equipe A', '10', 'TORNEIRA COMUM 1/2', '5', '15', '45.50', 'Corredor A', 'Observação de teste']
    ];

    const csvContent = [
      headers,
      ...examples
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Modelo_Importacao_Materiais.csv`;
    link.click();
  };

  const importMaterialsFromFiles = () => {
    let imported = 0;
    materialsToImport.forEach(material => {
      const equipeName = material.equipe.trim();
      // Find the ID for the given equipe name
      const equipeInfo = store.equipes.find(e => e.nome === equipeName);
      
      store.addMaterial({
        ...material,
        equipe: equipeInfo ? equipeInfo.nome : (store.equipes[0]?.nome || equipeName), // Use name, fallback to first team name
        id: generateId(),
        ultimaMovimentacao: new Date().toLocaleDateString('pt-BR')
      });
      imported++;
    });                
    addToast('Base Importada', `${imported} materiais cadastrados com sucesso.`, 'success');
  };

  const importFullBase = async () => {
    const rawData = `50201022;;;un;Refrigeração;10;PLACA UNIVERSAL;2;4;129,9;;
50104266;;;un;Refrigeração;0;FITA SILVER TAPE 45MM X 25M;7;14;10;;
50370092;;;un;Refrigeração;0;CAPACITOR PARA AC DE 50 X 2,5 CONJUGADO;10;20;63,57;;
50203028;;;un;Refrigeração;0;TERMOSTATO DE BULBO BEBEDOURO;5;10;29,9;;
50080557;;;un;Refrigeração;0;FITA PVC DE ISOLAMENTO BRANCA;10;20;22,5;;
50060279;;;un;Refrigeração;0;FILTRO AP 200;20;40;84,9;;
50318288;;;un;Refrigeração;0;FILTRO AP 230;20;40;150;;
50058096;;;un;Refrigeração;6;CORREIA (B-27);7;14;25,1;;
50025730;;;un;Hidráulica;3;ADAPTADOR 50X1 1/2;5;10;28;;
50024201;;;un;Hidráulica;4;ADAPTADOR 40 mm X 1 1/4;6;12;5,5;;
50372423;;;un;Hidráulica;36;ASSENTO SANITRIO;50;100;34,9;;
50346313;;;un;Hidráulica;0;CHUVEIRO ARTICULADO;15;30;30;;
50184069;;;un;Hidráulica;2;CURVA 40;3;6;6;;
50013398;;;un;Hidráulica;9;ESPUDE P/ VASO SANITARIO;10;20;6;;
50079389;;;un;Hidráulica;5;JOELHO 20 45;5;10;25,48;;
50184079;;;un;Hidráulica;10;JOELHO 20 90;10;20;31,26;;
50240646;;;un;Hidráulica;2;JOELHO 25 45;5;10;14,7;;
50184475;;;un;Hidráulica;21;JOELHO 25 90;30;60;27,89;;
50287695;;;un;Hidráulica;15;JOELHO 32 90;20;40;55,03;;
50079924;;;un;Hidráulica;5;JOELHO 40 90;5;10;2;;
50056617;;;un;Hidráulica;0;JOELHO 50 45;5;10;7,79;;
50056612;;;un;Hidráulica;0;JOELHO 50 90;5;10;8,19;;
50311790;;;un;Hidráulica;11;JOELHO 60 45;5;10;28,9;;
50056612;;;un;Hidráulica;6;JOELHO 60 90;5;10;54,9;;
50076142;;;un;Hidráulica;0;JOELHO 75 90;5;10;8;;
50037546;;;un;Hidráulica;4;JOELHO AZUL 20X1/2;5;10;5,13;;
50079430;;;un;Hidráulica;0;ACABAMENTO VALVULA FLUX;5;10;150;;
50056062;;;un;Hidráulica;5;LUVA 20;5;10;0,5;;
50050176;;;un;Hidráulica;11;LUVA 25;20;40;0,5;;
50050175;;;un;Hidráulica;5;LUVA 32;5;10;1,12;;
50079312;;;un;Hidráulica;5;LUVA 40;5;10;2,4;;
50056060;;;un;Hidráulica;10;LUVA 50;5;10;4,56;;
50046456;;;un;Hidráulica;0;LUVA 60;5;10;16,3;;
50184083;;;un;Hidráulica;5;LUVA 75;5;10;25,9;;
50056062;;;un;Hidráulica;15;LUVA DE CORRER 20;5;10;14,9;;
50037677;;;un;Hidráulica;5;LUVA DE CORRER 32;5;10;31,9;;
50079312;;;un;Hidráulica;4;LUVA DE CORRER 40;5;10;36,99;;
50056060;;;un;Hidráulica;7;LUVA DE CORRER 50;5;10;38,4;;
50079317;;;un;Hidráulica;5;REGISTRO DE ESFERA C/ UNIÃO 25 X 3/4;5;10;28;;
50060498;;;un;Hidráulica;4;NIPLE 1/2;4;8;14,99;;
50060499;;;un;Hidráulica;12;NIPLE 3/4;4;8;3,9;;
50115144;;;un;Hidráulica;1;PISTÃO FLUX FABRIMAR;5;10;156,9;;
50367639;;;un;Hidráulica;1;RABICHO (ENGATE FLEXVEL PVC CURTO);10;20;30;;
50037546;;;un;Hidráulica;11;JOELHO DE 90 25 X 1/2;20;40;10,05;;
50161969;;;un;Hidráulica;8;REPARO P/ VALVULA HYDRA;10;20;35,15;;
50399315;;;un;Hidráulica;10;ADAPTADOR 20X1/2;10;20;2,86;;
50279248;;;un;Hidráulica;6;ADAPTADOR SOLDAVEL CURTO 32X1;6;12;6,67;;
50078062;;;un;Hidráulica;7;SIFÃO;10;20;7,89;;
50074658;;;un;Hidráulica;1;T 25;5;10;2,99;;
50371738;;;un;Hidráulica;5;TÃ 32;5;10;5,06;;
50075581;;;un;Hidráulica;0;TÃ 40;5;10;18,49;;
50076086;;;un;Hidráulica;3;TÃ 50;5;10;11,9;;
50287599;;;un;Hidráulica;0;TÃ 75;5;10;64;;
50079388;;;un;Hidráulica;5;TUBO 20;5;10;12,99;;
50060509;;;un;Hidráulica;5;TUBO 25;5;10;13,99;;
50056533;;;un;Hidráulica;2;TUBO 32;5;10;24,25;;
50046698;;;un;Hidráulica;5;TUBO 40;5;10;32,63;;
50060514;;;un;Hidráulica;0;TUBO 50;5;10;80,51;;
50060515;;;un;Hidráulica;0;TUBO 60;2;4;48,55;;
50115150;;;un;Hidráulica;1;BASE VALVULA DESCARGA HYDRA;3;6;231;;
50312962;;;un;Hidráulica;19;VALVULA AMERICANA 3 1/2;5;10;18,45;;
50279248;;;un;Hidráulica;0;ADAPTADOR 32;10;20;10;;
50218115;;;un;Hidráulica;0;ADAPTADOR 25 X 3/4;10;20;10;;
50079179;;gl;Pintura;0;TINTA EPOXI VERMELHA 3,6L;5;10;224,99;;
50078129;;gl;Pintura;7;TINTA PRETA ABSOLUTO FOSCO 18LTS;5;10;259,9;;
50079017;;gl;Pintura;9;MASSA CORRIDA;5;10;39,3;;
50004167;;;un;Pintura;0;LATA DE DILUENTE NR 905;20;40;22;;
50023950;;;un;Pintura;60;PINCEL 2 MÉDIO TIGRE;48;96;14,81;;
50011913;;;un;Pintura;26;FITA CREPE 24mm X 50m;50;100;26,7;;
50068975;;;un;Pintura;64;ROLO 09cm ANTIRRESPINGO (L BAIXA);50;100;12;;
50067578;;gl;Pintura;3;TINTA ACRILICA CROMIO 18L;3;6;351,14;;
50067578;;gl;Pintura;2;TINTA ACRILICA CINZA ELEFANTE 18L;2;4;351,14;;
50372026;;;un;Pintura;9;ROLO DE LÃ 15CM;20;40;15;;
50000098;;;un;Elétrica;0;PAINEL LED QUADRADO SOBREPOR 32W 40x40;20;40;75,4;;
50374148;;;un;Elétrica;5;PLUG MACHO 2P+T 10A;5;10;10;;
50069288;;;un;Elétrica;33;PLUG MACHO 2P+T 20A;5;10;9,9;;
50186130;;;un;Elétrica;28;PAINEL LED SOBREPOR QUADRADO 36W;5;10;29,9;;
50155999;;;un;Elétrica;50;REFLETORES DE 50W;30;60;37,16;;
50036830;;;un;Elétrica;42;LAMPADA LED TUBULAR T8 18W 6500K;60;120;7,99;;
50368629;;;un;Elétrica;1;REFLETORES DE 30W;30;60;27,4;;
50160530;;;un;Elétrica;42;LAMPADA LED 12W E27 BOLINHA;10;20;7;;
50079315;;;un;Elétrica;8;LAMPADA LED 9W E27;30;60;31,05;;
50117955;;;un;Elétrica;0;REFLETOR IP66 200W;15;30;29,49;;
50036830;;;un;Elétrica;52;LAMPADA LED TUBULAR 9W 60CM 6500K;50;100;12;;
50028600;;;un;Elétrica;0;LUMINRIA DE ILUMINAO PBLICA 200W 6000K LED IP66;20;40;223,31;;
50031543;;;un;Elétrica;20;PAINEL REDONDO EMBUTIR 18W 6500K;15;30;198,62;;
50323753;;;un;Elétrica;25;PAINEL REDONDO EMBUTIR 24W 6500K;15;30;220;;
50117955;;;un;Elétrica;6;REFLETOR 200W IP65;15;30;93,9;;
50326259;;;un;Elétrica;26;PAINEL LED QUADRADO SOBREPOR 24W;20;40;279,9;;
50117031;;;un;Elétrica;20;PLUG FEMEA 2P+T 20A;20;40;5,7;;
50326259;;;un;Elétrica;26;PAINEL LED QUADRADO EMBUTIR 24W;20;40;252,6;;
50318479;;;un;Elétrica;20;PAINEL LED QUADRADO SOBREPOR 18W;20;40;125,9;;
50317802;;;un;Elétrica;4;INTERRUPTOR SIMPLES;10;20;10,54;;
50318479;;;un;Elétrica;6;PAINEL LED QUADRADO EMBUTIR 18W;10;20;176,75;;
50036830;;;un;Elétrica;12;LAMPADA LED TUBO T5 115CM 18W 1900LM 3000K QUENTE;40;80;36,9;;
50036830;;;un;Elétrica;13;LAMPADA TUBULAR T8 9W 3000K;20;40;15,75;;
50356574;;;un;Elétrica;10;BALIZADOR (PONTO DE ONIBUS);5;10;150;;
50060037;;;un;Elétrica;20;DISJUNTOR MONOPOLAR 32A;20;40;4,99;;
50068244;;;un;Elétrica;9;DISJUNTOR MONOPOLAR 20A;20;40;8,38;;
50069213;;;un;Civil;4;ABRAÇADEIRA COPO 1/2;10;20;10;;
50237421;;;un;Civil;10;ABRAÇADEIRA COPO 3/4;10;20;10;;
50188414;;;un;Civil;0;BUCHA COM PARAFUSO N 8;20;40;0,25;;
50081576;;;un;Civil;-2;ESCOVA DE AÇO;3;6;12;;
50192931;;;un;Civil;7;MANTA DE FIBRA DE VIDRO;3;6;32;;
50077105;;;un;Civil;8;BUCHA C/ PARAFUSO SEXT N 10;5;10;3,89;;
50337134;;;un;Civil;0;MANTA ALUMINIZADA 10,00 X 0,30M;2;4;69,9;;
50012738;;;un;Civil;0;DISCO DE CORTE SECO;5;10;18,75;;
50371950;;gl;Civil;10;ARGAMASSA;5;10;47,9;;
50026166;;;un;Civil;0;ASFALTO FRIO;30;60;89,9;;
50081390;;sc;Civil;2;CIMENTO;9;18;27,59;;
50025718;;sc;Civil;9;GESSO EM PÓ;10;20;4,61;;
50025922;;m²;Civil;0;AREIA LAVADA (m);1;2;5,69;;
50027172;;m²;Civil;0;BRITA 01 (m);1;2;119,9;;
50060334;;;un;Civil;0;LIXA 225X275mm G 220;100;200;3,57;;
50079430;;;un;Hidráulica;0;ACABAMENTO P/ VALVULA DESCARGA BLUKIT;5;10;10;;
50056062;;;un;Hidráulica;5;LUVA 20;5;10;0,5;;
50050176;;;un;Hidráulica;11;LUVA 25;20;40;0,5;;
50050175;;;un;Hidráulica;5;LUVA 32;5;10;1,12;;
50079312;;;un;Hidráulica;5;LUVA 40;5;10;2,4;;
50056060;;;un;Hidráulica;10;LUVA 50;5;10;4,56;;
50046456;;;un;Hidráulica;0;LUVA 60;5;10;16,3;;
50184083;;;un;Hidráulica;5;LUVA 75;5;10;25,9;;
50056062;;;un;Hidráulica;15;LUVA DE CORRER 20;5;10;14,9;;
50037677;;;un;Hidráulica;5;LUVA DE CORRER 32;5;10;31,9;;
50079312;;;un;Hidráulica;4;LUVA DE CORRER 40;5;10;36,99;;
50056060;;;un;Hidráulica;7;LUVA DE CORRER 50;5;10;38,4;;`;

    const lines = rawData.split('\n');
    let imported = 0;
    
    for (const line of lines) {
      const parts = line.split(';');
      if (parts.length >= 7) {
        // [SAP, FORN, COD_F, UN, EQ, EST, DESC, MIN, IDEAL, PRECO, LOC, DET]
        const sap = parts[0];
        const equipeRaw = parts[4];
        
        // Map equipe to allowed values
        let equipeName = 'Geral';
        if (equipeRaw.includes('Refrigera')) equipeName = 'Refrigeração';
        else if (equipeRaw.includes('Hidr')) equipeName = 'Hidráulica';
        else if (equipeRaw.includes('El')) equipeName = 'Elétrica';
        else if (equipeRaw.includes('Civil')) equipeName = 'Civil';
        else if (equipeRaw.includes('Pint')) equipeName = 'Pintura';
        
        await store.addMaterial({
          sap,
          descricao: parts[6],
          unidade: parts[3] === 'UM' ? 'UNI' : (parts[3] || 'UNI'),
          equipe: store.equipes.find(e => e.nome === equipeName)?.nome || (store.equipes[0]?.nome || 'Geral'),
          estoqueAtual: Number(parts[5]) || 0,
          estoqueMinimo: Number(parts[7]) || 0,
          estoqueIdeal: Number(parts[8]) || 0,
          precoUnitario: Number(parts[9].replace(',', '.')) || 0,
          codigoFornecedor: parts[2],
          localizacao: parts[10],
          detalhes: parts[11],
          ultimaMovimentacao: new Date().toLocaleDateString('pt-BR')
        });
        imported++;
      }
    }                
    addToast('Base Importada', `${imported} materiais cadastrados com sucesso no banco de dados.`, 'success');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      
      if (lines.length <= 1) {
        addToast('Erro na Planilha', 'O arquivo está vazio ou incompleto.', 'error');
        return;
      }

      // Skip header
      const rows = lines.slice(1).filter(line => line.trim() !== '');
      let successCount = 0;
      let errorCount = 0;

      for (const line of rows) {
        const columns = line.split(';');
        if (columns.length >= 7) {
          try {
            const sap = columns[0].trim();
            const fornNome = columns[1].trim();
            const codForn = columns[2].trim();
            let unidadeRaw = columns[3] ? columns[3].trim().toUpperCase() : 'UNI';
            const unidade = (unidadeRaw === 'UN' || unidadeRaw === 'UM') ? 'UNI' : unidadeRaw;
            const equipeName = columns[4].trim();
            const estoqueAtual = Number(columns[5].trim()) || 0;
            const descricao = columns[6].trim();
            const estoqueMin = Number(columns[7]?.trim()) || 0;
            const estoqueIdeal = Number(columns[8]?.trim()) || 0;
            const precoUnit = Number(columns[9]?.trim()) || 0;
            const localizacao = columns[10]?.trim() || '';
            const detalhes = columns[11]?.trim() || '';

            if (sap && descricao) {
              // Try to find fornecedor ID by name
              const fornecedor = store.fornecedores.find(f => 
                f.nomeFantasia.toLowerCase() === fornNome.toLowerCase()
              );
              
              const result = await store.addMaterial({
                sap,
                codigoFornecedor: codForn,
                fornecedorId: fornecedor?.id || '',
                descricao,
                unidade: unidade || 'UNI',
                estoqueMinimo: estoqueMin,
                estoqueIdeal: estoqueIdeal,
                estoqueAtual: estoqueAtual,
                precoUnitario: precoUnit,
                equipe: store.equipes.find(e => e.nome === equipeName)?.nome || (store.equipes[0]?.nome || 'Geral'),
                localizacao,
                detalhes,
                ultimaMovimentacao: new Date().toLocaleDateString('pt-BR')
              });
              
              if (result.success) successCount++;
              else errorCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            console.error('Error importing row:', err);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        addToast('Importação Concluída', `${successCount} materiais importados com sucesso!`, 'success');
      }
      if (errorCount > 0) {
        addToast('Aviso de Importação', `${errorCount} linhas falharam no carregamento.`, 'error');
      }
      
      // Clear input
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkDelete = async () => {
    if (store.isDeletionPasswordEnabled && deletionPasswordInput !== store.deletionPassword) {
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

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      if (store.isDeletionPasswordEnabled && deletionPasswordInput !== store.deletionPassword) {
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
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          COD SAP
        </label>
        <CopyableInput 
          type="text" 
          className="input-field-compact transition-all duration-300"
          placeholder="Ex: 50104266" 
          value={formData.sap || ''}
          onChange={(val) => handleInputChange('sap', val)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">NCM</label>
        <CopyableInput 
          type="text" 
          className="input-field-compact" 
          placeholder="Ex: 8481.80.19"
          value={formData.ncm || ''}
          onChange={(val) => handleInputChange('ncm', val)}
        />
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">FORNECEDOR</label>
        <select 
          className="input-field-compact pr-8"
          value={formData.fornecedorId || ''}
          onChange={(e) => {
            const val = e.target.value;
            const f = sortedFornecedoresList.find(x => x.id === val);
            setFormData({ 
              ...formData, 
              fornecedorId: val,
              codigoFornecedor: f && f.codigoFornecedor ? f.codigoFornecedor : (val ? formData.codigoFornecedor : '')
            });
          }}
        >
          <option value="">Selecione...</option>
          {sortedFornecedoresList.map((f, idx) => <option key={`${f.id}_${idx}`} value={f.id}>{f.nomeFantasia}</option>)}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">CÓD. FORNECEDOR</label>
        <CopyableInput 
          type="text" 
          className="input-field-compact" 
          placeholder="Ex: 75151212"
          value={formData.codigoFornecedor || ''}
          onChange={(val) => handleInputChange('codigoFornecedor', val)}
        />
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">EQUIPE</label>
        <select
          className="input-field-compact pr-8"
          value={formData.equipe || ''}
          onChange={(e) => handleInputChange('equipe', e.target.value)}
        >
          <option value="">Selecione...</option>
          {sortedEquipesList.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">UNIDADE</label>
        <select 
          className="input-field-compact pr-8"
          value={formData.unidade || 'UNI'}
          onChange={(e) => handleInputChange('unidade', e.target.value)}
        >
          <option value="GL">GL</option>
          <option value="GR">GR</option>
          <option value="KG">KG</option>
          <option value="MT">MT</option>
          <option value="SC">SC</option>
          <option value="PC">PC</option>
          <option value="LT">LT</option>
          <option value="UNI">UNI</option>
        </select>
      </div>

      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          DESCRIÇÃO
        </label>
        <CopyableInput 
          type="text" 
          className="input-field-compact transition-all duration-300"
          placeholder="Ex: TORNEIRA COMUM 1/2 BEBEDOURO" 
          value={formData.descricao || ''}
          onChange={(val) => handleInputChange('descricao', val)}
        />
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">DESCRIÇÃO SIMPLES SAP</label>
        <CopyableInput 
          type="text" 
          className="input-field-compact" 
          placeholder="Descrição simplificada SAP"
          value={formData.descricaoSimplesSap || ''}
          onChange={(val) => handleInputChange('descricaoSimplesSap', val)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">DESCRIÇÃO COMPLETA SAP</label>
        <CopyableInput 
          type="text" 
          className="input-field-compact" 
          placeholder="Descrição completa SAP"
          value={formData.descricaoCompletaSap || ''}
          onChange={(val) => handleInputChange('descricaoCompletaSap', val)}
        />
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">ESTOQUE ATUAL</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="0" 
          value={String(formData.estoqueAtual ?? '').replace('.', ',')}
          onChange={(e) => handleInputChange('estoqueAtual', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">PREÇO UNITÁRIO (R$)</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="0,00" 
          value={String(formData.precoUnitario ?? '').replace('.', ',')}
          onChange={(e) => handleInputChange('precoUnitario', e.target.value)}
        />
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">ESTOQUE MIN.</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="5" 
          value={String(formData.estoqueMinimo ?? '').replace('.', ',')}
          onChange={(e) => handleInputChange('estoqueMinimo', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">ESTOQUE IDEAL</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="10" 
          value={String(formData.estoqueIdeal ?? '').replace('.', ',')}
          onChange={(e) => handleInputChange('estoqueIdeal', e.target.value)}
        />
      </div>

      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">LOCALIZAÇÃO</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="Corredor A / Prateleira 2" 
          value={formData.localizacao || ''}
          onChange={(e) => handleInputChange('localizacao', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">DETALHES / OBSERVAÇÃO</label>
        <textarea 
          className="input-field-compact min-h-[60px] py-2" 
          placeholder="Observações adicionais..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderColaboradoresForm = () => (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Matrícula / ID</label>
        <input 
          type="text" 
          className="input-field-compact bg-slate-50 font-mono" 
          value={formData.matricula || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Equipe Vinculada</label>
        <select 
          className="input-field-compact pr-8"
          value={formData.equipe || ''}
          onChange={(e) => handleInputChange('equipe', e.target.value)}
        >
          <option value="">Selecione...</option>
          {sortedEquipesList.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
        </select>

      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          Nome Completo
        </label>
        <input 
          type="text" 
          className="input-field-compact transition-all duration-300"
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Empresa</label>
        <select 
          className="input-field-compact pr-10" 
          value={formData.empresa || ''}
          onChange={(e) => handleInputChange('empresa', e.target.value)}
        >
          <option value="">Selecione o Parceiro / Empresa...</option>
          {sortedEmpresasList.map((emp, idx) => (
            <option key={`${emp.id}_${idx}`} value={emp.razaoSocial}>
              {emp.razaoSocial}
            </option>
          ))}
        </select>

      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Contato (Telefone)</label>
        <input 
          type="text" 
          className="input-field-compact" 
          value={formData.contato || ''}
          onChange={(e) => handleInputChange('contato', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cargo / Função</label>
        <select 
          className="input-field-compact pr-8"
          value={formData.cargo || ''}
          onChange={(e) => handleInputChange('cargo', e.target.value)}
        >
          <option value="">Selecione...</option>
          {["ADM", "AJUDANTE", "ELETRICISTA", "ENCARREGADO", "GESSEIRO", "GESTOR", "MECÂNICO", "OUTROS", "PEDREIRO", "PINTOR", "SUPERVISOR", "TST"].map(cargo => (
            <option key={cargo} value={cargo}>{cargo}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Status</label>
        <select 
          className="input-field-compact pr-8"
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
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Empresa</label>
        <input 
          type="text" 
          className="input-field-compact bg-slate-50 font-mono" 
          value={formData.codigoEmpresa || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          Razão Social
        </label>
        <input 
          type="text" 
          className="input-field-compact transition-all duration-300"
          value={formData.razaoSocial || ''}
          onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">CNPJ</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="00.000.000/0000-00" 
          value={formData.cnpj || ''}
          onChange={(e) => handleInputChange('cnpj', maskCNPJ(e.target.value))}
          maxLength={18}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Nº Contrato</label>
        <input 
          type="text" 
          className="input-field-compact" 
          value={formData.numContrato || ''}
          onChange={(e) => handleInputChange('numContrato', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Área de Atuação</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="Ex: Elétrica, Logística..." 
          value={formData.areaAtuacao || ''}
          onChange={(e) => handleInputChange('areaAtuacao', e.target.value)}
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">E-mail Comercial</label>
        <input 
          type="email" 
          className="input-field-compact" 
          placeholder="contato@empresa.com" 
          value={formData.emailComercial || ''}
          onChange={(e) => handleInputChange('emailComercial', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Detalhes Adicionais</label>
        <textarea 
          className="input-field-compact min-h-[60px] py-2" 
          placeholder="Observações complementares sobre a empresa..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderFornecedoresForm = () => (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Fornecedor</label>
        <input 
          type="text" 
          className="input-field-compact bg-slate-50 font-mono" 
          value={formData.codigoFornecedor || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">CNPJ / CPF</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="00.000.000/0000-00"
          value={formData.cnpj || ''}
          onChange={(e) => handleInputChange('cnpj', maskCNPJ(e.target.value))}
          maxLength={18}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          Nome Fantasia
        </label>
        <input 
          type="text" 
          className="input-field-compact transition-all duration-300"
          value={formData.nomeFantasia || ''}
          onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
        />
      </div>
      <div>
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Telefone</label>
        <input 
          type="text" 
          className="input-field-compact" 
          value={formData.telefone || ''}
          onChange={(e) => handleInputChange('telefone', e.target.value)}
        />
      </div>
      <div>
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">ÁREA COMERCIAL</label>
        <input 
          type="text" 
          className="input-field-compact" 
          placeholder="Ex: Elétrica, Hidráulica..."
          value={formData.categoria || ''}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">E-mail Comercial</label>
        <input 
          type="email" 
          className="input-field-compact" 
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Detalhes Adicionais</label>
        <textarea 
          className="input-field-compact min-h-[60px] py-2" 
          placeholder="Observações complementares sobre o fornecedor..."
          value={formData.detalhes || ''}
          onChange={(e) => handleInputChange('detalhes', e.target.value)}
        ></textarea>
      </div>
    </div>
  );

  const renderEquipesForm = () => (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Equipe</label>
        <input 
          type="text" 
          className="input-field-compact bg-slate-50 font-mono" 
          value={formData.codigoEquipe || ''}
          readOnly
        />
      </div>
      <div className="col-span-2 md:col-span-1">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Centro de Custo</label>
        <input 
          type="text" 
          className="input-field-compact" 
          value={formData.centroCusto || ''}
          onChange={(e) => handleInputChange('centroCusto', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block flex items-center gap-1">
          Nome da Equipe <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          className={`input-field-compact transition-all duration-300 ${invalidFields.includes('nome') ? 'ring-2 ring-red-500 border-red-500 animate-pulse bg-red-50' : ''}`} 
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Gestor Líder</label>
        <input 
          type="text" 
          className="input-field-compact" 
          value={formData.gestor || ''}
          onChange={(e) => handleInputChange('gestor', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 md:col-span-1">
          <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Verba Inicial (R$)</label>
          <input 
            type="number" 
            className="input-field-compact" 
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
          <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Saldo Atual (R$)</label>
          <input 
            type="number" 
            className="input-field-compact bg-slate-50" 
            value={formData.saldoAtualizado || ''}
            readOnly
          />
        </div>
      </div>
      <div className="col-span-2">
        <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cor de Ident.</label>
        <input 
          type="color" 
          className="input-field-compact p-1 h-8 w-24" 
          value={formData.cor || '#000000'}
          onChange={(e) => handleInputChange('cor', e.target.value)}
        />
      </div>
    </div>
  );

  const renderList = () => {
    return (
      <table className={`w-full text-left table-auto border-separate border-spacing-0`}>
        <thead className="sticky top-0 z-30 bg-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <tr>
            <th className="px-2 py-2 w-8 text-center border-b border-slate-200">
              <input 
                type="checkbox"
                className="rounded border-slate-300 text-brand-accent focus:ring-brand-accent w-3.5 h-3.5 cursor-pointer"
                checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                onChange={() => {
                  if (selectedIds.length === sortedData.length) setSelectedIds([]);
                  else setSelectedIds(sortedData.map((d: any) => d.id));
                }}
              />
            </th>
            {headers.map((h, i) => {
              const isNumeric = ['EST. ATUAL', 'EST. MÍN.', 'EST. IDEAL', 'EST. MÍN'].includes(h);
              const isCurrency = ['PREÇO UNIT.', 'VALOR TOTAL', 'Verba Inicial', 'Saldo Atual'].includes(h);
              const isCenter = isNumeric || h === 'UNID.' || h === 'AÇÕES' || h === 'Matrícula';
              const isRight = isCurrency;

              return (
                <th 
                  key={i} 
                  className={`px-2 py-2 text-[9px] whitespace-nowrap font-black text-slate-500 tracking-wider uppercase border-b border-slate-200 ${
                    isCenter ? 'text-center' : isRight ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 1} className="py-20 text-center text-slate-300 italic text-[11px]">
                Nenhum registro encontrado em {type}.
              </td>
            </tr>
          ) : (
            sortedData.map((item, idx) => (
                <tr 
                  key={item.id || `reg-${idx}`} 
                  className="table-row group hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => handleEditClick(item)}
                >
                  <td className="px-1 py-1 text-center border-b border-brand-dark/10" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => {
                        if (selectedIds.includes(item.id)) setSelectedIds(prev => prev.filter(id => id !== item.id));
                        else setSelectedIds(prev => [...prev, item.id]);
                      }}
                    />
                  </td>
                  {type === 'materiais' && (
                      <>
                        <td className="px-1 py-1 font-mono text-slate-500 text-[9px] border-b border-brand-dark/10 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {item.syncStatus === 'pending' && <CloudOff className="w-2.5 h-2.5 text-amber-500 animate-pulse" title="Pendente de sincronização" />}
                            <CopyableText value={item.sap} className="font-mono" />
                          </div>
                        </td>
                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10 uppercase overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]">
                          <CopyableText value={sortedFornecedoresList.find(f => f.id === item.fornecedorId)?.nomeFantasia || '-'} truncate />
                        </td>

                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10">
                          <CopyableText value={item.codigoFornecedor} />
                        </td>
                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10">
                          <CopyableText value={item.ncm} />
                        </td>
                        <td className="px-1 py-1 border-b border-brand-dark/10 min-w-[100px] max-w-[140px]">
                          <CopyableText value={item.descricao} className="font-bold text-slate-800 text-[10px] leading-tight mb-0.5" truncate title={item.descricao} />
                          {item.detalhes && <p className="text-[8px] text-slate-400 italic line-clamp-1">{item.detalhes}</p>}
                        </td>
                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10 max-w-[100px] truncate">
                          <CopyableText value={item.descricaoSimplesSap} truncate title={item.descricaoSimplesSap} />
                        </td>
                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10 max-w-[120px] truncate">
                          <CopyableText value={item.descricaoCompletaSap} truncate title={item.descricaoCompletaSap} />
                        </td>
                        <td className="px-1 py-1 text-slate-400 font-medium text-[9px] border-b border-brand-dark/10">
                          {item.equipe || '-'}
                        </td>

                        <td className="px-1 py-1 font-bold tabular-nums text-center border-b border-brand-dark/10 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            key={`${item.id}-estoqueAtual-${item.estoqueAtual}`}
                            type="text"
                            className={`w-full h-6 text-center border rounded font-bold tabular-nums text-[9.5px] focus:ring-1 focus:outline-none ${
                              (item.estoqueAtual || 0) >= (item.estoqueIdeal || 0) 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500' 
                              : (item.estoqueAtual || 0) === 0 
                              ? 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500' 
                              : 'bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500'
                            }`}
                            defaultValue={String(item.estoqueAtual ?? '').replace('.', ',')}
                            onBlur={(e) => {
                              const cleaned = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = cleaned === '' ? 0 : Number(cleaned);
                              if (!isNaN(val)) {
                                handleInlineUpdate(item.id, 'estoqueAtual', val, 'Estoque Atual');
                              }
                            }}
                          />
                        </td>
                        <td className="px-1 py-1 font-bold tabular-nums text-center border-b border-brand-dark/10 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            key={`${item.id}-estoqueMinimo-${item.estoqueMinimo}`}
                            type="text"
                            className="w-full h-6 text-center border border-slate-200 rounded font-bold tabular-nums text-slate-700 text-[9.5px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            defaultValue={String(item.estoqueMinimo ?? '').replace('.', ',')}
                            onBlur={(e) => {
                              const cleaned = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = cleaned === '' ? 0 : Number(cleaned);
                              if (!isNaN(val)) {
                                handleInlineUpdate(item.id, 'estoqueMinimo', val, 'Estq. Mínimo');
                              }
                            }}
                          />
                        </td>
                        <td className="px-1 py-1 font-bold tabular-nums text-center border-b border-brand-dark/10 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            key={`${item.id}-estoqueIdeal-${item.estoqueIdeal}`}
                            type="text"
                            className="w-full h-6 text-center border border-slate-200 rounded font-bold tabular-nums text-slate-700 text-[9.5px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            defaultValue={String(item.estoqueIdeal ?? '').replace('.', ',')}
                            onBlur={(e) => {
                              const cleaned = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = cleaned === '' ? 0 : Number(cleaned);
                              if (!isNaN(val)) {
                                handleInlineUpdate(item.id, 'estoqueIdeal', val, 'Estq. Ideal');
                              }
                            }}
                          />
                        </td>
                        <td className="px-1 py-1 text-right border-b border-brand-dark/10 w-12" onClick={(e) => e.stopPropagation()}>
                          <input
                            key={`${item.id}-precoUnitario-${item.precoUnitario}`}
                            type="text"
                            className="w-full h-6 text-right border border-slate-200 rounded font-bold tabular-nums text-slate-700 text-[9.5px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            defaultValue={String(item.precoUnitario ?? '').replace('.', ',')}
                            onBlur={(e) => {
                              const cleaned = e.target.value.replace(/\./g, '').replace(',', '.');
                              const val = cleaned === '' ? 0 : Number(cleaned);
                              if (!isNaN(val)) {
                                handleInlineUpdate(item.id, 'precoUnitario', val, 'Preço');
                              }
                            }}
                          />
                        </td>
                        <td className="px-1 py-1 font-bold tabular-nums text-right text-slate-700 border-b border-brand-dark/10 text-[9px] whitespace-nowrap">
                          R${((item.estoqueAtual || 0) * (item.precoUnitario || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-1 py-1 text-center text-slate-500 text-[8px] uppercase border-b border-brand-dark/10 w-8">{item.unidade}</td>
                        <td className="px-1 py-1 text-slate-400 text-[8px] border-b border-brand-dark/10 w-12 truncate min-w-[30px]">{item.localizacao || '-'}</td>
                      </>
                    )}
                    {type === 'equipes' && (
                      <>
                        <td className="px-1 py-1 font-semibold text-[10px] text-brand-dark border-b border-brand-dark/10">{item.nome}</td>
                        <td className="px-1 py-1 text-slate-500 text-[9px] border-b border-brand-dark/10">{item.centroCusto}</td>
                        <td className="px-1 py-1 text-slate-500 text-[9px] border-b border-brand-dark/10">{item.gestor}</td>
                        <td className="px-1 py-1 font-bold tabular-nums text-slate-600 text-[9px] border-b border-brand-dark/10 whitespace-nowrap">R$ {item.verbaDestinada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className={`px-1 py-1 font-bold tabular-nums text-[9px] border-b border-brand-dark/10 whitespace-nowrap ${item.saldoAtualizado < 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {item.saldoAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    {type === 'colaboradores' && (
                      <>
                        <td className="px-1 py-1 font-mono text-[9px] text-slate-500 border-b border-brand-dark/10">
                          <div className="flex items-center gap-1">
                            {item.syncStatus === 'pending' && <CloudOff className="w-2.5 h-2.5 text-amber-500 animate-pulse" title="Pendente de sincronização" />}
                            {item.matricula}
                          </div>
                        </td>
                        <td className="px-1 py-1 font-semibold text-[10px] text-brand-dark border-b border-brand-dark/10">{item.nome}</td>
                        <td className="px-1 py-1 text-[9px] text-slate-500 border-b border-brand-dark/10">{item.empresa}</td>
                        <td className="px-1 py-1 text-[9px] text-slate-500 border-b border-brand-dark/10">{item.cargo}</td>
                        <td className="px-1 py-1 border-b border-brand-dark/10">
                          <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                            {item.equipe}
                          </span>
                        </td>
                      </>
                    )}
                    {type === 'empresas' && (
                      <>
                        <td className="px-1 py-1 font-semibold text-[10px] text-brand-dark border-b border-brand-dark/10">{item.razaoSocial}</td>
                        <td className="px-1 py-1 text-[9px] text-slate-500 font-mono italic border-b border-brand-dark/10">{item.cnpj}</td>
                        <td className="px-1 py-1 text-[9px] text-slate-500 border-b border-brand-dark/10">{item.numContrato}</td>
                      </>
                    )}
                    {type === 'fornecedores' && (
                      <>
                        <td className="px-1 py-1 font-mono text-[8.5px] text-slate-400 border-b border-brand-dark/10">{item.codigoFornecedor}</td>
                        <td className="px-1 py-1 font-semibold text-[10px] text-brand-dark border-b border-brand-dark/10">{item.nomeFantasia}</td>
                        <td className="px-1 py-1 text-[9px] text-slate-500 font-mono italic border-b border-brand-dark/10">{item.cnpj}</td>
                        <td className="px-1 py-1 text-blue-600 underline text-[9px] border-b border-brand-dark/10">{item.email}</td>
                      </>
                    )}
                    <td className="px-1 py-1 text-right border-b border-brand-dark/10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {type === 'materiais' && (
                          <button 
                            tabIndex={-1}
                            onClick={() => handleShareClick(item)}
                            className="p-1 px-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 bg-white border border-slate-200 rounded transition-all"
                            title="Compartilhar"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          tabIndex={-1}
                          onClick={() => handleEditClick(item)}
                          className="p-1 px-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 bg-white border border-slate-200 rounded transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          tabIndex={-1}
                          onClick={() => handleDeleteClick(item)}
                          className="p-1 px-1.5 text-slate-400 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    <div className="view-container">
      <div className="scroll-container space-y-6">
        {type === 'materiais' && (
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 shrink-0">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span><strong>{totalMateriais}</strong> modelos cadastrados</span>
              </div>
              <div className="h-3 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Estoque Geral: <strong>{totalStockGeral.toLocaleString('pt-BR')}</strong> unids</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block shrink-0">Estoque por Equipe:</span>
              <div className="flex flex-wrap gap-1">
                {statsPorEquipe.map((eq, i) => {
                  if (eq.count === 0 && eq.totalStock === 0) return null; // Only show teams with some data to keep it clean
                  const isActive = activeFilters.equipe === eq.nome;
                  return (
                    <button 
                      key={eq.nome || i}
                      onClick={() => setActiveFilters(prev => ({ ...prev, equipe: prev.equipe === eq.nome ? '' : eq.nome }))}
                      className={`inline-flex items-center gap-1.5 border rounded-lg px-2 py-0.5 text-[10px] shadow-2xs transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-200' 
                          : 'bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span 
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'animate-[pulse_1s_ease-in-out_infinite] bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} 
                        style={isActive ? undefined : { backgroundColor: eq.color || '#94a3b8' }} 
                      />
                      <span className={`font-bold ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>{eq.nome}:</span>
                      <span className={`text-[9px] font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {eq.count} <span className={isActive ? 'text-emerald-500/70' : 'text-slate-400'}>cad</span> / {eq.totalStock.toLocaleString('pt-BR')} <span className={isActive ? 'text-emerald-500/70' : 'text-slate-400'}>un</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 lg:sticky lg:top-0 z-10">
          <div className="card shadow-md border-brand-accent/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cadastrar {type === 'materiais' ? 'Material' : type === 'empresas' ? 'Empresa' : type === 'fornecedores' ? 'Fornecedor' : type === 'colaboradores' ? 'Colaborador' : 'Equipe'}
              </h3>
              
              {type === 'materiais' && (
                <div className="flex items-center gap-2">
                </div>
              )}
            </div>
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
                disabled={isSaving}
                className={`btn-primary !h-8 text-[11px] w-full flex items-center justify-center gap-2 mt-4 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Cadastro
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 min-h-[600px] lg:h-[calc(100vh-140px)]">
          <div className="card !p-0 shadow-sm border-slate-200 flex flex-col h-full bg-slate-50/30 overflow-hidden">
            {/* Header Title & Search Welded */}
            <div className="flex-none bg-white border-b border-slate-200 z-40">
              <div className="h-[52px] px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {type === 'materiais' && <Package className="w-4 h-4 text-brand-accent" />}
                  {type === 'colaboradores' && <Users className="w-4 h-4 text-brand-accent" />}
                  {type === 'equipes' && <Users className="w-4 h-4 text-brand-accent" />}
                  {type === 'empresas' && <MapPin className="w-4 h-4 text-brand-accent" />}
                  {type === 'fornecedores' && <Truck className="w-4 h-4 text-brand-accent" />}
                  <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest shrink-0">
                    {type === 'materiais' ? 'Materiais Cadastrados' : 
                     type === 'colaboradores' ? 'Colaboradores Cadastrados' :
                     type === 'equipes' ? 'Equipes Cadastradas' :
                     type === 'empresas' ? 'Empresas Cadastradas' : 'Fornecedores Cadastrados'}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <div className="flex items-center gap-1.5">
                    {selectedIds.length > 0 && (
                      <button 
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        className="h-8 p-1.5 px-3 flex items-center gap-1.5 text-[10px] font-black uppercase transition-all bg-red-100 text-red-600 hover:bg-red-200 rounded-lg mr-1 transform active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        DELETAR ({selectedIds.length})
                      </button>
                    )}

                    {sortedData.some((i: any) => i.syncStatus === 'pending') && (
                      <div 
                        className="h-8 px-2.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg flex items-center gap-2 animate-pulse cursor-help"
                        title="Há itens salvos localmente aguardando sincronização com o banco de dados."
                      >
                        <CloudOff className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-tighter shrink-0">PENDENTE</span>
                      </div>
                    )}

                    {type === 'materiais' && (
                      <>
                        <button 
                          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                          className={`h-8 px-2.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap group shrink-0 ${isFiltersOpen || Object.values(activeFilters).some(v => String(v).trim() !== '') ? 'bg-brand-accent text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-brand-accent hover:bg-slate-100 border border-slate-200/60'}`}
                          title="Filtros Avançados"
                        >
                          <Database className={`w-3.5 h-3.5 shrink-0 ${isFiltersOpen || Object.values(activeFilters).some(v => String(v).trim() !== '') ? 'text-white' : 'text-slate-400 group-hover:text-brand-accent'}`} />
                          <span className="text-[10px] font-black uppercase tracking-wider block shrink-0">Filtros</span>
                          {Object.values(activeFilters).some(v => String(v).trim() !== '') && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-white shrink-0 animate-pulse"></div>}
                        </button>

                        <button 
                          onClick={exportMaterialsCSV}
                          className="h-8 px-2.5 bg-slate-50 text-slate-500 hover:text-brand-accent hover:bg-slate-100 border border-slate-200/60 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap group shrink-0"
                          title="Baixar Backup"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-accent shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider block shrink-0">BAIXAR</span>
                        </button>
                        
                        <button 
                          onClick={handleShareStock}
                          className="h-8 px-2.5 bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200/60 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap group shrink-0"
                          title="Compartilhar"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider block shrink-0">COMPARTILHAR</span>
                        </button>
                      </>
                    )}

                    <div 
                      className={`relative flex items-center rounded-lg border transition-all duration-300 bg-slate-50 border-slate-200/60 ${isSearchExpanded || searchTerm ? 'bg-white border-brand-accent ring-2 ring-brand-accent/5 w-[220px]' : 'w-8 lg:w-40'}`}
                    >
                      <Search className={`w-3.5 h-3.5 absolute left-2.5 transition-colors ${isSearchExpanded || searchTerm ? 'text-brand-accent' : 'text-slate-400'}`} />
                      <input 
                        type="text" 
                        className="w-full h-8 pl-9 pr-8 bg-transparent text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none" 
                        placeholder="PESQUISAR MATERIAL, SAP, FORNECEDOR, CÓD. FORN, EQUIPE..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                        onFocus={() => setIsSearchExpanded(true)}
                        onBlur={() => { if (!searchTerm) setIsSearchExpanded(false); }}
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }}
                          className="absolute right-1.5 p-1 text-slate-300 hover:text-slate-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {(isFiltersOpen && type === 'materiais') && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50/80 border-t border-slate-200"
                  >
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-brand-accent" />
                            Equipe Responsável
                          </label>
                          <select 
                            className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/5 transition-all appearance-none cursor-pointer"
                            value={activeFilters.equipe}
                            onChange={(e) => setActiveFilters({ ...activeFilters, equipe: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                          >
                            <option value="">Todas as Equipes</option>
                            {sortedEquipesList.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                            <Truck className="w-3 h-3 text-brand-accent" />
                            Fornecedor Principal
                          </label>
                          <select 
                            className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/5 transition-all appearance-none cursor-pointer"
                            value={activeFilters.fornecedorId}
                            onChange={(e) => setActiveFilters({ ...activeFilters, fornecedorId: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                          >
                            <option value="">Todos os Fornecedores</option>
                            {sortedFornecedoresList.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-brand-accent" />
                            Localização de Estoque
                          </label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="FILTRAR POR LOCAL..."
                              className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/5 transition-all"
                              value={activeFilters.localizacao}
                              onChange={(e) => setActiveFilters({ ...activeFilters, localizacao: e.target.value.toUpperCase() })}
                            />
                            {activeFilters.localizacao && (
                              <button 
                                onClick={() => setActiveFilters({ ...activeFilters, localizacao: '' })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-brand-accent" />
                            Filtrar por Valor
                          </label>
                          <select 
                            className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-[11px] font-bold text-slate-700 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/5 transition-all appearance-none cursor-pointer"
                            value={activeFilters.ordemValor}
                            onChange={(e) => setActiveFilters({ ...activeFilters, ordemValor: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.8rem' }}
                          >
                            <option value="">Ordem Alfabética</option>
                            <option value="maior">Maior Valor Total</option>
                            <option value="menor">Menor Valor Total</option>
                            <option value="preco_maior">Maior Preço Unitário</option>
                            <option value="preco_menor">Menor Preço Unitário</option>
                          </select>
                        </div>
                    </div>
                    
                    <div className="px-4 pb-4 flex justify-end gap-2">
                        <button 
                          onClick={() => setActiveFilters({ equipe: '', fornecedorId: '', localizacao: '', ordemValor: '' })}
                          className="px-4 h-8 text-[9px] font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all uppercase tracking-widest border border-transparent hover:border-red-100"
                        >
                          Limpar
                        </button>
                        <button 
                          onClick={() => setIsFiltersOpen(false)}
                          className="px-6 h-8 bg-slate-800 text-white rounded-lg text-[9px] font-black hover:bg-slate-700 transition-all uppercase tracking-widest"
                        >
                          Fechar Filtros
                        </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex-1 overflow-auto bg-white min-h-0">
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
              
              <div className="w-full mt-6 text-left">
                <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Sua Senha de Acesso</label>
                <input 
                  type="password" 
                  className="input-field-compact" 
                  placeholder="Digite sua senha para autorizar"
                  value={deletionPasswordInput}
                  onChange={(e) => setDeletionPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
                  setDeletionPasswordInput('');
                }}
                className="flex-1 btn-secondary !h-8 text-[11px]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmBulkDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-[11px] h-8 hover:bg-red-700 transition-all shadow-sm"
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
              
              <div className="w-full mt-6 text-left">
                <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Sua Senha de Acesso</label>
                <input 
                  type="password" 
                  className="input-field-compact" 
                  placeholder="Digite sua senha para autorizar"
                  value={deletionPasswordInput}
                  onChange={(e) => setDeletionPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 btn-secondary !h-8 text-[11px]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-[11px] h-8 hover:bg-red-700 transition-all shadow-sm"
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
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <div className="p-4 border-b border-brand-dark/10 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Editar {type === 'materiais' ? 'Material' : type === 'empresas' ? 'Empresa' : type === 'fornecedores' ? 'Fornecedor' : type === 'colaboradores' ? 'Colaborador' : 'Equipe'}</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white rounded-full transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {type === 'materiais' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">COD SAP</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.sap || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, sap: val.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">FORNECEDOR</label>
                    <select 
                      className="input-field-compact pr-8"
                      value={editFormData.fornecedorId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const f = sortedFornecedoresList.find(x => x.id === val);
                        setEditFormData({ 
                          ...editFormData, 
                          fornecedorId: val,
                          codigoFornecedor: f && f.codigoFornecedor ? f.codigoFornecedor : (val ? editFormData.codigoFornecedor : '')
                        });
                      }}
                    >
                      <option value="">Selecione o Fornecedor...</option>
                      {sortedFornecedoresList.map((f, idx) => (
                        <option key={`${f.id}_${idx}`} value={f.id}>{f.nomeFantasia}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">CÓD. FORNECEDOR</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.codigoFornecedor || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, codigoFornecedor: val.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">UNIDADE</label>
                    <select 
                      className="input-field-compact pr-8"
                      value={editFormData.unidade || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, unidade: e.target.value })}
                    >
                      <option value="GL">GL</option>
                      <option value="GR">GR</option>
                      <option value="KG">KG</option>
                      <option value="MT">MT</option>
                      <option value="SC">SC</option>
                      <option value="PC">PC</option>
                      <option value="LT">LT</option>
                      <option value="UNI">UNI</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">EQUIPE</label>
                    <select 
                      className="input-field-compact pr-8"
                      value={editFormData.equipe || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, equipe: e.target.value })}
                    >
                      {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">NCM</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.ncm || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, ncm: val.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">ESTOQUE ATUAL</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.estoqueAtual === undefined ? '' : String(editFormData.estoqueAtual).replace('.', ',')}
                      onChange={(e) => setEditFormData({ ...editFormData, estoqueAtual: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">DESCRIÇÃO</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.descricao || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, descricao: val.toUpperCase() })}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">DESCRIÇÃO SIMPLES SAP</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.descricaoSimplesSap || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, descricaoSimplesSap: val.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">DESCRIÇÃO COMPLETA SAP</label>
                    <CopyableInput 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.descricaoCompletaSap || ''}
                      onChange={(val) => setEditFormData({ ...editFormData, descricaoCompletaSap: val.toUpperCase() })}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">ESTOQUE MIN.</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.estoqueMinimo === undefined ? '' : String(editFormData.estoqueMinimo).replace('.', ',')}
                      onChange={(e) => setEditFormData({ ...editFormData, estoqueMinimo: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">ESTOQUE IDEAL</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.estoqueIdeal === undefined ? '' : String(editFormData.estoqueIdeal).replace('.', ',')}
                      onChange={(e) => setEditFormData({ ...editFormData, estoqueIdeal: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block text-left">PREÇO UNITÁRIO (R$)</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.precoUnitario === undefined ? '' : String(editFormData.precoUnitario).replace('.', ',')}
                      onChange={(e) => setEditFormData({ ...editFormData, precoUnitario: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Localização</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.localizacao || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, localizacao: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Detalhes / Observação</label>
                    <textarea 
                      className="input-field-compact min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value.toUpperCase() })}
                    ></textarea>
                  </div>
                </div>
              )}

              {type === 'colaboradores' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Matrícula / ID</label>
                    <input 
                      type="text" 
                      className={`input-field-compact font-mono ${selectedItem?.syncStatus === 'pending' ? 'bg-white' : 'bg-slate-50 opacity-70'}`} 
                      value={editFormData.matricula || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, matricula: e.target.value })}
                      readOnly={selectedItem?.syncStatus !== 'pending'}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Equipe Vinculada</label>
                    <select 
                      className="input-field-compact pr-8"
                      value={editFormData.equipe || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, equipe: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {store.equipes.map((e, idx) => <option key={`${e.id}_${idx}`} value={e.nome}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Nome Completo</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.nome || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Empresa</label>
                    <select 
                      className="input-field-compact pr-10" 
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
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Contato (Telefone)</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.contato || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, contato: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cargo / Função</label>
                    <select 
                      className="input-field-compact pr-8"
                      value={editFormData.cargo || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cargo: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {["ADM", "AJUDANTE", "ELETRICISTA", "ENCARREGADO", "GESSEIRO", "GESTOR", "MECÂNICO", "OUTROS", "PEDREIRO", "PINTOR", "SUPERVISOR", "TST"].map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Status</label>
                    <select 
                      className="input-field-compact pr-8"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Fornecedor</label>
                    <input 
                      type="text" 
                      className="input-field-compact bg-slate-50 font-mono" 
                      value={editFormData.codigoFornecedor || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">CNPJ / CPF</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      placeholder="00.000.000/0000-00"
                      value={editFormData.cnpj || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cnpj: maskCNPJ(e.target.value) })}
                      maxLength={18}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Nome Fantasia</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.nomeFantasia || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nomeFantasia: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Telefone</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.telefone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">ÁREA COMERCIAL</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.categoria || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">E-mail Comercial</label>
                    <input 
                      type="email" 
                      className="input-field-compact" 
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Detalhes Adicionais</label>
                    <textarea 
                      className="input-field-compact min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}

              {type === 'equipes' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Equipe</label>
                    <input 
                      type="text" 
                      className="input-field-compact bg-slate-50 font-mono" 
                      value={editFormData.codigoEquipe || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Centro de Custo</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.centroCusto || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, centroCusto: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Nome da Equipe</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.nome || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Gestor Líder</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.gestor || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, gestor: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Verba Inicial (R$)</label>
                    <input 
                      type="number" 
                      className="input-field-compact" 
                      value={editFormData.verbaDestinada || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, verbaDestinada: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Saldo Atual (R$)</label>
                    <input 
                      type="number" 
                      className="input-field-compact" 
                      value={editFormData.saldoAtualizado || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, saldoAtualizado: Number(e.target.value) })}
                    />
                  </div>
                  {type === 'equipes' && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-brand-dark/10">
                      <p className="text-[9px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Alteração de Verba requer senha de autorização
                      </p>
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Sua Senha de Acesso</label>
                      <input 
                        type="password" 
                        className="input-field-compact h-8" 
                        placeholder="Senha necessária para salvar alterações de orçamento"
                        value={deletionPasswordInput}
                        onChange={(e) => setDeletionPasswordInput(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cor de Identificação</label>
                    <input 
                      type="color" 
                      className="input-field-compact p-1 h-8" 
                      value={editFormData.cor || '#000000'}
                      onChange={(e) => setEditFormData({ ...editFormData, cor: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {type === 'empresas' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Cód. Empresa</label>
                    <input 
                      type="text" 
                      className="input-field-compact bg-slate-50 font-mono" 
                      value={editFormData.codigoEmpresa || ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Razão Social</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.razaoSocial || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, razaoSocial: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">CNPJ</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      placeholder="00.000.000/0000-00"
                      value={editFormData.cnpj || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, cnpj: maskCNPJ(e.target.value) })}
                      maxLength={18}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Nº Contrato</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.numContrato || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, numContrato: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Área de Atuação</label>
                    <input 
                      type="text" 
                      className="input-field-compact" 
                      value={editFormData.areaAtuacao || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, areaAtuacao: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Email Comercial</label>
                    <input 
                      type="email" 
                      className="input-field-compact" 
                      value={editFormData.emailComercial || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emailComercial: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block">Detalhes</label>
                    <textarea 
                      className="input-field-compact min-h-[60px] py-2" 
                      value={editFormData.detalhes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, detalhes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-brand-dark/10 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn-secondary !h-8 text-[11px]"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="btn-primary !h-8 text-[11px] flex items-center gap-2"
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
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-brand-dark/10">
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
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-brand-dark/10 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                  >
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">WhatsApp</span>
                  </button>

                  <button 
                    onClick={handleGlobalShare}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-brand-dark/10 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-700">Compartilhar</span>
                  </button>



                  <button 
                    onClick={downloadStockSpreadsheet}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-brand-dark/10 hover:bg-slate-50 hover:border-slate-250 transition-all group"
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
                className="w-full py-4 bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100 transition-colors border-t border-brand-dark/10"
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
            <div className="grid grid-cols-2 gap-2">
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
