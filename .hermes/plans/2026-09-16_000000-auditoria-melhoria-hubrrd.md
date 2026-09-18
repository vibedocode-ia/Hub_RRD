# Plano de melhoria integral do HubRRD

> **Execução:** usar lotes pequenos, checkpoints explícitos, TDD nas regras e validação E2E antes de declarar cada lote pronto.

**Objetivo:** transformar todas as telas do HubRRD em fluxos operacionais reais, rastreáveis e ensináveis pela Sofia.

**Base:** auditoria em `docs/AUDITORIA_HUBRRD_2026-09-16.md`.

## Situação consolidada após V0.12.39

### Fechado e comprovado

- V0.12.39 publicada no commit `c0e47a1d9f37df7cd8cd8b8104e481eb695cfff8`, servida pelo runtime de produção.
- Migrations `0017_stock_movements` e `0018_service_request_archive` comprovadas por suas estruturas no PostgreSQL de produção.
- Lote P0 de estoque, financeiro, arquivamento de chamados e guardas de documentos corrigido, coberto por testes/revisão e publicado.
- Sofia autenticada validada em modo consulta; `NumeroTeste` possui pessoa local técnica, permissão mínima `sofia.use` e homologação idempotente até o rascunho `PENDING_REVIEW`.

### Deliberadamente não executado

- Não emitir, anexar ou entregar PDF a partir do rascunho de homologação sem uma decisão operacional explícita.
- Não tratar a existência do rascunho como E2E completo de WhatsApp/documentos.

### Próxima prioridade recomendada

Executar P1 de forma limitada e verificável, iniciando pela matriz de navegação e CRUD operacional já documentada. Antes de iniciar um novo lote, revisar este plano, criar teste RED, implementar, validar e abrir nova release.

## Ordem dos lotes

### Lote 0 — Baseline e produção

- Fixar versão e commit auditado.
- Criar ambiente de staging ou janela controlada.
- Aplicar migrations 0014, 0015 e 0016 idempotentemente.
- Executar probes autenticados e não autenticados.
- Registrar versão servida, migrations aplicadas e saúde.
- Critério: production/staging comprovadamente serve o mesmo código do GitHub.

### Lote 1 — Contratos transversais

- Criar helpers de autorização por leitura/escrita/financeiro/documentos/Sofia.
- Padronizar respostas de erro e `correlationId`.
- Criar schemas Zod para CRM, contatos, agenda, chamados, operacional, estoque, financeiro e documentos.
- Padronizar arquivamento, auditoria e confirmação de ações destrutivas.
- Critério: cada mutação rejeita sessão ausente, papel insuficiente e payload inválido.

### Lote 2 — Navegação e E2E de menus

- Montar matriz de todos os itens de `src/app/portal/layout.tsx` e `MobileBottomNav.tsx`.
- Testar abertura, retorno, links de detalhe, query filters e breadcrumbs.
- Substituir botões visuais por links ou handlers reais.
- Eliminar agenda/indicadores de exemplo.
- Critério: todo item do menu abre uma tela real e nenhum card fica sem destino.

### Lote 3 — Dashboard

- Auditar cada KPI contra consulta fonte.
- Adicionar período e drill-down.
- Remover números hardcoded.
- Testar estado vazio, carregamento e erro.
- Critério: cada número possui consulta, período e destino verificáveis.

### Lote 4 — CRM e Contatos

- Completar busca, filtros, paginação e ordenação.
- Validar cliente/contato duplicado e vínculos.
- Criar detalhes de histórico, chamados, propostas, documentos e pagamentos.
- Testar arquivamento e restauração se aprovado.
- Critério: cadastro → detalhe → chamado/documento funciona por UI e API.

### Lote 5 — Agenda e Chamados

- CRUD de eventos com edição e cancelamento.
- Vínculo equipe, veículo, equipamento, cliente e chamado.
- Criar detalhe do evento e visão diária/semanal.
- Validar conflito de horários e timezone.
- Integrar Google sem tornar a sincronização fonte de verdade.
- Critério: evento criado aparece na agenda, no chamado e nos vínculos operacionais.

### Lote 6 — Equipes, veículos e equipamentos

