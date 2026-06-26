/**
 * Types for AMBEV - PPM CENTRO DE INTELIGÊNCIA
 */

export type EquipeTecnica = 'Elétrica' | 'Refrigeração' | 'Civil' | 'Hidráulica' | 'Pintura' | 'Geral';

export interface Material {
  id: string;
  sap: string;
  codigoFornecedor?: string;
  fornecedorId?: string;
  descricao: string;
  unidade: string;
  estoqueMinimo: number;
  estoqueIdeal: number;
  estoqueAtual: number;
  precoUnitario: number;
  equipe: EquipeTecnica;
  localizacao?: string;
  ultimaMovimentacao?: string;
  detalhes?: string;
  ncm?: string;
  createdAt?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface Colaborador {
  id: string;
  nome: string;
  matricula: string;
  empresa: string;
  cargo: string;
  equipe: EquipeTecnica;
  contato?: string;
  status: 'Ativo' | 'Inativo';
  syncStatus?: 'synced' | 'pending';
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  numContrato: string;
  status: 'Ativo' | 'Inativo';
  areaAtuacao?: string;
  emailComercial?: string;
  detalhes?: string;
  codigoEmpresa?: string;
}

export interface Equipe {
  id: string;
  codigoEquipe?: string;
  nome: EquipeTecnica;
  centroCusto: string;
  gestor: string;
  cor: string;
  verbaDestinada: number;
  saldoAtualizado: number;
}

export interface Fornecedor {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  categoria: string;
  codigoFornecedor?: string;
  detalhes?: string;
}

export type TipoMovimentacao = 'Entrada' | 'Retirada';

export interface Movimentacao {
  id: string;
  data: string;
  tipo: TipoMovimentacao;
  materialId: string;
  materialDesc: string;
  quantidade: number;
  colaborador?: string;
  os?: string;
  nf?: string;
  pedidoCompra?: string;
  pedidoSap?: string;
  fornecedor?: string;
  conferente?: string;
  liberador?: string;
  observacoes?: string;
  precoUnitario?: number;
  empresa?: string;
  equipe?: string;
}

export interface ItemLote {
  tempId: string;
  materialId: string;
  materialDesc: string;
  quantidade: number;
  precoUnitario?: number;
  detalhesAdicionais: any; // OS, NF, etc dependendo do tipo
  data?: string;
}

export interface AtaReuniao {
  id: string;
  data: string;
  descricao: string;
  orcamentosSnapshot: {
    equipe: string;
    saldoAnterior: number;
    saldoNovo: number;
    estouro?: number;
  }[];
  itensComprados: {
    materialId: string;
    quantidade: number;
    custoTotal: number;
  }[];
}

export type ViewState = 
  | 'dashboard'
  | 'entrada-materiais'
  | 'retirada-materiais'
  | 'estoque-atual'
  | 'movimentacoes'
  | 'cad-materiais'
  | 'cad-empresas'
  | 'cad-fornecedores'
  | 'cad-colaboradores'
  | 'cad-equipes'
  | 'reuniao-self'
  | 'historico-reunioes'
  | 'relatorios'
  | 'configuracoes';

export const formatUnit = (unit: string | undefined | null): string => {
  if (!unit) return '';
  const u = unit.toUpperCase().trim();
  if (u === 'UN' || u === 'UM') return 'UNI';
  if (u === 'GL') return 'GL';
  if (u === 'SC') return 'SC';
  if (u === 'M' || u === 'MT') return 'MT'; 
  return u;
};

