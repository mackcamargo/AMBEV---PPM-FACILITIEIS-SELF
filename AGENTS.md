# Regras de Negócio e Diretrizes de Geração de Código

## Sincronização e Fonte Única de Verdade (Supabase)

1. **Supabase como Fonte de Verdade Absoluta**:
   O banco de dados Supabase é a única e exclusiva fonte de verdade para equipes, materiais, colaboradores, movimentações, atas, fornecedores e empresas.
   
2. **Sem Mesclagem com Dados Hardcoded (Evitar Regressão de Duplicação)**:
   - No arquivo `src/lib/store.tsx`, em qualquer função de sincronização como `loadFromSupabase` ou `refreshData`, a função utilitária `mergeWithSupabase` deve definir o estado do React DIRETAMENTE com os dados recebidos do Supabase, isto é, usando `setFn(supabaseData)`.
   - **NUNCA** faça mesclagem (`merge`) ou concatenação dos dados vindos do Supabase com estados locais pré-existentes ou com constantes hardcoded (como `INITIAL_EQUIPES`, `INITIAL_COLABORADORES`, etc.) ao carregar os dados. Isso causa duplicação de itens na interface uma vez que os IDs gerados diferem.
   - Os arrays com prefixo `INITIAL_*` devem agir apenas como estado de fallback inicial para o React antes do carregamento do Supabase, nunca sendo mesclados após a consulta ao banco de dados.

## Título do Aplicativo
- O título da aba do navegador definido em `index.html` deve ser sempre: "AmBev - PPM Facilities - Centro de Inteligência"
- Nunca substituir por títulos genéricos como "My Google AI Studio App"
