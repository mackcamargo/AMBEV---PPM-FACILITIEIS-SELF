import { Material } from '../types';

export const p1: Omit<Material, 'id'>[] = [
  { sap: "50069213", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 4, descricao: "ABRAÇADEIRA COPO 1/2", estoqueMinimo: 10, estoqueIdeal: 20, precoUnitario: 10 },
  { sap: "0", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 0, descricao: "ABRAÇADEIRA COPO 1/4", estoqueMinimo: 10, estoqueIdeal: 20, precoUnitario: 10 },
  { sap: "50237421", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 10, descricao: "ABRAÇADEIRA COPO 3/4", estoqueMinimo: 10, estoqueIdeal: 20, precoUnitario: 10 },
  { sap: "0", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 0, descricao: "ADESIVO P/ LAMINAO", estoqueMinimo: 3, estoqueIdeal: 1, precoUnitario: 36 },
  { sap: "50013398", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 0, descricao: "ANTIESPUMA", estoqueMinimo: 3, estoqueIdeal: 6, precoUnitario: 18 },
  { sap: "50025922", codigoFornecedor: "0", unidade: "m²", equipe: "Civil", estoqueAtual: 0, descricao: "AREIA LAVADA (m)", estoqueMinimo: 1, estoqueIdeal: 2, precoUnitario: 5.69 },
  { sap: "0", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 4, descricao: "AREJADOR T2 MACHO", estoqueMinimo: 5, estoqueIdeal: 1, precoUnitario: 10 },
  { sap: "50371950", codigoFornecedor: "0", unidade: "gl", equipe: "Civil", estoqueAtual: 10, descricao: "ARGAMASSA", estoqueMinimo: 5, estoqueIdeal: 10, precoUnitario: 47.9 },
  { sap: "0", codigoFornecedor: "0", unidade: "gl", equipe: "Civil", estoqueAtual: 0, descricao: "ARGAMASSA PISO SOBRE PISO", estoqueMinimo: 10, estoqueIdeal: 1, precoUnitario: 63.9 },
  { sap: "0", codigoFornecedor: "0", unidade: "un", equipe: "Civil", estoqueAtual: 0, descricao: "ARREBITE 3.2X25 ALUMINIO C/50", estoqueMinimo: 50, estoqueIdeal: 1, precoUnitario: 74 }
];
export const p2: Omit<Material, 'id'>[] = [
  // ... (100 items here)
];
export const p3: Omit<Material, 'id'>[] = [
  // ... (100 items here)
];
export const p4: Omit<Material, 'id'>[] = [
  // ... (113 items here)
];

export const materialsToImport = [...p1, ...p2, ...p3, ...p4];