- Criar detalhe de equipe e detalhe de veículo.
- Participantes com cadastro local ou referência controlada.
- Troca de líder, participantes e veículo sem apagar histórico.
- CRUD de equipamentos e checklists persistidos.
- Critério: alteração de pessoa/veículo reflete nas próximas operações sem alterar histórico passado.

### Lote 7 — Estoque

- Confirmar modelo de insumos, ferramentas e EPIs.
- CRUD, movimentação de entrada/saída, estoque mínimo e histórico.
- Associar consumo a chamado/equipe/veículo.
- Critério: saldo é derivado de movimentações, nunca de número visual editável.

### Lote 8 — Financeiro

- CRUD de contas bancárias e conta principal.
- CRUD de lançamentos com conta, cliente, chamado, documento e categoria.
- Páginas próprias de receitas, despesas, a receber, atrasados e detalhes.
- Relatórios mensal/anual e gráficos com drill-down.
- Auditoria de aprovação, baixa, estorno e arquivamento.
- Critério: cada indicador reconcilia com a lista detalhada e o período.

### Lote 9 — Propostas e Documentos

- Criação direta e edição controlada de propostas.
- Máquina de status visível e auditável.
- Vínculo cliente–chamado–serviço–documento–financeiro.
- Snapshot imutável após emissão.
- Testar preview, download, anexação e numeração comercial.
- Critério: documento emitido não muda; proposta continua rastreável.

### Lote 10 — Sofia

- Criar catálogo de comandos consultáveis e acionáveis.
- Sofia deve responder “onde”, “como”, “o que é possível” e “qual status”.
- Consultas com link para a tela detalhada.
- Ações com confirmação explícita e idempotência.
- Fluxo E2E com `NumeroTeste`: mensagem → rascunho → confirmação → emissão → anexação → entrega.
- Critério: cada capacidade documentada possui endpoint e resposta testados.

### Lote 11 — Pessoas, permissões e Google

- Matriz de papéis e permissões por rota/mutação.
- Revogação imediata e invalidação de sessões quando necessário.
- OAuth callback, revogação e falhas de sync.
- Critério: testes por papel e sem vazamento cross-Hub.

### Lote 12 — Qualidade de produção

- Playwright/E2E por página e por papel.
- smoke tests pós-deploy.
- observabilidade, logs sanitizados e alertas.
- backup/restore de banco e teste de migration.
- runbook de rollback.
- Critério: release só após checklist completo e evidência anexada.

## Arquivos prioritários

- `src/app/portal/layout.tsx`
- `src/app/portal/components/MobileBottomNav.tsx`
- `src/app/portal/dashboard/page.tsx`
- `src/app/portal/crm/**`
- `src/app/portal/contatos/**`
- `src/app/portal/agenda/**`
- `src/app/portal/chamados/**`
- `src/app/portal/operacional/**`
- `src/app/portal/estoque/**`
- `src/app/portal/financeiro/**`
- `src/app/portal/propostas/**`
- `src/app/portal/documentos/**`
- `src/app/portal/sofia-drafts/**`
- `src/app/portal/settings/**`
- `src/app/api/**`
- `src/db/schema.ts`
- `src/db/migrations/**`
- `src/lib/validation/**`
- `src/lib/require-local-permission.ts`

## Verificação obrigatória de cada lote

```text
RED: teste reproduz o comportamento esperado e falha antes da implementação
GREEN: teste focal passa
REGRESSION: suíte unitária e security passa
BUILD: npm run build passa
E2E: menu → página → ação → detalhe → retorno
DATA: banco e migration conferidos
PROD: endpoint/página testados no ambiente servido
RELEASE: version.ts, package.json, changelog, commit e push coerentes
```

## Riscos

- Deploy pode estar atrás do GitHub.
- Migrations podem divergir entre ambientes.
- Dados de exemplo podem ser confundidos com dados reais.
- Alterações de schema podem afetar Sofia e documentos.
- Google é integração externa e deve permanecer opcional.
- A exclusão física pode romper histórico; preferir arquivamento.
- Nunca usar credenciais oficiais para testes; usar somente `NumeroTeste`.
