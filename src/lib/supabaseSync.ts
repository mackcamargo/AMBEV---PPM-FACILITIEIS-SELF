import { supabase } from './supabase';
import { Material, Colaborador, Empresa, Equipe, Fornecedor, Movimentacao, AtaReuniao } from '../types';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const syncToSupabase = {
  async insertMaterial(m: Material): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(m.id)) return { success: false, error: 'Invalid UUID' };
    const sapValue = m.sap?.trim() || `T-${Date.now()}-${m.id.slice(0, 4)}`;
    try {
      const { error } = await supabase.from('materiais').upsert({
        id: m.id,
        sap: sapValue,
        codigo_fornecedor: m.codigoFornecedor || '',
        fornecedor_id: isUUID(m.fornecedorId || '') ? m.fornecedorId : null,
        descricao: m.descricao || 'Material Sem Descrição',
        unidade: m.unidade || 'UM',
        estoque_minimo: m.estoqueMinimo || 0,
        estoque_ideal: m.estoqueIdeal || 0,
        estoque_atual: m.estoqueAtual || 0,
        preco_unitario: m.precoUnitario || 0,
        equipe: m.equipe || 'Geral',
        localizacao: m.localizacao || null,
        detalhes: m.detalhes || null,
        ncm: m.ncm || null
      }, { onConflict: 'id' });
      
      if (error) {
        console.error("Supabase Error inserting material:", error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("Fetch Error inserting material:", err);
      return { success: false, error: err.message || 'Network Error' };
    }
  },
  async updateMaterial(id: string, m: Partial<Material>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
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
    if (m.fornecedorId !== undefined) payload.fornecedor_id = isUUID(m.fornecedorId || '') ? m.fornecedorId : null;
    if (m.detalhes !== undefined) payload.detalhes = m.detalhes;
    if (m.ncm !== undefined) payload.ncm = m.ncm;

    try {
      const { error } = await supabase.from('materiais').update(payload).eq('id', id);
      if (error) {
        console.error("Supabase Error updating material:", error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("Fetch Error updating material:", err);
      return { success: false, error: err.message || 'Network Error' };
    }
  },
  async deleteMaterial(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('materiais').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertColaborador(c: Colaborador): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(c.id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('colaboradores').insert({
        id: c.id,
        matricula: c.matricula || `MAT-${c.id.split('-')[0]}`,
        nome: c.nome || 'Colaborador Sem Nome',
        empresa: c.empresa || 'Não informada',
        equipe: c.equipe || 'Geral',
        cargo: c.cargo || 'OUTROS',
        contato: c.contato || null,
        status: c.status
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async updateColaborador(id: string, c: Partial<Colaborador>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { syncStatus, ...payload } = c;
      const { error } = await supabase.from('colaboradores').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async deleteColaborador(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertEquipe(e: Equipe): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(e.id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('equipes').insert({
        id: e.id,
        nome: e.nome || `Equipe-${e.id.split('-')[0]}`,
        centro_custo: e.centroCusto || 'CENTRO-DEFAULT',
        gestor: e.gestor || 'Não informado',
        cor: e.cor || '#000000',
        verba_destinada: e.verbaDestinada || 0,
        saldo_atualizado: e.saldoAtualizado || 0
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async updateEquipe(id: string, e: Partial<Equipe>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    const payload: any = {};
    if (e.nome !== undefined) payload.nome = e.nome;
    if (e.centroCusto !== undefined) payload.centro_custo = e.centroCusto;
    if (e.gestor !== undefined) payload.gestor = e.gestor;
    if (e.cor !== undefined) payload.cor = e.cor;
    if (e.verbaDestinada !== undefined) payload.verba_destinada = e.verbaDestinada;
    if (e.saldoAtualizado !== undefined) payload.saldo_atualizado = e.saldoAtualizado;
    
    try {
      const { error } = await supabase.from('equipes').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async deleteEquipe(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('equipes').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertEmpresa(e: Empresa): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(e.id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('empresas').insert({
        id: e.id,
        razao_social: e.razaoSocial || `Empresa-${e.id.split('-')[0]}`,
        cnpj: e.cnpj || `CNPJ-${e.id.split('-')[0]}`,
        num_contrato: e.numContrato || 'S/N',
        status: e.status,
        area_atuacao: e.areaAtuacao || null,
        email_comercial: e.emailComercial || null,
        detalhes: e.detalhes || null,
        codigo_empresa: e.codigoEmpresa || null
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async updateEmpresa(id: string, e: Partial<Empresa>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    const payload: any = {};
    if (e.razaoSocial !== undefined) payload.razao_social = e.razaoSocial;
    if (e.cnpj !== undefined) payload.cnpj = e.cnpj;
    if (e.numContrato !== undefined) payload.num_contrato = e.numContrato;
    if (e.status !== undefined) payload.status = e.status;
    if (e.areaAtuacao !== undefined) payload.area_atuacao = e.areaAtuacao;
    if (e.emailComercial !== undefined) payload.email_comercial = e.emailComercial;
    if (e.detalhes !== undefined) payload.detalhes = e.detalhes;
    if (e.codigoEmpresa !== undefined) payload.codigo_empresa = e.codigoEmpresa;
    try {
      const { error } = await supabase.from('empresas').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async deleteEmpresa(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertFornecedor(f: Fornecedor): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(f.id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('fornecedores').insert({
        id: f.id,
        nome_fantasia: f.nomeFantasia || `Fornecedor-${f.id.split('-')[0]}`,
        cnpj: f.cnpj || `CNPJ-${f.id.split('-')[0]}`,
        telefone: f.telefone || null,
        email: f.email || null,
        categoria: f.categoria || null,
        codigo_fornecedor: f.codigoFornecedor || null,
        detalhes: f.detalhes || null
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async updateFornecedor(id: string, f: Partial<Fornecedor>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    const payload: any = {};
    if (f.nomeFantasia !== undefined) payload.nome_fantasia = f.nomeFantasia;
    if (f.cnpj !== undefined) payload.cnpj = f.cnpj;
    if (f.telefone !== undefined) payload.telefone = f.telefone;
    if (f.email !== undefined) payload.email = f.email;
    if (f.categoria !== undefined) payload.categoria = f.categoria;
    if (f.codigoFornecedor !== undefined) payload.codigo_fornecedor = f.codigoFornecedor;
    if (f.detalhes !== undefined) payload.detalhes = f.detalhes;
    try {
      const { error } = await supabase.from('fornecedores').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async deleteFornecedor(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('fornecedores').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertMovimentacao(m: Movimentacao): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(m.id)) return { success: false, error: 'Invalid UUID' };
    try {
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
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  async deleteMovimentacao(id: string): Promise<{ success: boolean; error?: string }> {
     if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
     try {
       const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
     } catch (err: any) {
       return { success: false, error: err.message };
     }
  },
  async updateMovimentacao(id: string, m: Partial<Movimentacao>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    const payload: any = {};
    if (m.data !== undefined) payload.data = m.data;
    if (m.tipo !== undefined) payload.tipo = m.tipo;
    if (m.materialId !== undefined) payload.material_id = m.materialId;
    if (m.materialDesc !== undefined) payload.material_desc = m.materialDesc;
    if (m.quantidade !== undefined) payload.quantidade = m.quantidade;
    if (m.colaborador !== undefined) payload.colaborador = m.colaborador;
    if (m.os !== undefined) payload.os = m.os;
    if (m.nf !== undefined) payload.nf = m.nf;
    if (m.pedidoCompra !== undefined) payload.pedido_compra = m.pedidoCompra;
    if (m.pedidoSap !== undefined) payload.pedido_sap = m.pedidoSap;
    if (m.fornecedor !== undefined) payload.fornecedor = m.fornecedor;
    if (m.conferente !== undefined) payload.conferente = m.conferente;
    if (m.liberador !== undefined) payload.liberador = m.liberador;
    if (m.observacoes !== undefined) payload.observacoes = m.observacoes;
    if (m.precoUnitario !== undefined) payload.preco_unitario = m.precoUnitario;
    if (m.empresa !== undefined) payload.empresa = m.empresa;
    if (m.equipe !== undefined) payload.equipe = m.equipe;

    try {
      const { error } = await supabase.from('movimentacoes').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async insertAta(a: AtaReuniao): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(a.id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('atas_reuniao').insert({
        id: a.id,
        data: a.data,
        descricao: a.descricao,
        orcamentos_snapshot: a.orcamentosSnapshot,
        itens_comprados: a.itensComprados
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateAta(id: string, a: Partial<AtaReuniao>): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    const payload: any = {};
    if (a.data !== undefined) payload.data = a.data;
    if (a.descricao !== undefined) payload.descricao = a.descricao;
    if (a.orcamentosSnapshot !== undefined) payload.orcamentos_snapshot = a.orcamentosSnapshot;
    if (a.itensComprados !== undefined) payload.itens_comprados = a.itensComprados;

    try {
      const { error } = await supabase.from('atas_reuniao').update(payload).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteAta(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isUUID(id)) return { success: false, error: 'Invalid UUID' };
    try {
      const { error } = await supabase.from('atas_reuniao').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async fetchAll() {
    const responses = await Promise.all([
      supabase.from('materiais').select('*'),
      supabase.from('colaboradores').select('*'),
      supabase.from('empresas').select('*'),
      supabase.from('equipes').select('*'),
      supabase.from('fornecedores').select('*'),
      supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
      supabase.from('atas_reuniao').select('*').order('data', { ascending: false })
    ]);

    // Check for errors in any of the responses
    for (const res of responses) {
      if (res.error) {
        throw new Error(`Erro ao buscar dados: ${res.error.message}`);
      }
    }

    const [
      { data: materiais },
      { data: colaboradores },
      { data: empresas },
      { data: equipes },
      { data: fornecedores },
      { data: movimentacoes },
      { data: atas }
    ] = responses;

    return {
      materiais: materiais?.map(m => ({
        id: m.id,
        sap: m.sap,
        codigoFornecedor: m.codigo_fornecedor,
        fornecedorId: m.fornecedor_id,
        descricao: m.descricao,
        unidade: m.unidade,
        estoqueMinimo: Number(m.estoque_minimo),
        estoqueIdeal: Number(m.estoque_ideal),
        estoqueAtual: Number(m.estoque_atual),
        precoUnitario: Number(m.preco_unitario),
        equipe: m.equipe,
        localizacao: m.localizacao,
        ultimaMovimentacao: m.ultima_movimentacao,
        detalhes: m.detalhes,
        ncm: m.ncm,
        createdAt: m.created_at
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
