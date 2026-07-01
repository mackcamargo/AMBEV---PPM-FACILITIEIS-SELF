import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { 
  Material, Colaborador, Empresa, Equipe, Fornecedor, Movimentacao, 
  ViewState, EquipeTecnica, ItemLote, AtaReuniao
} from '../types';
import { generateId } from './idUtils';
import { syncToSupabase } from './supabaseSync';


interface AppContextType {
  user: User | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
  view: ViewState;
  setView: (v: ViewState) => void;
  
  hasEntered: boolean;
  setHasEntered: (entered: boolean) => void;
  
  materiais: Material[];
  setMateriais: React.Dispatch<React.SetStateAction<Material[]>>;
  
  colaboradores: Colaborador[];
  setColaboradores: React.Dispatch<React.SetStateAction<Colaborador[]>>;
  
  empresas: Empresa[];
  setEmpresas: React.Dispatch<React.SetStateAction<Empresa[]>>;
  
  equipes: Equipe[];
  setEquipes: React.Dispatch<React.SetStateAction<Equipe[]>>;
  
  fornecedores: Fornecedor[];
  setFornecedores: React.Dispatch<React.SetStateAction<Fornecedor[]>>;
  
  movimentacoes: Movimentacao[];
  setMovimentacoes: React.Dispatch<React.SetStateAction<Movimentacao[]>>;
  
  batchState: ItemLote[];
  setBatchState: React.Dispatch<React.SetStateAction<ItemLote[]>>;
  
  atas: AtaReuniao[];
  setAtas: React.Dispatch<React.SetStateAction<AtaReuniao[]>>;
  
