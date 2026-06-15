import React, { useRef } from 'react';
import { useApp } from '../lib/store';
import { CODEBASE_FILES } from '../lib/codebaseBackup';
import { supabase } from '../lib/supabase';

export const Settings: React.FC = () => {
  const { 
    materiais, colaboradores, empresas, equipes, fornecedores, movimentacoes, atas, batchState,
    setMateriais, setColaboradores, setEmpresas, setEquipes, setFornecedores, setMovimentacoes, setAtas, setBatchState,
    deletionPassword, setDeletionPassword, clearAllData,
    isDeletionPasswordEnabled, setIsDeletionPasswordEnabled
  } = useApp();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isAuthorized, setIsAuthorized] = React.useState(!deletionPassword);
  const [accessPassword, setAccessPassword] = React.useState('');
  const [error, setError] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-check authorization if password is removed by another view or if it was newly set
  React.useEffect(() => {
    if (!deletionPassword) {
      setIsAuthorized(true);
    }
  }, [deletionPassword]);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessPassword === deletionPassword) {
      setIsAuthorized(true);
      setError(false);
    } else {
      setError(true);
      setAccessPassword('');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">Esta área contém ferramentas críticas de backup e segurança. Informe a senha de administrador para continuar.</p>
          
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                autoFocus
                className={`w-full bg-slate-50 border ${error ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-200'} rounded-2xl px-6 py-4 text-center text-lg font-bold tracking-[0.5em] placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
                placeholder="••••••"
                value={accessPassword}
                onChange={(e) => {
                  setAccessPassword(e.target.value);
                  setError(false);
                }}
              />
              {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2">Senha Incorreta</p>}
            </div>
            
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
            >
              Desbloquear Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  };

  const exportCSV = () => {
    const headers = ['ID', 'COD SAP', 'Descrição', 'Estoque'];
    const csvContent = [headers.join(',')].concat(
      materiais.map(m => [m.id, m.sap, m.descricao, m.estoqueAtual].join(','))
    ).join('\n');
    downloadFile(csvContent, 'backup_materiais.csv', 'text/csv');
  };

  const exportFullBackup = () => {
    const backupData = {
      tipo: "BACKUP_SISTEMA_INTEGRADO_PPM",
      exportado_em: new Date().toISOString(),
      metadados: {
        app_name: "AMBEV - PPM CENTRO DE INTELIGÊNCIA",
        applet_id: "d3b620b9-6124-4bd0-bd0b-bc6a8315b52a",
        arquitetura_versao: "2.6.0",
        autor: "Mack Camargo",
        contato: "mackcamargo@gmail.com"
      },
      dados: {
        materiais,
        colaboradores,
        empresas,
        equipes,
        fornecedores,
        movimentacoes,
        atas,
        batchState,
        deletionPassword
      },
      arquitetura_e_regras: {
        tipografia: {
          fonte_principal: "Inter (sans-serif) para legibilidade geral e interfaces",
          fonte_dados: "JetBrains Mono (monospace) para números tabulares, códigos e indicadores",
          fonte_titulo: "Display / Space Grotesk para cabeçalhos e seções de destaque"
        },
        tema_visual: {
          estilo: "Off-whites limpos com cinzas profundas (charcoal slate), acentos verde-esmeralda e azul-ambev",
          feedback_sistema: "Micro-animações de entrada fade-in, transições de rotas suaves, estados hover visíveis, touch targets mínimos de 44px para telas sensoriais/mobile",
          layout_principal: "Menu lateral dinâmico retrátil (Single Page Application com 13 visualizações reativas)"
        },
        sistema_audiovisual: {
          audio: "Sintetizador de áudio via API Web Audio (bips limpos não concorrentes a 880Hz/0.08s para exclusão limpa)",
          alertas: "Mensagens tipo Toast flutuantes, bips de aviso para erros, avisos visuais vermelhos para saldo excedido"
        },
        menus_e_rotas: [
          { id: "dashboard", nome: "Painel Principal (Visão Geral de Gastos, Logísticas e Consumo)" },
          { id: "entrada-materiais", nome: "Entrada de Materiais (Fluxo de Registrar Abastecimento por Lote/Individual)" },
          { id: "retirada-materiais", nome: "Retirada de Materiais (Consumo Rápido associado a Nº OS e Equipes)" },
          { id: "estoque-atual", nome: "Estoque Atual (Pesquisa, Status de Nível Crítico/Abaixo do Mínimo, Exportação CSV)" },
          { id: "movimentacoes", nome: "Histórico de Movimentações (Rastreabilidade Completa com Filtro e Exclusão Segura)" },
          { id: "reuniao-self", nome: "Tela Reunião de Self (Decisão de Compra com Duplo Clique editável para estoque/mínimos e abate financeiro)" },
          { id: "cad-materiais", nome: "Cadastro de Materiais" },
          { id: "cad-empresas", nome: "Cadastro de Parceiras/Terceirizadas" },
          { id: "cad-fornecedores", nome: "Cadastro de Fornecedores" },
          { id: "cad-colaboradores", nome: "Cadastro de Colaboradores" },
          { id: "cad-equipes", nome: "Cadastro e Configurações Financeiras de Equipes de Facilities" },
          { id: "historico-reunioes", nome: "Histórico e Atas de Reuniões de Self" },
          { id: "relatorios", nome: "Centro de Relatórios e Exportação Executiva e CSV" },
          { id: "configuracoes", nome: "Painel de Configurações, Segurança e Backup de Arquitetura e Dados" }
        ],
        formulas_matematicas: {
          subtotal_compra: "Subtotal = Quantidade a Comprar * Preço Unitário SAP",
          total_reuniao: "Total Geral = Somatório de todos os subtotais dos materiais selecionados",
          impacto_por_equipe: "Impacto Financeiro = Somatório de subtotais atribuídos a materiais de cada equipe específica",
          abatimento_saldo: "Saldo Novo = Saldo Atualizado - Gasto Previsto (Impacto)",
          status_estoque: "Status = Se Estoque Atual == 0 então 'Zerado'; Se Estoque Atual < Estoque Mínimo então 'Crítico'; Senão 'OK'"
        },
        seguranca: {
          exclusao: "Interrupção do fluxo de exclusão requerendo senha administrativa definida pelo usuário"
        },
        persistente: {
          sessoes: "Gravação persistente de boas-vindas (ppm_has_entered) e visualização de rota (ppm_current_view) no LocalStorage impedindo deslogue ou reset indesejado"
        },
        codigo_fonte: CODEBASE_FILES
      },
      esquema_banco_supabase_postgresql: {
        descricao: "Design Relacional do Banco de Dados no padrão PostgreSQL pronto para execução no editor SQL do Supabase.",
        script_migracao: `
-- =====================================================================
-- SCRIPT DE MIGRAÇÃO COMPLETO PARA SUPABASE (POSTGRESQL RELACIONAL)
-- PPM CENTRO DE INTELIGÊNCIA (AMBEV)
-- =====================================================================

-- 1. EXTENSÕES & SEGURANÇA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: EQUIPES
CREATE TABLE IF NOT EXISTS public.equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_equipe VARCHAR(50),
    nome VARCHAR(100) NOT NULL UNIQUE,
    centro_custo VARCHAR(50) NOT NULL,
    gestor VARCHAR(100) NOT NULL,
    cor VARCHAR(20) DEFAULT '#000000',
    verba_destinada NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    saldo_atualizado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA: COLABORADORES
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    empresa VARCHAR(150) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    equipe VARCHAR(50) NOT NULL,
    contato VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA: EMPRESAS PARCEIRAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social VARCHAR(200) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    num_contrato VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    area_atuacao VARCHAR(150),
    email_comercial VARCHAR(150),
    detalhes TEXT,
    codigo_empresa VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA: FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia VARCHAR(200) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    telefone VARCHAR(50),
    email VARCHAR(150),
    categoria VARCHAR(100),
    codigo_fornecedor VARCHAR(50),
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA: MATERIAIS (CADASTRO PRINCIPAL)
CREATE TABLE IF NOT EXISTS public.materiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sap VARCHAR(50) NOT NULL,
    codigo_fornecedor VARCHAR(50),
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    unidade VARCHAR(10) NOT NULL,
    estoque_minimo NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estoque_ideal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estoque_atual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    preco_unitario NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    equipe VARCHAR(50) NOT NULL REFERENCES public.equipes(nome) ON UPDATE CASCADE,
    localizacao VARCHAR(100),
    ultima_movimentacao TIMESTAMP WITH TIME ZONE,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA: MOVIMENTACOES (HISTÓRICO TRANSAÇÃO)
CREATE TABLE IF NOT EXISTS public.movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada', 'Retirada')),
    material_id UUID REFERENCES public.materiais(id) ON DELETE CASCADE,
    material_desc VARCHAR(255) NOT NULL,
    quantidade NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    colaborador VARCHAR(150),
    os VARCHAR(50),
    nf VARCHAR(50),
    pedido_compra VARCHAR(50),
    pedido_sap VARCHAR(50),
    fornecedor VARCHAR(200),
    conferente VARCHAR(150),
    liberador VARCHAR(150),
    observacoes TEXT,
    preco_unitario NUMERIC(15, 4),
    empresa VARCHAR(150),
    equipe VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA: ATAS DE REUNIOES
CREATE TABLE IF NOT EXISTS public.atas_reuniao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    descricao TEXT NOT NULL,
    orcamentos_snapshot JSONB NOT NULL, -- Matriz contendo saldos anteriores, novos e estouros por equipe
    itens_comprados JSONB NOT NULL,     -- Produtos comprados, quantidade e custo total na sessão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CONFIGURAÇÃO DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atas_reuniao ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS DE ACESSO (POLICIES)
-- Estas políticas permitem que o aplicativo funcione com a chave 'anon'.
-- Para segurança máxima, considere implementar Supabase Auth e restringir para 'authenticated'.

-- Políticas para EQUIPES
CREATE POLICY "Allow public read on equipes" ON public.equipes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on equipes" ON public.equipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on equipes" ON public.equipes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on equipes" ON public.equipes FOR DELETE USING (true);

-- Políticas para COLABORADORES
CREATE POLICY "Allow public read on colaboradores" ON public.colaboradores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on colaboradores" ON public.colaboradores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on colaboradores" ON public.colaboradores FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on colaboradores" ON public.colaboradores FOR DELETE USING (true);

-- Políticas para EMPRESAS
CREATE POLICY "Allow public read on empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "Allow public insert on empresas" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on empresas" ON public.empresas FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on empresas" ON public.empresas FOR DELETE USING (true);

-- Políticas para FORNECEDORES
CREATE POLICY "Allow public read on fornecedores" ON public.fornecedores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on fornecedores" ON public.fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on fornecedores" ON public.fornecedores FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on fornecedores" ON public.fornecedores FOR DELETE USING (true);

-- Políticas para MATERIAIS
CREATE POLICY "Allow public read on materiais" ON public.materiais FOR SELECT USING (true);
CREATE POLICY "Allow public insert on materiais" ON public.materiais FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on materiais" ON public.materiais FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on materiais" ON public.materiais FOR DELETE USING (true);

-- Políticas para MOVIMENTACOES
CREATE POLICY "Allow public read on movimentacoes" ON public.movimentacoes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on movimentacoes" ON public.movimentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on movimentacoes" ON public.movimentacoes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on movimentacoes" ON public.movimentacoes FOR DELETE USING (true);

-- Políticas para ATAS_REUNIAO
CREATE POLICY "Allow public read on atas_reuniao" ON public.atas_reuniao FOR SELECT USING (true);
CREATE POLICY "Allow public insert on atas_reuniao" ON public.atas_reuniao FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on atas_reuniao" ON public.atas_reuniao FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on atas_reuniao" ON public.atas_reuniao FOR DELETE USING (true);
`
      }
    };
    downloadFile(JSON.stringify(backupData, null, 2), 'backup_completo.json', 'application/json');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('Restaurar backup? ISSO SOBRESCREVERÁ TODOS OS DADOS ATUAIS.')) {
          // Backward compatibility check
          let parsed = data;
          if (data && data.tipo === "BACKUP_SISTEMA_INTEGRADO_PPM" && data.dados) {
            parsed = data.dados;
          }
          
          setMateriais(parsed.materiais || []);
          setColaboradores(parsed.colaboradores || []);
          setEmpresas(parsed.empresas || []);
          setEquipes(parsed.equipes || []);
          setFornecedores(parsed.fornecedores || []);
          setMovimentacoes(parsed.movimentacoes || []);
          setAtas(parsed.atas || []);
          setBatchState(parsed.batchState || []);
          
          if (parsed.deletionPassword !== undefined) {
             // If restored payload contains security parameters
             localStorage.setItem('ppm_deletion_password', parsed.deletionPassword);
          }
          alert('Dados restaurados com sucesso!');
        }
      } catch (err) {
        alert('Erro ao processar arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="view-container !p-0 overflow-hidden">
      <div className="scroll-container p-6">
      <h1 className="text-2xl font-bold mb-6">Configurações e Backup</h1>
      
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight mb-2">Integração Nuvem (Supabase)</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Conexão com o banco de dados remoto configurado. Suas variáveis de ambiente estão injetadas (URL + ANON_KEY).
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full tracking-wider border border-emerald-200">
            Conectado
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <button 
              onClick={async () => {
                try {
                  const results: string[] = [];
                  
                  // Test 1: Auth Session
                  const { data: authData, error: authError } = await supabase.auth.getSession();
                  if (authError) results.push(`❌ Erro Autenticação: ${authError.message}`);
                  else results.push(`✅ Autenticação: OK`);

                  // Test 2: Database Query
                  const { data: dbData, error: dbError } = await supabase.from('materiais').select('id').limit(1);
                  if (dbError) results.push(`❌ Erro Banco de Dados: ${dbError.message}`);
                  else results.push(`✅ Banco de Dados (materiais): OK (${dbData.length} registros encontrados)`);

                  alert(results.join('\n'));
                } catch (e: any) {
                  alert('💥 Falha Crítica na Integração: ' + e.message + '\n\nIsso geralmente ocorre por bloqueio de rede (CORS), URL inválida ou falta de internet.');
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 text-white font-extrabold uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl shadow-md cursor-pointer max-w-[250px]"
            >
              Testar Conexão Supabase
            </button>
            <p className="text-[10px] text-slate-400">Verifique se as credenciais do Supabase no ambiente estão operantes.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-[10px] text-slate-400 italic">O sistema sincroniza automaticamente as alterações em segundo plano.</p>
          </div>
        </div>
      </div>






      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Segurança</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1 text-[10px] uppercase font-bold text-slate-400">
              <label>Senha para Exclusão de Registros</label>
              {deletionPassword && (
                <button
                  onClick={() => setIsDeletionPasswordEnabled(!isDeletionPasswordEnabled)}
                  className={`px-2 py-0.5 rounded-full border ${isDeletionPasswordEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'} transition-colors`}
                >
                  {isDeletionPasswordEnabled ? 'Ativada (Protegendo)' : 'Desativada (Temporariamente livre)'}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field max-w-[200px]" 
                  placeholder="Definir nova senha"
                  value={deletionPassword}
                  onChange={(e) => setDeletionPassword(e.target.value)}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-500 transition-colors"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <div className="flex items-center text-[10px] text-slate-400 italic">
                {deletionPassword ? 'Senha configurada. Ela será solicitada ao excluir registros.' : 'Nenhuma senha configurada. Exclusões serão diretas.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight mb-2">Backup de Segurança & Arquitetura</h2>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">
          Gere backups seguros de todos os dados gerados no sistema. Isso inclui <strong>peças cadastradas, colaboradores, equipes, empresas parceiras, fornecedores, histórico de movimentações, atas de reuniões, gráficos e fórmulas relacionais</strong>. É recomendado baixar o arquivo JSON regulamente para salvaguardar as informações integradas do Centro de Inteligência PPM.
        </p>
        
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={exportFullBackup} 
              className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 text-white font-extrabold uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg shadow-blue-600/25 cursor-pointer flex-1 min-w-[200px]"
            >
              Backup COMPLETO (JSON)
            </button>

            <button 
              onClick={exportCSV} 
              className="bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all duration-200 text-slate-700 font-extrabold uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl border border-slate-200 cursor-pointer flex-1 min-w-[200px]"
            >
              Exportar Materiais (CSV)
            </button>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Restaurar Dados Gravados</h3>
            <p className="text-slate-500 text-[11px] mb-4">Selecione o arquivo de backup (.json) gerado anteriormente para restabelecer imediatamente todos os cadastros, equipes, saldo reativo e históricos de movimentação.</p>
            
            <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
            <button 
              onClick={() => {
                if (deletionPassword) {
                  const p = prompt("Digite a senha de autorização para restaurar o sistema:");
                  if (p !== deletionPassword) {
                    alert("Senha incorreta. Restauração cancelada.");
                    return;
                  }
                }
                fileInputRef.current?.click();
              }} 
              className="bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all duration-200 text-white font-extrabold uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg shadow-red-600/25 cursor-pointer max-w-md w-full"
            >
              Restaurar Dados do Aplicativo (JSON)
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 border-red-100 bg-red-50/20 mt-6">
        <h2 className="text-lg font-bold text-red-800 uppercase tracking-tight mb-2">Limpeza Completa</h2>
        <p className="text-slate-500 text-xs mb-4 leading-relaxed">Esta operação irá apagar permanentemente todas as movimentações, atas de reuniões, materiais cadastrados, colaboradores, empresas e equipes. <strong>Não é possível desfazer.</strong></p>
        <button 
          onClick={() => {
            if (deletionPassword) {
              const p = prompt("Digite a senha de autorização para apagar tudo:");
              if (p !== deletionPassword) {
                alert("Senha incorreta. Ação cancelada.");
                return;
              }
            }
            if (confirm("Deseja realmente apagar TODOS os dados do aplicativo? Esta ação é irreversível!")) {
              clearAllData();
              alert("Todos os dados foram excluídos com sucesso!");
            }
          }}
          className="text-xs bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
        >
          Zerar Tudo (Clique)
        </button>
      </div>
      </div>
    </div>
  );
};
