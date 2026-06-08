import { supabase } from './supabase';
import { Material, Colaborador, Empresa, Equipe, Fornecedor, Movimentacao, AtaReuniao } from '../types';

export const syncToSupabase = {
  async insertMaterial(m: Material) {
    const { error } = await supabase.from('materiais').insert({
      id: m.id,
      sap: m.sap,
      codigo_fornecedor: m.codigoFornecedor,
      descricao: m.descricao,
      unidade: m.unidade,
      estoque_minimo: m.estoqueMinimo || 0,
      estoque_ideal: m.estoqueIdeal || 0,
      estoque_atual: m.estoqueAtual || 0,
      preco_unitario: m.precoUnitario || 0,
      equipe: m.equipe,
      localizacao: m.localizacao || null
    });
    if (error) console.error("Error inserting material:", error.message);
  },
  async updateMaterial(id: string, m: Partial<Material>) {
    const payload: any = {};
    if (m.sap !== undefined) payload.sap = m.sap;
    if (m.codigoFornecedor !== undefined) payload.codigo_fornecedor = m.codigoFornecedor;
    if (m.descricao !== undefined) payload.descricao = m.descricao;
    if (m.unidade !== undefined) payload.unidade = m.unidade;
    if (m.estoqueMinimo !== undefined) payload.estoque_minimo = m.estoqueMinimo;
    if (m.estoqueIdeal !== undefined) payload.estoque_ideal = m.estoqueIdeal;
    if (m.estoqueAtual !== undefined) payload.estoque_atual = m.estoqueAtual;
    if (m.precoUnitario !== undefined) payload.preco_unitario = m.precoUnitario;
    if (m.equipe !== undefined) payload.equipe = m.equipe;
    if (m.localizacao !== undefined) payload.localizacao = m.localizacao;

    const { error } = await supabase.from('materiais').update(payload).eq('id', id);
    if (error) console.error("Error updating material:", error.message);
  },
  async deleteMaterial(id: string) {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    if (error) console.error("Error deleting material:", error.message);
  },

  async insertColaborador(c: Colaborador) {
    const { error } = await supabase.from('colaboradores').insert({
      id: c.id,
      matricula: c.matricula,
      nome: c.nome,
      empresa: c.empresa,
      equipe: c.equipe,
      cargo: c.cargo || null,
      contato: c.contato || null,
      status: c.status
    });
    if (error) console.error("Error inserting colaborador:", error.message);
  },
  async updateColaborador(id: string, c: Partial<Colaborador>) {
    const { error } = await supabase.from('colaboradores').update(c).eq('id', id);
    if (error) console.error("Error updating colaborador:", error.message);
  },
  async deleteColaborador(id: string) {
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) console.error("Error deleting colaborador:", error.message);
  },

  async insertEquipe(e: Equipe) {
    const { error } = await supabase.from('equipes').insert({
      id: e.id,
      nome: e.nome,
      centro_custo: e.centroCusto,
      gestor: e.gestor,
      cor: e.cor,
      verba_destinada: e.verbaDestinada || 0,
      saldo_atualizado: e.saldoAtualizado || 0
    });
    if (error) console.error("Error inserting equipe:", error.message);
  },
  async updateEquipe(id: string, e: Partial<Equipe>) {
    const payload: any = {};
    if (e.nome !== undefined) payload.nome = e.nome;
    if (e.centroCusto !== undefined) payload.centro_custo = e.centroCusto;
    if (e.gestor !== undefined) payload.gestor = e.gestor;
    if (e.cor !== undefined) payload.cor = e.cor;
    if (e.verbaDestinada !== undefined) payload.verba_destinada = e.verbaDestinada;
    if (e.saldoAtualizado !== undefined) payload.saldo_atualizado = e.saldoAtualizado;
    
    const { error } = await supabase.from('equipes').update(payload).eq('id', id);
    if (error) console.error("Error updating equipe:", error.message);
  },
  async deleteEquipe(id: string) {
    const { error } = await supabase.from('equipes').delete().eq('id', id);
    if (error) console.error("Error deleting equipe:", error.message);
  },

  async insertEmpresa(e: Empresa) {
    const { error } = await supabase.from('empresas').insert({
      id: e.id,
      razao_social: e.razaoSocial,
      cnpj: e.cnpj,
      num_contrato: e.numContrato,
      status: e.status,
      area_atuacao: e.areaAtuacao || null,
      email_comercial: e.emailComercial || null,
      detalhes: e.detalhes || null,
      codigo_empresa: e.codigoEmpresa || null
    });
    if (error) console.error("Error inserting empresa:", error.message);
  },
  async updateEmpresa(id: string, e: Partial<Empresa>) {
    const payload: any = {};
    if (e.razaoSocial !== undefined) payload.razao_social = e.razaoSocial;
    if (e.cnpj !== undefined) payload.cnpj = e.cnpj;
    if (e.numContrato !== undefined) payload.num_contrato = e.numContrato;
    if (e.status !== undefined) payload.status = e.status;
    if (e.areaAtuacao !== undefined) payload.area_atuacao = e.areaAtuacao;
    if (e.emailComercial !== undefined) payload.email_comercial = e.emailComercial;
    if (e.detalhes !== undefined) payload.detalhes = e.detalhes;
    if (e.codigoEmpresa !== undefined) payload.codigo_empresa = e.codigoEmpresa;
    const { error } = await supabase.from('empresas').update(payload).eq('id', id);
    if (error) console.error("Error updating empresa:", error.message);
  },
  async deleteEmpresa(id: string) {
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) console.error("Error deleting empresa:", error.message);
  },

  async insertFornecedor(f: Fornecedor) {
    const { error } = await supabase.from('fornecedores').insert({
      id: f.id,
      nome_fantasia: f.nomeFantasia,
      cnpj: f.cnpj,
      telefone: f.telefone || null,
      email: f.email || null,
      categoria: f.categoria || null,
      codigo_fornecedor: f.codigoFornecedor || null,
      detalhes: f.detalhes || null
    });
    if (error) console.error("Error inserting fornecedor:", error.message);
  },
  async updateFornecedor(id: string, f: Partial<Fornecedor>) {
    const payload: any = {};
    if (f.nomeFantasia !== undefined) payload.nome_fantasia = f.nomeFantasia;
    if (f.cnpj !== undefined) payload.cnpj = f.cnpj;
    if (f.telefone !== undefined) payload.telefone = f.telefone;
    if (f.email !== undefined) payload.email = f.email;
    if (f.categoria !== undefined) payload.categoria = f.categoria;
    if (f.codigoFornecedor !== undefined) payload.codigo_fornecedor = f.codigoFornecedor;
    if (f.detalhes !== undefined) payload.detalhes = f.detalhes;
    const { error } = await supabase.from('fornecedores').update(payload).eq('id', id);
    if (error) console.error("Error updating fornecedor:", error.message);
  },
  async deleteFornecedor(id: string) {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) console.error("Error deleting fornecedor:", error.message);
  },

  async insertMovimentacao(m: Movimentacao) {
    const { error } = await supabase.from('movimentacoes').insert({
      id: m.id,
      data: m.data,
      tipo: m.tipo,
      material_id: m.materialId,
      material_desc: m.materialDesc,
      quantidade: m.quantidade || 0,
      colaborador: m.colaborador || null,
      os: m.os || null,
      nf: m.nf || null,
      pedido_compra: m.pedidoCompra || null,
      pedido_sap: m.pedidoSap || null,
      fornecedor: m.fornecedor || null,
      conferente: m.conferente || null,
      liberador: m.liberador || null,
      observacoes: m.observacoes || null,
      preco_unitario: m.precoUnitario || 0,
      empresa: m.empresa || null,
      equipe: m.equipe || null
    });
    if (error) console.error("Error inserting movimentacao:", error.message);
  },
  async deleteMovimentacao(id: string) {
     const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
     if (error) console.error("Error deleting movimentacao:", error.message);
  },
  async updateMovimentacao(id: string, m: Partial<Movimentacao>) {
    const payload: any = {};
    if (m.data !== undefined) payload.data = m.data;
    if (m.quantidade !== undefined) payload.quantidade = m.quantidade;
    if (m.observacoes !== undefined) payload.observacoes = m.observacoes;
    const { error } = await supabase.from('movimentacoes').update(payload).eq('id', id);
    if (error) console.error("Error updating movimentacao:", error.message);
  },

  async insertAta(a: AtaReuniao) {
    const { error } = await supabase.from('atas_reuniao').insert({
      id: a.id,
      data: a.data,
      descricao: a.descricao,
      orcamentos_snapshot: a.orçamentosSnapshot,
      itens_comprados: a.itensComprados
    });
    if (error) console.error("Error inserting ata:", error.message);
  }
};