  deletionPassword: string;
  setDeletionPassword: (p: string) => void;
  isDeletionPasswordEnabled: boolean;
  setIsDeletionPasswordEnabled: (b: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (b: boolean) => void;
  syncError: string | null;
  setSyncError: (s: string | null) => void;
  
  addMovimentacao: (m: Movimentacao) => Promise<{ success: boolean; error?: string }>;
  deleteMovimentacao: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateMovimentacao: (id: string, m: Partial<Movimentacao>) => Promise<{ success: boolean; error?: string }>;
  addMaterial: (m: Omit<Material, 'id'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  addColaborador: (c: Omit<Colaborador, 'id'>) => Promise<{ success: boolean; error?: string }>;
  addEquipe: (e: Omit<Equipe, 'id'>) => Promise<{ success: boolean; error?: string }>;
  addAta: (a: AtaReuniao) => Promise<{ success: boolean; error?: string }>;
  updateAta: (id: string, a: Partial<AtaReuniao>) => Promise<{ success: boolean; error?: string }>;
  deleteAta: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateMaterial: (id: string, m: Partial<Material>) => Promise<{ success: boolean; error?: string }>;
  deleteMaterial: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateColaborador: (id: string, c: Partial<Colaborador>) => Promise<{ success: boolean; error?: string }>;
  deleteColaborador: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateEquipe: (id: string, e: Partial<Equipe>) => Promise<{ success: boolean; error?: string }>;
  deleteEquipe: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateFornecedor: (id: string, f: Partial<Fornecedor>) => Promise<{ success: boolean; error?: string }>;
  deleteFornecedor: (id: string) => Promise<{ success: boolean; error?: string }>;
  addFornecedor: (f: Omit<Fornecedor, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateEmpresa: (id: string, e: Partial<Empresa>) => Promise<{ success: boolean; error?: string }>;
  addEmpresa: (e: Omit<Empresa, 'id'>) => Promise<{ success: boolean; error?: string }>;
  deleteEmpresa: (id: string) => Promise<{ success: boolean; error?: string }>;
  seedTestData: () => void;
  refreshData: () => Promise<void>;
  retrySync: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const INITIAL_MATERIALS: Material[] = [];

const INITIAL_COLABORADORES: Colaborador[] = [
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d471', matricula: 'V-0001', nome: 'Arthur Almeida', empresa: 'Vision', equipe: 'Refrigeração', cargo: 'Encarregado', contato: '(11) 99122-0001', status: 'Ativo' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d472', matricula: 'V-0002', nome: 'Gislaine', empresa: 'Vision', equipe: 'Refrigeração', cargo: 'Técnico de Segurança', contato: '(11) 99122-0002', status: 'Ativo' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d473', matricula: 'V-0003', nome: 'Wilson', empresa: 'Vision', equipe: 'Refrigeração', cargo: 'Mecânico', contato: '(11) 99122-0003', status: 'Ativo' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d474', matricula: 'B-0001', nome: 'Arthur dos Reis Rocha', empresa: 'BCM', equipe: 'Civil', cargo: 'Técnico Especialista', status: 'Ativo' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d475', matricula: 'COL-1780419000921', nome: 'Marco Antônio', empresa: 'BCM', equipe: 'Civil', cargo: 'ADM', status: 'Ativo' },
];

const INITIAL_EQUIPES: Equipe[] = [
  { id: '85776077-d588-466d-a99f-3d02b2c3d401', nome: 'Elétrica', centroCusto: 'CC-001', gestor: 'João Silva', cor: '#3B82F6', verbaDestinada: 15000, saldoAtualizado: 12450.50 },
  { id: '85776077-d588-466d-a99f-3d02b2c3d402', nome: 'Refrigeração', centroCusto: 'CC-002', gestor: 'Arthur Almeida', cor: '#06B6D4', verbaDestinada: 12000, saldoAtualizado: 8700.00 },
  { id: '85776077-d588-466d-a99f-3d02b2c3d403', nome: 'Civil', centroCusto: 'CC-003', gestor: 'Marco Antônio', cor: '#F59E0B', verbaDestinada: 20000, saldoAtualizado: 18200.00 },
  { id: '85776077-d588-466d-a99f-3d02b2c3d404', nome: 'Hidráulica', centroCusto: 'CC-004', gestor: 'Ana Paula', cor: '#10B981', verbaDestinada: 10000, saldoAtualizado: 7500.25 },
  { id: '85776077-d588-466d-a99f-3d02b2c3d405', nome: 'Pintura', centroCusto: 'CC-005', gestor: 'Carlos Souza', cor: '#EC4899', verbaDestinada: 8000, saldoAtualizado: 8000.00 },
];

const INITIAL_ATAS: AtaReuniao[] = [
  {
    id: 'f721d01a-6379-42c2-841f-0a02b2c3d901',
    data: '2026-06-03T10:00:00Z',
    descricao: 'Reunião de Alinhamento Semanal - Junho W1',
    orcamentosSnapshot: [
      { equipe: 'Refrigeração', saldoAnterior: 10000, saldoNovo: 8700 },
      { equipe: 'Hidráulica', saldoAnterior: 9000, saldoNovo: 7500 },
      { equipe: 'Elétrica', saldoAnterior: 15000, saldoNovo: 12450 },
    ],
    itensComprados: [
      { materialId: '85776077-d588-466d-a99f-3d02b2c3d401', quantidade: 5, custoTotal: 50 },
      { materialId: '85776077-d588-466d-a99f-3d02b2c3d402', quantidade: 10, custoTotal: 150 },
    ],
  }
];

const INITIAL_MOVIMENTACOES: Movimentacao[] = [];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (event === 'SIGNED_IN') {
        // Do not reset hasEntered here, allow the app to keep its state if the user was already signed in or just recovered session
      }
      if (event === 'SIGNED_OUT') {
        setHasEntered(false);
        localStorage.setItem('ppm_has_entered', 'false');
        localStorage.removeItem('ppm_current_view');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setHasEntered(false);
    localStorage.setItem('ppm_has_entered', 'false');
  };

  const [view, setView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ppm_current_view') as ViewState) || 'dashboard';
    }
    return 'dashboard';
  });

  const [hasEntered, setHasEntered] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ppm_has_entered') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('ppm_has_entered', hasEntered.toString());
  }, [hasEntered]);

  useEffect(() => {
    localStorage.setItem('ppm_current_view', view);
  }, [view]);

  // Synchronous State Initializers with LocalStorage Support
  const [materiais, setMateriais] = useState<Material[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_materiais');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_MATERIALS;
    } catch { return INITIAL_MATERIALS; }
  });
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_colaboradores');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_COLABORADORES;
    } catch { return INITIAL_COLABORADORES; }
  });
  const [empresas, setEmpresas] = useState<Empresa[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_empresas');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [equipes, setEquipes] = useState<Equipe[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_equipes');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_EQUIPES;
    } catch { return INITIAL_EQUIPES; }
  });
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_fornecedores');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_movimentacoes');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_MOVIMENTACOES;
    } catch { return INITIAL_MOVIMENTACOES; }
  });
  const [batchState, setBatchState] = useState<ItemLote[]>([]);
  const [atas, setAtas] = useState<AtaReuniao[]>(() => {
    try {
      const saved = localStorage.getItem('ppm_atas');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_ATAS;
    } catch { return INITIAL_ATAS; }
  });
  const [deletionPassword, setDeletionPassword] = useState<string>(() => {
    return localStorage.getItem('ppm_deletion_password') || '';
  });
  
  const [isDeletionPasswordEnabled, setIsDeletionPasswordEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ppm_deletion_password_enabled') !== 'false'; // Defaults to true
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retrySync = () => setRetryCount(prev => prev + 1);

  // Background sync for pending items
  useEffect(() => {
    const syncPending = async () => {
      if (!navigator.onLine) return;
      // 1. Colaboradores
      const pendingColabs = colaboradores.filter(c => c.syncStatus === 'pending');
      for (const c of pendingColabs) {
        try {
          const res = await syncToSupabase.insertColaborador(c);
          if (res.success) {
            setColaboradores(prev => prev.map(item => item.id === c.id ? { ...item, syncStatus: 'synced' } : item));
          }
        } catch (e) {
          console.error("Auto-sync error (colaborador):", e);
        }
      }

      // 2. Materiais
      const pendingMateriais = materiais.filter(m => m.syncStatus === 'pending');
      for (const m of pendingMateriais) {
        try {
          const res = await syncToSupabase.insertMaterial(m);
          if (res.success) {
            setMateriais(prev => prev.map(item => item.id === m.id ? { ...item, syncStatus: 'synced' } : item));
          }
        } catch (e) {
          console.error("Auto-sync error (material):", e);
        }
      }
    };

    // Try sync every 60 seconds
    const interval = setInterval(syncPending, 60000);
    
    // Also sync when coming back online
    window.addEventListener('online', syncPending);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', syncPending);
    };
  }, [colaboradores, materiais]);

  // LocalStorage Synchronization Effects
  useEffect(() => {
    try {
      localStorage.setItem('ppm_materiais', JSON.stringify(materiais));
    } catch (e) {
      console.error("LocalStorage error (materiais):", e);
    }
  }, [materiais]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_colaboradores', JSON.stringify(colaboradores));
    } catch (e) {
      console.error("LocalStorage error (colaboradores):", e);
    }
  }, [colaboradores]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_empresas', JSON.stringify(empresas));
    } catch (e) {
      console.error("LocalStorage error (empresas):", e);
    }
  }, [empresas]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_equipes', JSON.stringify(equipes));
    } catch (e) {
      console.error("LocalStorage error (equipes):", e);
    }
  }, [equipes]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_fornecedores', JSON.stringify(fornecedores));
    } catch (e) {
      console.error("LocalStorage error (fornecedores):", e);
    }
  }, [fornecedores]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_movimentacoes', JSON.stringify(movimentacoes));
    } catch (e) {
      console.error("LocalStorage error (movimentacoes):", e);
    }
  }, [movimentacoes]);

  useEffect(() => {
    try {
      localStorage.setItem('ppm_atas', JSON.stringify(atas));
    } catch (e) {
      console.error("LocalStorage error (atas):", e);
    }
  }, [atas]);

  useEffect(() => {
    localStorage.setItem('ppm_deletion_password', deletionPassword);
  }, [deletionPassword]);

  useEffect(() => {
    localStorage.setItem('ppm_deletion_password_enabled', isDeletionPasswordEnabled.toString());
  }, [isDeletionPasswordEnabled]);

  // Supabase Multi-Fetch with user dependency to ensure data loads after login
  useEffect(() => {
    const loadFromSupabase = async () => {
      // Don't fetch if still checking auth or if already syncing
      if (authLoading) return;
      
      setIsSyncing(true);
      setSyncError(null);
      try {
        if (!navigator.onLine) {
          throw new Error("Sem conexão com internet");
        }
        const data = await syncToSupabase.fetchAll();
        
        // Helper to merge Supabase data with local state, preventing loss of local-only items
        // while ensuring Supabase data (source of truth) is present
        const mergeWithSupabase = <T extends { id: string; syncStatus?: 'synced' | 'pending' }>(supabaseData: T[], setFn: React.Dispatch<React.SetStateAction<T[]>>) => {
          // As per AGENTS.md: Set state DIRECTLY with supabase data to ensure source of truth
          // and avoid duplication with INITIAL_* hardcoded data.
          setFn(supabaseData);
        };

        // 1. Materiais
        const sanitizedMaterials = data.materiais.map(m => ({
          ...m,
          unidade: m.unidade === 'UM' ? 'UNI' : m.unidade,
          syncStatus: 'synced' as const
        }));
        mergeWithSupabase(sanitizedMaterials, setMateriais);

        // 2. Others
        mergeWithSupabase(data.colaboradores.map(c => ({ ...c, syncStatus: 'synced' as const })), setColaboradores);
        mergeWithSupabase(data.empresas, setEmpresas);
        mergeWithSupabase(data.equipes, setEquipes);
        mergeWithSupabase(data.fornecedores, setFornecedores);
        mergeWithSupabase(data.movimentacoes, setMovimentacoes);
        mergeWithSupabase(data.atas, setAtas);

      } catch (err: any) {
        console.error("Failed to load initial data from Supabase:", err);
        setSyncError(err.message || "Erro de conexão com o servidor");
      } finally {
        setIsSyncing(false);
      }
    };

    loadFromSupabase();
  }, [user, authLoading, retryCount]);

  // Revert any "REUNIÃO-SELF" movements and restore stocks & budgets automatically on load
  // Now depends on movimentacoes to ensure it runs even if data is fetched after mount
  const hasRevertedRef = React.useRef(false);
  useEffect(() => {
    if (movimentacoes.length === 0 || hasRevertedRef.current) return;

    const selfMovements = movimentacoes.filter(
      m => m.os === 'REUNIÃO-SELF' || 
           m.observacoes?.includes('Reunião de Self') ||
           m.colaborador?.includes('Reunião de Self') ||
           m.conferente?.includes('Reunião de Self')
    );

    if (selfMovements.length > 0) {
      hasRevertedRef.current = true;
      // 1. Revert material stocks
      setMateriais(prev => {
        const updated = [...prev];
        selfMovements.forEach(m => {
          const idx = updated.findIndex(mat => mat.id === m.materialId);
          if (idx !== -1) {
            const currentStock = Number(updated[idx].estoqueAtual) || 0;
            const qty = Number(m.quantidade) || 0;
            if (m.tipo === 'Retirada') {
              updated[idx] = {
                ...updated[idx],
                estoqueAtual: currentStock + qty
              };
            } else {
              updated[idx] = {
                ...updated[idx],
                estoqueAtual: Math.max(0, currentStock - qty)
              };
            }
          }
        });
        return updated;
      });

      // 2. Revert team budgets
      setEquipes(prev => {
        const updated = [...prev];
        selfMovements.forEach(m => {
          const teamName = m.equipe;
          if (teamName) {
            const idx = updated.findIndex(e => e.nome === teamName);
            if (idx !== -1) {
              const qty = Number(m.quantidade) || 0;
              const price = Number(m.precoUnitario) || 0;
              const subtotal = qty * price;
              updated[idx] = {
                ...updated[idx],
                saldoAtualizado: updated[idx].saldoAtualizado + subtotal
              };
            }
          }
        });
        return updated;
      });

      // 3. Filter them out of the live list of movements
      setMovimentacoes(prev => prev.filter(
        m => !(m.os === 'REUNIÃO-SELF' || 
               m.observacoes?.includes('Reunião de Self') ||
               m.colaborador?.includes('Reunião de Self') ||
               m.conferente?.includes('Reunião de Self'))
      ));
    }
  }, [movimentacoes.length]);

  const addMovimentacao = async (m: Movimentacao): Promise<{ success: boolean; error?: string }> => {
    setMovimentacoes(prev => [m, ...prev]);
    const result = await syncToSupabase.insertMovimentacao(m);
    
    // Update material stock in DB FIRST
    const mat = materiais.find(mat => mat.id === m.materialId);
    if (mat) {
      const currentQty = Number(mat.estoqueAtual) || 0;
      const deltaQty = Number(m.quantidade) || 0;
      const newQty = m.tipo === 'Entrada' ? currentQty + deltaQty : currentQty - deltaQty;
      const finalQty = Math.max(0, newQty);
      
      // Update DB
      await syncToSupabase.updateMaterial(mat.id, { estoqueAtual: finalQty });
      
      // Update State
      setMateriais(prev => prev.map(item => item.id === mat.id ? { ...item, estoqueAtual: finalQty } : item));
    }

    return result;
  };

  const deleteMovimentacao = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const movToDelete = movimentacoes.find(m => m.id === id);
    if (!movToDelete) return { success: false, error: 'Movimentação não encontrada' };

    // Optimistic Update
    setMovimentacoes(prev => prev.filter(m => m.id !== id));
    
    const result = await syncToSupabase.deleteMovimentacao(id);
    
    if (!result.success) {
      // Revert if failed
      setMovimentacoes(prev => [movToDelete, ...prev].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      return result;
    }

    // Update material stock in DB FIRST
    const mat = materiais.find(m => m.id === movToDelete.materialId);
    if (mat) {
      const currentQty = Number(mat.estoqueAtual) || 0;
      const deltaQty = Number(movToDelete.quantidade) || 0;
      const newQty = movToDelete.tipo === 'Entrada' ? currentQty - deltaQty : currentQty + deltaQty;
      const finalQty = Math.max(0, newQty);
      
      // Update DB
      await syncToSupabase.updateMaterial(mat.id, { estoqueAtual: finalQty });
      
      // Update State
      setMateriais(prev => prev.map(m => m.id === mat.id ? { ...m, estoqueAtual: finalQty } : m));
    }

    // Reverse budget adjustment if it was a withdrawal
    if (movToDelete.tipo === 'Retirada' && movToDelete.equipe) {
      const eq = equipes.find(ex => ex.nome === movToDelete.equipe);
      if (eq) {
        const totalToRevert = Number(movToDelete.quantidade) * (Number(movToDelete.precoUnitario) || 0);
        const newSaldo = eq.saldoAtualizado + totalToRevert;
        
        // Update DB
        await syncToSupabase.updateEquipe(eq.id, { saldoAtualizado: newSaldo });
        
        // Update State
        setEquipes(prev => prev.map(e => e.id === eq.id ? { ...e, saldoAtualizado: newSaldo } : e));
      }
    }
    return result;
  };

  const updateMovimentacao = async (id: string, updatedFields: Partial<Movimentacao>): Promise<{ success: boolean; error?: string }> => {
    const original = movimentacoes.find(m => m.id === id);
    if (!original) return { success: false, error: 'Movimentação não encontrada' };

    const oldQty = Number(original.quantidade) || 0;
    const newQty = updatedFields.quantidade !== undefined ? (Number(updatedFields.quantidade) || 0) : oldQty;
    const qtyDelta = newQty - oldQty;

    const oldPrice = Number(original.precoUnitario) || 0;
    const newPrice = updatedFields.precoUnitario !== undefined ? (Number(updatedFields.precoUnitario) || 0) : oldPrice;

    if (qtyDelta !== 0) {
      const mat = materiais.find(m => m.id === original.materialId);
      if (mat) {
        const currentQty = Number(mat.estoqueAtual) || 0;
        const stockAdjustment = original.tipo === 'Entrada' ? qtyDelta : -qtyDelta;
        const finalQty = Math.max(0, currentQty + stockAdjustment);
        
        // Update DB
        await syncToSupabase.updateMaterial(mat.id, { estoqueAtual: finalQty });
        
        // Update State
        setMateriais(prev => prev.map(m => m.id === mat.id ? { ...m, estoqueAtual: finalQty } : m));
      }
    }

    // Update budget if it was a withdrawal and values changed
    if (original.tipo === 'Retirada' && original.equipe) {
      const oldTotal = oldQty * oldPrice;
      const newTotal = newQty * newPrice;
      const budgetDelta = newTotal - oldTotal;

      if (budgetDelta !== 0) {
        const eq = equipes.find(ex => ex.nome === original.equipe);
        if (eq) {
          const newSaldo = eq.saldoAtualizado - budgetDelta;
          
          // Update DB
          await syncToSupabase.updateEquipe(eq.id, { saldoAtualizado: newSaldo });
          
          // Update State
          setEquipes(prev => prev.map(e => e.id === eq.id ? { ...e, saldoAtualizado: newSaldo } : e));
        }
      }
    }

    if (newPrice !== oldPrice && updatedFields.precoUnitario !== undefined) {
      const mat = materiais.find(m => m.id === original.materialId);
      if (mat) {
        // Automatically sync this new price back to the Material definition
        syncToSupabase.updateMaterial(mat.id, { precoUnitario: newPrice }).catch(console.error);
        setMateriais(prev => prev.map(m => m.id === mat.id ? { ...m, precoUnitario: newPrice } : m));

        // And automatically sync this new price backwards to all OTHER movements of this same material!
        const movsToUpdate = movimentacoes.filter(mov => mov.materialId === mat.id && mov.id !== id);
        if (movsToUpdate.length > 0) {
          setMovimentacoes(prev => prev.map(mov => 
            mov.materialId === mat.id && mov.id !== id ? { ...mov, precoUnitario: newPrice } : mov
          ));
          Promise.all(movsToUpdate.map(mov => 
            syncToSupabase.updateMovimentacao(mov.id, { precoUnitario: newPrice })
          )).catch(console.error);
        }
      }
    }

    setMovimentacoes(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
    return await syncToSupabase.updateMovimentacao(id, updatedFields);
  };

  const addMaterial = async (m: Omit<Material, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> => {
    const newItem: Material = { 
      ...m, 
      id: generateId(),
      estoqueMinimo: Number(m.estoqueMinimo) || 0,
      estoqueIdeal: Number(m.estoqueIdeal) || 0,
      estoqueAtual: Number(m.estoqueAtual) || 0,
      precoUnitario: Number(m.precoUnitario) || 0,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    setMateriais(prev => [...prev, newItem]);
    
    try {
      const result = await syncToSupabase.insertMaterial(newItem);
      if (result.success) {
        setMateriais(prev => prev.map(item => item.id === newItem.id ? { ...item, syncStatus: 'synced' } : item));
        return { ...result, id: newItem.id };
      }
      return result;
    } catch (err) {
      return { success: false, error: 'Erro de conexão. O material foi salvo localmente.', id: newItem.id };
    }
  };

  const addColaborador = async (c: Omit<Colaborador, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const newItem: Colaborador = { ...c, id: generateId(), syncStatus: 'pending' };
    setColaboradores(prev => [...prev, newItem]);
    
    try {
      const result = await syncToSupabase.insertColaborador(newItem);
      if (result.success) {
        setColaboradores(prev => prev.map(item => item.id === newItem.id ? { ...item, syncStatus: 'synced' } : item));
      }
      return result;
    } catch (err) {
      return { success: false, error: 'Erro de conexão. O registro foi salvo localmente.' };
    }
  };

  const addEquipe = async (e: Omit<Equipe, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const newItem: Equipe = { 
      ...e, 
      id: generateId(),
      verbaDestinada: Number(e.verbaDestinada) || 0,
      saldoAtualizado: Number(e.saldoAtualizado) || 0
    };
    setEquipes(prev => [...prev, newItem]);
    return await syncToSupabase.insertEquipe(newItem);
  };

  const addAta = async (a: AtaReuniao): Promise<{ success: boolean; error?: string }> => {
    setAtas(prev => [a, ...prev]);
    return await syncToSupabase.insertAta(a);
  };

  const updateAta = async (id: string, a: Partial<AtaReuniao>): Promise<{ success: boolean; error?: string }> => {
    setAtas(prev => prev.map(item => item.id === id ? { ...item, ...a } : item));
    return await syncToSupabase.updateAta(id, a);
  };

  const deleteAta = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setAtas(prev => prev.filter(item => item.id !== id));
    return await syncToSupabase.deleteAta(id);
  };

  const updateMaterial = async (id: string, m: Partial<Material>): Promise<{ success: boolean; error?: string }> => {
    const originalMaterial = materiais.find(item => item.id === id);
    const hasPriceChange = m.precoUnitario !== undefined && Number(m.precoUnitario) !== originalMaterial?.precoUnitario;

    setMateriais(prev => prev.map(item => item.id === id ? { 
      ...item, 
      ...m,
      estoqueMinimo: m.estoqueMinimo !== undefined ? Number(m.estoqueMinimo) || 0 : item.estoqueMinimo,
      estoqueIdeal: m.estoqueIdeal !== undefined ? Number(m.estoqueIdeal) || 0 : item.estoqueIdeal,
      estoqueAtual: m.estoqueAtual !== undefined ? Number(m.estoqueAtual) || 0 : item.estoqueAtual,
      precoUnitario: m.precoUnitario !== undefined ? Number(m.precoUnitario) || 0 : item.precoUnitario
    } : item));
    const result = await syncToSupabase.updateMaterial(id, m);

    if (result.success && hasPriceChange) {
      const newPrice = Number(m.precoUnitario);
      const movsToUpdate = movimentacoes.filter(mov => mov.materialId === id);
      
      if (movsToUpdate.length > 0) {
        setMovimentacoes(prev => prev.map(mov => 
          mov.materialId === id ? { ...mov, precoUnitario: newPrice } : mov
        ));
        
        Promise.all(movsToUpdate.map(mov => 
          syncToSupabase.updateMovimentacao(mov.id, { precoUnitario: newPrice })
        )).catch(console.error);
      }
    }

    return result;
  };

  const deleteMaterial = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const original = materiais.find(m => m.id === id);
    if (!original) return { success: false, error: 'Material não encontrado' };
    
    setMateriais(prev => prev.filter(item => item.id !== id));
    const result = await syncToSupabase.deleteMaterial(id);
    if (!result.success) {
      setMateriais(prev => [...prev, original]);
    }
    return result;
  };

  const updateColaborador = async (id: string, c: Partial<Colaborador>): Promise<{ success: boolean; error?: string }> => {
    setColaboradores(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    return await syncToSupabase.updateColaborador(id, c);
  };

  const deleteColaborador = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const original = colaboradores.find(c => c.id === id);
    if (!original) return { success: false, error: 'Colaborador não encontrado' };
    
    setColaboradores(prev => prev.filter(item => item.id !== id));
    const result = await syncToSupabase.deleteColaborador(id);
    if (!result.success) {
      setColaboradores(prev => [...prev, original]);
    }
    return result;
  };

  const updateEquipe = async (id: string, e: Partial<Equipe>): Promise<{ success: boolean; error?: string }> => {
    setEquipes(prev => prev.map(item => item.id === id ? { 
      ...item, 
      ...e,
      verbaDestinada: e.verbaDestinada !== undefined ? Number(e.verbaDestinada) || 0 : item.verbaDestinada,
      saldoAtualizado: e.saldoAtualizado !== undefined ? Number(e.saldoAtualizado) || 0 : item.saldoAtualizado
    } : item));
    return await syncToSupabase.updateEquipe(id, e);
  };

  const deleteEquipe = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const original = equipes.find(e => e.id === id);
    if (!original) return { success: false, error: 'Equipe não encontrada' };
    
    setEquipes(prev => prev.filter(item => item.id !== id));
    const result = await syncToSupabase.deleteEquipe(id);
    if (!result.success) {
      setEquipes(prev => [...prev, original]);
    }
    return result;
  };

  const updateFornecedor = async (id: string, f: Partial<Fornecedor>): Promise<{ success: boolean; error?: string }> => {
    setFornecedores(prev => prev.map(item => item.id === id ? { ...item, ...f } : item));
    return await syncToSupabase.updateFornecedor(id, f);
  };

  const deleteFornecedor = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const original = fornecedores.find(f => f.id === id);
    if (!original) return { success: false, error: 'Fornecedor não encontrado' };
    
    setFornecedores(prev => prev.filter(item => item.id !== id));
    const result = await syncToSupabase.deleteFornecedor(id);
    if (!result.success) {
      setFornecedores(prev => [...prev, original]);
    }
    return result;
  };

  const addFornecedor = async (f: Omit<Fornecedor, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const newItem: Fornecedor = { ...f, id: generateId() };
    setFornecedores(prev => [...prev, newItem]);
    return await syncToSupabase.insertFornecedor(newItem);
  };

  const updateEmpresa = async (id: string, e: Partial<Empresa>): Promise<{ success: boolean; error?: string }> => {
    setEmpresas(prev => prev.map(item => item.id === id ? { ...item, ...e } : item));
    return await syncToSupabase.updateEmpresa(id, e);
  };

  const addEmpresa = async (e: Omit<Empresa, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const newItem: Empresa = { ...e, id: generateId() };
    setEmpresas(prev => [...prev, newItem]);
    return await syncToSupabase.insertEmpresa(newItem);
  };

  const deleteEmpresa = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const original = empresas.find(e => e.id === id);
    if (!original) return { success: false, error: 'Empresa não encontrada' };
    
    setEmpresas(prev => prev.filter(item => item.id !== id));
    const result = await syncToSupabase.deleteEmpresa(id);
    if (!result.success) {
      setEmpresas(prev => [...prev, original]);
    }
    return result;
  };

  const seedTestData = () => {
    // 1. Generate 15 distinct, high-quality collaborators:
    const newColaboradores: Colaborador[] = [
      { id: 'CUST-101', matricula: 'COL-1101', nome: 'Alessandro Muniz', empresa: 'Vision', equipe: 'Elétrica', cargo: 'Eletricista Conector', status: 'Ativo' },
      { id: 'CUST-102', matricula: 'COL-1102', nome: 'Bianca de Souza Castro', empresa: 'BCM', equipe: 'Pintura', cargo: 'Pintora Industrial', status: 'Ativo' },
      { id: 'CUST-103', matricula: 'COL-1103', nome: 'Carlos Eduardo Mendes', empresa: 'Vision', equipe: 'Refrigeração', cargo: 'Técnico Ar-Condicionado', status: 'Ativo' },
      { id: 'CUST-104', matricula: 'COL-1104', nome: 'Danilo Albuquerque Santos', empresa: 'BCM', equipe: 'Civil', cargo: 'Pedreiro de Acabamento', status: 'Ativo' },
      { id: 'CUST-105', matricula: 'COL-1105', nome: 'Eduardo de Gois Lima', empresa: 'Vision', equipe: 'Hidráulica', cargo: 'Encanador Especialista', status: 'Ativo' },
      { id: 'CUST-106', matricula: 'COL-1106', nome: 'Fernando Henrique Vieira', empresa: 'BCM', equipe: 'Elétrica', cargo: 'Eletricista de Redes', status: 'Ativo' },
      { id: 'CUST-107', matricula: 'COL-1107', nome: 'Gustavo Rosa Nogueira', empresa: 'Vision', equipe: 'Civil', cargo: 'Mestre de Obras', status: 'Ativo' },
      { id: 'CUST-108', matricula: 'COL-1108', nome: 'Heitor Carvalho Silva', empresa: 'BCM', equipe: 'Hidráulica', cargo: 'Auxiliar de Hidráulica', status: 'Ativo' },
      { id: 'CUST-109', matricula: 'COL-1109', nome: 'Isabela de Oliveira Ramos', empresa: 'Vision', equipe: 'Pintura', cargo: 'Pintora Acabador', status: 'Ativo' },
      { id: 'CUST-110', matricula: 'COL-1110', nome: 'Jefferson de Paula Neves', empresa: 'BCM', equipe: 'Refrigeração', cargo: 'Meio Oficial Refrigeração', status: 'Ativo' },
      { id: 'CUST-111', matricula: 'COL-1111', nome: 'Leonardo Albuquerque Lima', empresa: 'Vision', equipe: 'Elétrica', cargo: 'Técnico Eletroeletrônica', status: 'Ativo' },
      { id: 'CUST-112', matricula: 'COL-1112', nome: 'Mariana Vasconcelos Costa', empresa: 'BCM', equipe: 'Civil', cargo: 'Encarregada de Obra', status: 'Ativo' },
      { id: 'CUST-113', matricula: 'COL-1113', nome: 'Natália Rodrigues Ferreira', empresa: 'Vision', equipe: 'Hidráulica', cargo: 'Encanadora Predial', status: 'Ativo' },
      { id: 'CUST-114', matricula: 'COL-1114', nome: 'Otávio Augusto Pinheiro', empresa: 'BCM', equipe: 'Refrigeração', cargo: 'Técnico Climatização VRF', status: 'Ativo' },
      { id: 'CUST-115', matricula: 'COL-1115', nome: 'Priscila Mendes Azevedo', empresa: 'Vision', equipe: 'Pintura', cargo: 'Ajudante de Pintura', status: 'Ativo' }
    ];

    // 2. Generate 10 high-quality materials for each of the 5 teams (50 total):
    const newMateriais: Material[] = [
      // Elétrica
      { id: 'M-EL-1', sap: '51092001', codigoFornecedor: 'F-EL-01', descricao: 'Cabo Flexível Antichama 2,5mm Vermelho', unidade: 'm', estoqueMinimo: 50, estoqueIdeal: 200, estoqueAtual: 140, precoUnitario: 4.5, equipe: 'Elétrica', localizacao: 'Prateleira A1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-2', sap: '51092002', codigoFornecedor: 'F-EL-02', descricao: 'Disjuntor Termomagnético Monopolar 10A Curva B', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 25, precoUnitario: 14.9, equipe: 'Elétrica', localizacao: 'Prateleira A2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-3', sap: '51092003', codigoFornecedor: 'F-EL-03', descricao: 'Disjuntor Termomagnético Tripolar 32A Curva C', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 15, estoqueAtual: 8, precoUnitario: 79.9, equipe: 'Elétrica', localizacao: 'Prateleira A3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-4', sap: '51092004', codigoFornecedor: 'F-EL-04', descricao: 'Fita Isolante Imperial Alta Fusão 19mm x 2m', unidade: 'un', estoqueMinimo: 20, estoqueIdeal: 80, estoqueAtual: 45, precoUnitario: 18.5, equipe: 'Elétrica', localizacao: 'Gaveta B1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-5', sap: '51092005', codigoFornecedor: 'F-EL-05', descricao: 'Eletroduto Flexível Corrugado PVC 3/4 Laranja', unidade: 'm', estoqueMinimo: 100, estoqueIdeal: 300, estoqueAtual: 180, precoUnitario: 3.2, equipe: 'Elétrica', localizacao: 'Cesto 3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-6', sap: '51092006', codigoFornecedor: 'F-EL-06', descricao: 'Tomada Dupla de Embutir 2P+T 10A Branca', unidade: 'un', estoqueMinimo: 15, estoqueIdeal: 50, estoqueAtual: 30, precoUnitario: 12.9, equipe: 'Elétrica', localizacao: 'Gaveta B2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-7', sap: '51092007', codigoFornecedor: 'F-EL-07', descricao: 'Interruptor Simples de Sobrepor Placa 10A', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 30, estoqueAtual: 18, precoUnitario: 8.9, equipe: 'Elétrica', localizacao: 'Gaveta B3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-8', sap: '51092008', codigoFornecedor: 'F-EL-08', descricao: 'Lâmpada LED Tubular T8 18W Bivolt Branca', unidade: 'un', estoqueMinimo: 30, estoqueIdeal: 100, estoqueAtual: 65, precoUnitario: 16.0, equipe: 'Elétrica', localizacao: 'Prateleira A4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-9', sap: '51092009', codigoFornecedor: 'F-EL-09', descricao: 'Canaleta Sistema X Com Divisória 20x10mm 2m', unidade: 'un', estoqueMinimo: 15, estoqueIdeal: 60, estoqueAtual: 28, precoUnitario: 9.8, equipe: 'Elétrica', localizacao: 'Cesto 4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-EL-10', sap: '51092010', codigoFornecedor: 'F-EL-10', descricao: 'Reator Eletrônico para Lâmpada Fluorescente', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 30, estoqueAtual: 12, precoUnitario: 27.5, equipe: 'Elétrica', localizacao: 'Prateleira A5', ultimaMovimentacao: '06/06/2026' },

      // Refrigeração
      { id: 'M-RF-1', sap: '52092001', codigoFornecedor: 'F-RF-01', descricao: 'Gás Refrigerante R134a DAC Dupont 13,6kg', unidade: 'kg', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 28, precoUnitario: 430.0, equipe: 'Refrigeração', localizacao: 'Área Gás', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-2', sap: '52092002', codigoFornecedor: 'F-RF-02', descricao: 'Compressor Hermético Embraco 1/4 HP R134a 220V', unidade: 'un', estoqueMinimo: 3, estoqueIdeal: 10, estoqueAtual: 5, precoUnitario: 380.0, equipe: 'Refrigeração', localizacao: 'Prateleira R1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-3', sap: '52092003', codigoFornecedor: 'F-RF-03', descricao: 'Termostato para Bebedouro Metalfrio Rc53600-2', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 20, estoqueAtual: 11, precoUnitario: 48.0, equipe: 'Refrigeração', localizacao: 'Prateleira R2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-4', sap: '52092004', codigoFornecedor: 'F-RF-04', descricao: 'Fita Isolante Elastômerica Auto-adesiva 50mm', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 30, estoqueAtual: 15, precoUnitario: 35.0, equipe: 'Refrigeração', localizacao: 'Gaveta R1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-5', sap: '52092005', codigoFornecedor: 'F-RF-05', descricao: 'Capacitor de Marcha Motor Ar Condicionado 35uF', unidade: 'un', estoqueMinimo: 8, estoqueIdeal: 24, estoqueAtual: 17, precoUnitario: 19.9, equipe: 'Refrigeração', localizacao: 'Gaveta R2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-6', sap: '52092006', codigoFornecedor: 'F-RF-06', descricao: 'Tubo de Cobre Flexível Sem Costura 1/4 Panqueca', unidade: 'm', estoqueMinimo: 30, estoqueIdeal: 100, estoqueAtual: 68, precoUnitario: 22.0, equipe: 'Refrigeração', localizacao: 'Suporte Tubos 1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-7', sap: '52092007', codigoFornecedor: 'F-RF-07', descricao: 'Tubo de Cobre Flexível Sem Costura 3/8 Panqueca', unidade: 'm', estoqueMinimo: 30, estoqueIdeal: 100, estoqueAtual: 54, precoUnitario: 34.5, equipe: 'Refrigeração', localizacao: 'Suporte Tubos 2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-8', sap: '52092008', codigoFornecedor: 'F-RF-08', descricao: 'Conjunto de Engates Rápidos Manifold R22 R410a', unidade: 'un', estoqueMinimo: 2, estoqueIdeal: 6, estoqueAtual: 4, precoUnitario: 165.0, equipe: 'Refrigeração', localizacao: 'Prateleira R3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-9', sap: '52092009', codigoFornecedor: 'F-RF-09', descricao: 'Micro-motor Ventilador Elco 1/40 HP 220V Bivolt', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 15, estoqueAtual: 9, precoUnitario: 58.0, equipe: 'Refrigeração', localizacao: 'Prateleira R4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-RF-10', sap: '52092010', codigoFornecedor: 'F-RF-10', descricao: 'Isolamento Térmico Tubo Esponjoso PE Blindado 3/8', unidade: 'm', estoqueMinimo: 50, estoqueIdeal: 150, estoqueAtual: 95, precoUnitario: 6.5, equipe: 'Refrigeração', localizacao: 'Cesto R1', ultimaMovimentacao: '06/06/2026' },

      // Civil
      { id: 'M-CV-1', sap: '53092001', codigoFornecedor: 'F-CV-01', descricao: 'Cimento Portland CP II F-32 Votoran 50kg', unidade: 'sc', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 22, precoUnitario: 32.5, equipe: 'Civil', localizacao: 'Galpão Materiais', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-2', sap: '53092002', codigoFornecedor: 'F-CV-02', descricao: 'Tijolo Baiano Cerâmico 8 Furos 9x19x19cm', unidade: 'un', estoqueMinimo: 200, estoqueIdeal: 1000, estoqueAtual: 450, precoUnitario: 1.2, equipe: 'Civil', localizacao: 'Pátio Aberto', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-3', sap: '53092003', codigoFornecedor: 'F-CV-03', descricao: 'Gesso Rápido em Pó Saco 1kg Construção', unidade: 'sc', estoqueMinimo: 10, estoqueIdeal: 30, estoqueAtual: 14, precoUnitario: 7.9, equipe: 'Civil', localizacao: 'Prateleira C1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-4', sap: '53092004', codigoFornecedor: 'F-CV-04', descricao: 'Prego com Cabeça Gerdau 18 x 27 Recozido', unidade: 'kg', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 18, precoUnitario: 18.2, equipe: 'Civil', localizacao: 'Prateleira C2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-5', sap: '53092005', codigoFornecedor: 'F-CV-05', descricao: 'Cal Hidratada Itaú para Argamassa Pintura 20kg', unidade: 'sc', estoqueMinimo: 15, estoqueIdeal: 50, estoqueAtual: 33, precoUnitario: 15.5, equipe: 'Civil', localizacao: 'Galpão Materiais', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-6', sap: '53092006', codigoFornecedor: 'F-CV-06', descricao: 'Silicone Selante Transparente Adesivo Tekbond 280g', unidade: 'un', estoqueMinimo: 15, estoqueIdeal: 60, estoqueAtual: 37, precoUnitario: 19.5, equipe: 'Civil', localizacao: 'Prateleira C3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-7', sap: '53092007', codigoFornecedor: 'F-CV-07', descricao: 'Espuma Expansiva de Poliuretano Tekbond 500ml', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 30, estoqueAtual: 16, precoUnitario: 24.9, equipe: 'Civil', localizacao: 'Prateleira C4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-8', sap: '53092008', codigoFornecedor: 'F-CV-08', descricao: 'Rejunte Flexível Multiuso Quartzolit Cinza 1kg', unidade: 'sc', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 21, precoUnitario: 9.9, equipe: 'Civil', localizacao: 'Prateleira C5', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-9', sap: '53092009', codigoFornecedor: 'F-CV-09', descricao: 'Massa Plástica Adesiva Carplastic Cinza 400g', unidade: 'un', estoqueMinimo: 8, estoqueIdeal: 24, estoqueAtual: 13, precoUnitario: 14.5, equipe: 'Civil', localizacao: 'Prateleira C6', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-CV-10', sap: '53092010', codigoFornecedor: 'F-CV-10', descricao: 'Parafuso Cabeça Chata para Bucha 8mm Phillips', unidade: 'un', estoqueMinimo: 100, estoqueIdeal: 500, estoqueAtual: 350, precoUnitario: 0.35, equipe: 'Civil', localizacao: 'Gaveta C1', ultimaMovimentacao: '06/06/2026' },

      // Hidráulica
      { id: 'M-HD-1', sap: '54092001', codigoFornecedor: 'F-HD-01', descricao: 'Tubo Soldável de PVC de 25mm Tigre Barra 6m', unidade: 'm', estoqueMinimo: 20, estoqueIdeal: 80, estoqueAtual: 44, precoUnitario: 24.0, equipe: 'Hidráulica', localizacao: 'Cavalete 1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-2', sap: '54092002', codigoFornecedor: 'F-HD-02', descricao: 'Aditivo Adesivo Plástico Epóxi PVC Amanco Frasco 75g', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 35, estoqueAtual: 19, precoUnitario: 13.5, equipe: 'Hidráulica', localizacao: 'Prateleira H1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-3', sap: '54092003', codigoFornecedor: 'F-HD-03', descricao: 'Fita Veda Rosca PTFE Teflon Tigre 18mm x 10m', unidade: 'un', estoqueMinimo: 30, estoqueIdeal: 100, estoqueAtual: 62, precoUnitario: 4.8, equipe: 'Hidráulica', localizacao: 'Gaveta H1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-4', sap: '54092004', codigoFornecedor: 'F-HD-04', descricao: 'Válvula de Esfera Soldável PVC Tigre 25mm', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 20, estoqueAtual: 12, precoUnitario: 22.9, equipe: 'Hidráulica', localizacao: 'Prateleira H2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-5', sap: '54092005', codigoFornecedor: 'F-HD-05', descricao: 'Joelho Soldável Tigre 90 Graus PVC Azul 25mm', unidade: 'un', estoqueMinimo: 40, estoqueIdeal: 150, estoqueAtual: 86, precoUnitario: 2.1, equipe: 'Hidráulica', localizacao: 'Cesto H1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-6', sap: '54092006', codigoFornecedor: 'F-HD-06', descricao: 'Luva de Correr PVC Soldável Tigre 25mm Cano', unidade: 'un', estoqueMinimo: 20, estoqueIdeal: 80, estoqueAtual: 42, precoUnitario: 6.9, equipe: 'Hidráulica', localizacao: 'Cesto H2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-7', sap: '54092007', codigoFornecedor: 'F-HD-07', descricao: 'Sifão Sanfonado Universal Branco Tigre Ajustável', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 35, estoqueAtual: 21, precoUnitario: 14.9, equipe: 'Hidráulica', localizacao: 'Prateleira H3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-8', sap: '54092008', codigoFornecedor: 'F-HD-08', descricao: 'Massa para Calafetar Adesivo Solução Vedação', unidade: 'un', estoqueMinimo: 8, estoqueIdeal: 30, estoqueAtual: 15, precoUnitario: 11.5, equipe: 'Hidráulica', localizacao: 'Prateleira H4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-9', sap: '54092009', codigoFornecedor: 'F-HD-09', descricao: 'Ralo Sifonado Cônico PVC Tigre Saída 100x40mm', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 20, estoqueAtual: 11, precoUnitario: 18.9, equipe: 'Hidráulica', localizacao: 'Prateleira H5', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-HD-10', sap: '54092010', codigoFornecedor: 'F-HD-10', descricao: 'Bucha de Redução Curta PVC Roscável Amanco 3/4x1/2', unidade: 'un', estoqueMinimo: 15, estoqueIdeal: 50, estoqueAtual: 34, precoUnitario: 3.5, equipe: 'Hidráulica', localizacao: 'Cesto H3', ultimaMovimentacao: '06/06/2026' },

      // Pintura
      { id: 'M-PT-1', sap: '55092001', codigoFornecedor: 'F-PT-01', descricao: 'Tinta Acrílica Fosca Premium Coral Rende Muito Branca 18L', unidade: 'gl', estoqueMinimo: 5, estoqueIdeal: 15, estoqueAtual: 9, precoUnitario: 320.0, equipe: 'Pintura', localizacao: 'Galpão Tintas', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-2', sap: '55092002', codigoFornecedor: 'F-PT-02', descricao: 'Rolo de Lã de Carneiro para Pintura Suvinil Profissional', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 40, estoqueAtual: 22, precoUnitario: 28.5, equipe: 'Pintura', localizacao: 'Prateleira P1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-3', sap: '55092003', codigoFornecedor: 'F-PT-03', descricao: 'Massa Corrida PVA Suvinil Nivelar Paredes Balde', unidade: 'gl', estoqueMinimo: 5, estoqueIdeal: 20, estoqueAtual: 12, precoUnitario: 55.0, equipe: 'Pintura', localizacao: 'Galpão Tintas', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-4', sap: '55092004', codigoFornecedor: 'F-PT-04', descricao: 'Lixa Ferro Grão 150 225x275mm Acabamento', unidade: 'un', estoqueMinimo: 50, estoqueIdeal: 200, estoqueAtual: 120, precoUnitario: 2.3, equipe: 'Pintura', localizacao: 'Prateleira P2', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-5', sap: '55092005', codigoFornecedor: 'F-PT-05', descricao: 'Fita Crepe Adesiva Alta Performance 24mm x 50m', unidade: 'un', estoqueMinimo: 20, estoqueIdeal: 80, estoqueAtual: 45, precoUnitario: 7.9, equipe: 'Pintura', localizacao: 'Gaveta P1', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-6', sap: '55092006', codigoFornecedor: 'F-PT-06', descricao: 'Solvente Solvraz Diluente Esmalte Galão 900ml', unidade: 'gl', estoqueMinimo: 4, estoqueIdeal: 12, estoqueAtual: 7, precoUnitario: 18.5, equipe: 'Pintura', localizacao: 'Galpão Tintas', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-7', sap: '55092007', codigoFornecedor: 'F-PT-07', descricao: 'Pincel Trincha para Pintura Atlas Especial Cerda Preta 2', unidade: 'un', estoqueMinimo: 10, estoqueIdeal: 35, estoqueAtual: 18, precoUnitario: 9.9, equipe: 'Pintura', localizacao: 'Prateleira P3', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-8', sap: '55092008', codigoFornecedor: 'F-PT-08', descricao: 'Selador Acrílico Construção Base Preparadora 3,6L', unidade: 'gl', estoqueMinimo: 4, estoqueIdeal: 12, estoqueAtual: 6, precoUnitario: 45.0, equipe: 'Pintura', localizacao: 'Galpão Tintas', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-9', sap: '55092009', codigoFornecedor: 'F-PT-09', descricao: 'Bandeja para Tinta Plástica de Pintor Profissional', unidade: 'un', estoqueMinimo: 5, estoqueIdeal: 20, estoqueAtual: 11, precoUnitario: 12.5, equipe: 'Pintura', localizacao: 'Prateleira P4', ultimaMovimentacao: '06/06/2026' },
      { id: 'M-PT-10', sap: '55092010', codigoFornecedor: 'F-PT-10', descricao: 'Resina Acrílica Construção à Base de Água Interno/Externo', unidade: 'gl', estoqueMinimo: 3, estoqueIdeal: 10, estoqueAtual: 5, precoUnitario: 189.0, equipe: 'Pintura', localizacao: 'Galpão Tintas', ultimaMovimentacao: '06/06/2026' }
    ];

    // 3. Generate 15 entries (Entradas) each month from January to June 2026 (90 total):
    const newEntradas: Movimentacao[] = [];
    const newRetiradas: Movimentacao[] = [];

    const months = [1, 2, 3, 4, 5, 6]; // January to June 2026
    const suppliers = [
      'Luz & Cia Fornecimentos',
      'Refrisul Distribuição',
      'Votorantim Materiais',
      'Tupan Distribuidora',
      'Castelo Tintas Eireli',
      'Eletro Obras S.A.',
      'FrigoParts Comercio',
      'Tubos e Conexões Norte'
    ];

    const conferentes = ['Arthur Almeida', 'Gislaine', 'Marco Antônio', 'Ana Paula', 'Carlos Souza'];
    const liberadores = ['Arthur Almeida', 'Gislaine', 'Marco Antônio', 'Ana Paula', 'Carlos Souza'];

    const osTemplates = [
      'Manutenção Preventiva de Rotina',
      'Correção de Vazamento Emergencial',
      'Substituição de Fiação e Iluminação',
      'Reparo de Pintura de Alvenaria',
      'Instalação de Novo Ponto de Ar Condicionado',
      'Reforma de Piso e Acabamento Interno',
      'Substituição de Conexões de Esgoto',
      'Readequação de Quadro Elétrico Geral'
    ];

    months.forEach((month) => {
      // 15 entries (Entradas) for this month
      for (let i = 1; i <= 15; i++) {
        const materialIndex = ((month - 1) * 15 + i) % newMateriais.length;
        const material = newMateriais[materialIndex];
        
        let day = i * 2 - 1;
        // June cap (today is June 6th 2026)
        if (month === 6) {
          day = Math.min(6, (i % 6) + 1);
        } else {
          day = Math.min(28, day);
        }

        const hour = 8 + (i % 9);
        const minute = (i * 7) % 60;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        const minStr = minute < 10 ? `0${minute}` : `${minute}`;
        const dateStr = `2026-${monthStr}-${dayStr}T${hourStr}:${minStr}:00Z`;

        const nfNum = 10000 + month * 1000 + i * 47;
        const pcNum = 20000 + month * 800 + i * 31;
        const supplier = suppliers[i % suppliers.length];
        const conferente = conferentes[i % conferentes.length];
        const qty = 5 + (i * 3) % 25; // 5 to 30 units

        newEntradas.push({
          id: `sim-ent-${month}-${i}`,
          data: dateStr,
          tipo: 'Entrada',
          materialId: material.id,
          materialDesc: material.descricao,
          quantidade: qty,
          precoUnitario: material.precoUnitario,
          nf: `NF-${nfNum}`,
          pedidoCompra: `PC-${pcNum}`,
          pedidoSap: `SAP-${pcNum}`,
          fornecedor: supplier,
          conferente: conferente,
          observacoes: `Lote de ${material.unidade} para reabastecimento mensal das equipes técnicas.`,
          equipe: material.equipe
        });
      }

      // 15 withdrawals (Retiradas) for this month
      for (let i = 1; i <= 15; i++) {
        const materialIndex = ((month - 1) * 12 + i * 3) % newMateriais.length;
        const material = newMateriais[materialIndex];

        // Select a collaborator
        const colabIndex = (month + i) % newColaboradores.length;
        const colab = newColaboradores[colabIndex];

        let day = i * 2;
        // June cap (today is June 6th 2026)
        if (month === 6) {
          day = Math.min(6, (i % 5) + 1);
        } else {
          day = Math.min(28, day);
        }

        const hour = 8 + ((i + 2) % 9);
        const minute = (i * 13) % 60;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        const minStr = minute < 10 ? `0${minute}` : `${minute}`;
        const dateStr = `2026-${monthStr}-${dayStr}T${hourStr}:${minStr}:00Z`;

        const osNum = 80000 + month * 500 + i * 29;
        const liberador = liberadores[(i + 1) % liberadores.length];
        const qty = 1 + (i % 4); // 1 to 4 units
        const obs = osTemplates[i % osTemplates.length];

        newRetiradas.push({
          id: `sim-ret-${month}-${i}`,
          data: dateStr,
          tipo: 'Retirada',
          materialId: material.id,
          materialDesc: material.descricao,
          quantidade: qty,
          precoUnitario: material.precoUnitario,
          os: `OS-${osNum}`,
          colaborador: colab.nome,
          empresa: colab.empresa,
          equipe: colab.equipe,
          liberador: liberador,
          observacoes: `${obs} - Atendimento à demanda técnica de ${colab.equipe}.`
        });
      }
    });

    // Combine current state with new items
    setColaboradores(prev => {
      const existingNames = prev.map(c => c.nome.toLowerCase());
      const filteredNew = newColaboradores.filter(c => !existingNames.includes(c.nome.toLowerCase()));
      return [...prev, ...filteredNew];
    });

    setMateriais(prev => {
      const existingSaps = prev.map(m => m.sap);
      const filteredNew = newMateriais.filter(m => !existingSaps.includes(m.sap));
      return [...prev, ...filteredNew];
    });

    setMovimentacoes(prev => {
      const existingIds = prev.map(m => m.id);
      const filteredNewEntradas = newEntradas.filter(m => !existingIds.includes(m.id));
      const filteredNewRetiradas = newRetiradas.filter(m => !existingIds.includes(m.id));
      return [...filteredNewEntradas, ...filteredNewRetiradas, ...prev];
    });
  };

  const refreshData = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      if (!navigator.onLine) {
        throw new Error("Sem conexão com internet");
      }
      const data = await syncToSupabase.fetchAll();
      
      const mergeWithSupabase = <T extends { id: string; syncStatus?: 'synced' | 'pending' }>(supabaseData: T[], setFn: React.Dispatch<React.SetStateAction<T[]>>) => {
        // As per AGENTS.md: Set state DIRECTLY with supabase data
        setFn(supabaseData);
      };

      const sanitizedMaterials = data.materiais.map(m => ({
        ...m,
        unidade: m.unidade === 'UM' ? 'UNI' : m.unidade,
        syncStatus: 'synced' as const
      }));
      
      mergeWithSupabase(sanitizedMaterials, setMateriais);
      mergeWithSupabase(data.colaboradores.map(c => ({...c, syncStatus: 'synced' as const})), setColaboradores);
      mergeWithSupabase(data.empresas, setEmpresas);
      mergeWithSupabase(data.equipes, setEquipes);
      mergeWithSupabase(data.fornecedores, setFornecedores);
      mergeWithSupabase(data.movimentacoes, setMovimentacoes);
      mergeWithSupabase(data.atas, setAtas);
    } catch (err: any) {
      console.error("Manual refresh failed:", err);
      setSyncError(err.message || "Erro ao atualizar dados");
    } finally {
      setIsSyncing(false);
    }
  };

  const clearAllData = () => {
    // 1. Redefinir estados em memória para vazio completo
    setMateriais([]);
    setColaboradores([]);
    setEmpresas([]);
    setEquipes([]);
    setFornecedores([]);
    setMovimentacoes([]);
    setBatchState([]);
    setAtas([]);
    
    // 2. Clear flags that keep the user in the app, but do not reload
    setHasEntered(false);
    setView('dashboard');

    // 3. Gravar arrays vazios no LocalStorage sincronamente
    localStorage.setItem('ppm_materiais', '[]');
    localStorage.setItem('ppm_colaboradores', '[]');
    localStorage.setItem('ppm_empresas', '[]');
    localStorage.setItem('ppm_equipes', '[]');
    localStorage.setItem('ppm_fornecedores', '[]');
    localStorage.setItem('ppm_movimentacoes', '[]');
    localStorage.setItem('ppm_atas', '[]');
    
    localStorage.removeItem('selfMeeting_compras');
    localStorage.removeItem('selfMeeting_selectedTeam');
    localStorage.removeItem('ppm_current_view');
    localStorage.removeItem('ppm_has_entered');

    // 4. Force a reload to clean any potential cached states
    window.location.reload();
  };

  return (
    <AppContext.Provider value={{
      view, setView,
      hasEntered, setHasEntered,
      materiais, setMateriais,
      colaboradores, setColaboradores,
      empresas, setEmpresas,
      equipes, setEquipes,
      fornecedores, setFornecedores,
      movimentacoes, setMovimentacoes,
      batchState, setBatchState,
      atas, setAtas,
      deletionPassword, setDeletionPassword,
      isDeletionPasswordEnabled, setIsDeletionPasswordEnabled,
      isSyncing, setIsSyncing,
      syncError, setSyncError,
      retrySync,
      addMovimentacao,
      deleteMovimentacao,
      updateMovimentacao,
      addMaterial,
      addColaborador,
      addEquipe,
      addAta,
      updateAta,
      deleteAta,
      updateMaterial,
      deleteMaterial,
      updateColaborador,
      deleteColaborador,
      updateEquipe,
      deleteEquipe,
      updateFornecedor,
      deleteFornecedor,
      addFornecedor,
      updateEmpresa,
      addEmpresa,
      deleteEmpresa,
      seedTestData,
      refreshData,
      clearAllData,
      user,
      signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
