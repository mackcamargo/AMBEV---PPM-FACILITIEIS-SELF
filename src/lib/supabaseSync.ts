import { supabase } from './supabase';
import { Material, Colaborador, Empresa, Equipe, Fornecedor, Movimentacao, AtaReuniao } from '../types';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const syncToSupabase = {
  async insertMaterial(m: Material) {
    if (!isUUID(m.id)) return;
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
    if (!isUUID(id)) return;
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
    if (!isUUID(id)) return;
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    if (error) console.error("Error deleting material:", error.message);
  },

  async insertColaborador(c: Colaborador) {
    if (!isUUID(c.id)) return;
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
    if (!isUUID(id)) return;
    const { error } = await supabase.from('colaboradores').update(c).eq('id', id);
    if (error) console.error("Error updating colaborador:", error.message);
  },
  async deleteColaborador(id: string) {
    if (!isUUID(id)) return;
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) console.error("Error deleting colaborador:", error.message);
  },

  async insertEquipe(e: Equipe) {
    if (!isUUID(e.id)) return;
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
    if (!isUUID(id)) return;
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
    if (!isUUID(id)) return;
    const { error } = await supabase.from('equipes').delete().eq('id', id);
    if (error) console.error("Error deleting equipe:", error.message);
  },

  async insertEmpresa(e: Empresa) {
    if (!isUUID(e.id)) return;
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
    if (!isUUID(id)) return;
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
    if (!isUUID(id)) return;
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) console.error("Error deleting empresa:", error.message);
  },

  async insertFornecedor(f: Fornecedor) {
    if (!isUUID(f.id)) return;
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
    if (!isUUID(id)) return;
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
    if (!isUUID(id)) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) console.error("Error deleting fornecedor:", error.message);
  },

  async insertMovimentacao(m: Movimentacao) {
    if (!isUUID(m.id)) return;
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
     if (!isUUID(id)) return;
     const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
     if (error) console.error("Error deleting movimentacao:", error.message);
  },
  async updateMovimentacao(id: string, m: Partial<Movimentacao>) {
    if (!isUUID(id)) return;
    const payload: any = {};
    if (m.data !== undefined) payload.data = m.data;
    if (m.quantidade !== undefined) payload.quantidade = m.quantidade;
    if (m.observacoes !== undefined) payload.observacoes = m.observacoes;
    const { error } = await supabase.from('movimentacoes').update(payload).eq('id', id);
    if (error) console.error("Error updating movimentacao:", error.message);
  },

  async insertAta(a: AtaReuniao) {
    if (!isUUID(a.id)) return;
    const { error } = await supabase.from('atas_reuniao').insert({
      id: a.id,
      data: a.data,
      descricao: a.descricao,
      orcamentos_snapshot: a.orcamentosSnapshot,
      itens_comprados: a.itensComprados
    });
    if (error) console.error("Error inserting ata:", error.message);
  },

  async fetchAll() {
    const [
      { data: materiais },
      { data: colaboradores },
      { data: empresas },
      { data: equipes },
      { data: fornecedores },
      { data: movimentacoes },
      { data: atas }
    ] = await Promise.all([
      supabase.from('materiais').select('*'),
      supabase.from('colaboradores').select('*'),
      supabase.from('empresas').select('*'),
      supabase.from('equipes').select('*'),
      supabase.from('fornecedores').select('*'),
      supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
      supabase.from('atas_reuniao').select('*').order('data', { ascending: false })
    ]);

    return {
      materiais: materiais?.map(m => ({
        id: m.id,
        sap: m.sap,
        codigoFornecedor: m.codigo_fornecedor,
        descricao: m.descricao,
        unidade: m.unidade,
        estoqueMinimo: Number(m.estoque_minimo),
        estoqueIdeal: Number(m.estoque_ideal),
        estoqueAtual: Number(m.estoque_atual),
        precoUnitario: Number(m.preco_unitario),
        equipe: m.equipe,
        localizacao: m.localizacao,
        ultimaMovimentacao: m.ultima_movimentacao,
        detalhes: m.detalhes
      })) || [],
      colaboradores: colaboradores || [],
      empresas: empresas?.map(e => ({
        id: e.id,
        razaoSocial: e.razao_social,
        cnpj: e.cnpj,
        numContrato: e.num_contrato,
        status: e.status,
        areaAtuacao: e.area_atuacao,
        emailComercial: e.email_comercial,
        detalhes: e.detalhes,
        codigoEmpresa: e.codigo_empresa
      })) || [],
      equipes: equipes?.map(eq => ({
        id: eq.id,
        nome: eq.nome,
        centroCusto: eq.centro_custo,
        gestor: eq.gestor,
        cor: eq.cor,
        verbaDestinada: Number(eq.verba_destinada),
        saldoAtualizado: Number(eq.saldo_atualizado)
      })) || [],
      fornecedores: fornecedores?.map(f => ({
        id: f.id,
        nomeFantasia: f.nome_fantasia,
        cnpj: f.cnpj,
        telefone: f.telefone,
        email: f.email,
        categoria: f.categoria,
        codigoFornecedor: f.codigo_fornecedor,
        detalhes: f.detalhes
      })) || [],
      movimentacoes: movimentacoes?.map(mov => ({
        ...mov,
        materialId: mov.material_id,
        materialDesc: mov.material_desc,
        quantidade: Number(mov.quantidade),
        precoUnitario: Number(mov.preco_unitario)
      })) || [],
      atas: atas?.map(a => ({
        id: a.id,
        data: a.data,
        descricao: a.descricao,
        orcamentosSnapshot: a.orcamentos_snapshot,
        itensComprados: a.itens_comprados
      })) || []
    };
  }
};
