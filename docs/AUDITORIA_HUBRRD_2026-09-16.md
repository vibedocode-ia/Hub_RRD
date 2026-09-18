# Auditoria integral do HubRRD

Data: 16/09/2026
Repositório auditado: `Hub_RRD`
Commit auditado: `45f010c66ec7dbb4eaff0d73af999ee8d0a7e9f6`
Escopo: menus, páginas, APIs, banco, permissões, integrações, testes e produção.

## 1. Resumo executivo

O HubRRD possui uma fundação funcional: autenticação de portal, CRM, contatos, agenda, chamados, documentos, propostas, financeiro, Sofia, perfil, pessoas, Google, estoque e operacional. O typecheck, o build, 60 testes de segurança e 52 testes unitários passaram no checkout auditado.

Isso não equivale a dizer que todos os fluxos estão prontos. A auditoria encontrou diferença entre estrutura visual, persistência e operação E2E. As maiores prioridades são remover dados exemplificativos, completar CRUDs e detalhes, proteger mutações com validação uniforme, aplicar migrations no Coolify e criar uma matriz E2E de todas as páginas.

## 2. Evidências executadas

- `npx tsc --noEmit --pretty false`: PASS.
- `npm run build`: PASS; rotas dinâmicas foram geradas.
- `npm run test:security`: PASS, 60 testes.
- `npx tsx --test src/lib/__tests__/*.test.ts`: PASS, 52 testes.
- `git diff --check`: PASS.
- Produção sem sessão: `/portal/dashboard`, `/portal/operacional` e `/portal/agenda` redirecionaram para login; comportamento esperado.
- Produção sem autenticação: `/api/v1/health` respondeu 401; `/api/operacional/equipes` e `/api/operacional/veiculos` responderam 403. Não foi feita mutação nem uso de credenciais.

## 3. Matriz página por página

| Menu / rota | Estado observado | Risco / ajuste |
|---|---|---|
| Dashboard `/portal/dashboard` | Indicadores e atalhos existem; depende de BI e dados reais | Verificar cada card contra endpoint e período; retirar qualquer KPI sem origem; E2E de clique e estado vazio |
| CRM `/portal/crm` | Lista e criação existem | Confirmar busca, filtros, paginação, arquivamento e links para detalhe |
| CRM detalhe `/portal/crm/:id` | Perfil, edição, chamados e documentos relacionados | Testar cliente inexistente, vínculos vazios e consistência de permissões |
| CRM novo/editar | Formulários ricos e API | Criar testes E2E de validação, duplicidade e endereço principal |
| Contatos `/portal/contatos` | Cards, filtros e cadastro client-side | Há TODOs e vários controles; confirmar que todos persistem e que cada card navega |
| Agenda `/portal/agenda` | Criação local; equipe e veículo agora podem ser selecionados | Falta edição visual completa na mesma tela, detalhe, cancelamento acessível e vínculo com chamado verificado E2E |
| Chamados `/portal/chamados` | Lista, criação e edição | Validar mudança de status, equipe/veículo/equipamento, anexos, cliente e detalhe; remover mensagens de exemplo |
| Equipes/Frotas `/portal/operacional` | CRUD de equipes/veículos no código; arquivamento seguro | Aplicar migration em produção; adicionar detalhe, restauração se necessária, confirmação não bloqueante e E2E |
| Estoque `/portal/estoque` | Página compacta e API de insumos | Verificar se é realmente CRUD; a auditoria encontrou forte diferença entre domínio esperado e UI disponível |
| Propostas `/portal/propostas` | Pipeline persistido e ações de status | Confirmar criação direta, filtros, transições, vínculos e API em produção; 404 anterior exige probe pós-deploy |
| Financeiro `/portal/financeiro` | Indicadores, período e links vivos no código | Criar páginas de detalhe de receitas/despesas/atrasados; conferir datas/timezone e origem de cada KPI |
| Contas `/portal/financeiro/contas` | CRUD iniciado no código | Aplicar migration, testar conta padrão, associação ao lançamento e exclusão segura |
| Documentos `/portal/documentos` | Lista e preview | Emissão deve bloquear dados obrigatórios; testar imutabilidade, download/anexação e links de origem |
| Preview `/portal/documentos/preview/:id` | Visualização de documento | Verificar documento inexistente, snapshot, impressão, download e ausência de mutações indevidas |
| Rascunhos Sofia `/portal/sofia-drafts` | Fila e ações de emissão | Fluxo WhatsApp → rascunho → confirmação → PDF → entrega ainda não comprovado E2E |
| Meu perfil `/portal/perfil` | Perfil local editável | Testar limite de imagem, URL, remoção, preview e isolamento local |
| Configurações `/portal/settings` | Hub de links | Cards devem abrir telas funcionais; validar visibilidade por papel |
| Pessoas `/portal/settings/pessoas` | CRUD e permissões locais | Validar default-deny, revogação, sessão antiga e confirmação de ações críticas |
| Sofia `/portal/settings/sofia` | Perfis/contexto | Verificar edição real, versionamento, escopo de dados e auditoria |
| Google `/portal/settings/google` | OAuth/configuração | Testar estado sem conexão, callback inválido, revogação e sync sem duplicidade |
| Recuperação `/recuperar-acesso` | Fluxo público de senha | Testar expiração, uso único, rate limit e não enumeração |

## 4. Achados prioritários

### P0 — bloquear release

1. **Produção não validada após os releases recentes.** O código local está à frente do container em evidências anteriores. Fazer redeploy e aplicar migrations 0014–0016; validar endpoints autenticados com conta de teste autorizada.
2. **Fluxo Sofia → PDF → entrega não comprovado E2E.** Não declarar pronto sem recebimento, confirmação, emissão, anexação e entrega no canal.
3. **Dados mock/exemplificativos em operação.** A tela operacional contém agenda de exemplo e indicadores fixos no histórico auditado. Toda informação deve vir do banco ou aparecer explicitamente como estado vazio.
4. **Migrações de produção.** `0015_company_accounts.sql` e `0016_operational_crud.sql` precisam de execução idempotente, registro e probe pós-migration.

### P1 — alta

1. Completar CRUD e páginas de detalhe de contas, receitas, despesas, estoque, agenda, equipes e veículos.
2. Uniformizar schemas Zod para todas as APIs mutáveis; limitar tamanho, normalizar texto e validar UUID/status/transições.
3. Garantir que cada card, gráfico, botão e linha tenha destino/efeito real; eliminar `button` sem handler e `alert` usado como navegação.
4. Associar lançamentos financeiros a conta bancária, chamado, cliente e documento com auditoria.
5. Implementar edição/cancelamento de agenda com equipe, veículo e chamado preservados.
6. Adicionar auditoria estruturada para alterações críticas e exclusões lógicas.

### P2 — média

1. Paginação, busca, filtros e ordenação server-side nas listas grandes.
2. Estados loading/error/empty consistentes e mensagens sem dados fictícios.
3. Acessibilidade: labels, foco de modal, teclado, `aria` e contraste.
4. Timezone explícito para agenda e financeiro.
5. Observabilidade sanitizada: correlationId, métricas de erro e saúde de migrations.
6. Testes E2E por papel: owner, admin, operator, financeiro, leitura e Sofia.

### P3 — evolução

1. BI de produtividade por equipe/serviço/veículo.
2. checklists persistidos e manutenção de frota.
3. anexos, fotos, assinaturas e laudo em campo.
4. notificações e lembretes.
5. offline/mobile para equipe de campo.

## 5. Alertas de qualidade encontrados por inspeção estática

- Controles `alert`, `confirm`, `TODO`, `mock`, `Exemplo` e estados vazios existem em componentes e precisam ser classificados: legítimo, provisório ou defeito.
- O endpoint de Agenda agora aceita equipe/veículo, mas a tela ainda precisa de edição detalhada e teste de vínculo com chamado.
- O endpoint de frotas/equipes usa arquivamento, não exclusão física; isso é correto para preservar histórico, mas a UI deve chamar de Arquivar e explicar restauração/irreversibilidade.
- O formato compacto de algumas páginas reduz legibilidade e dificulta revisão; refatorar antes de ampliar regras.

## 7. Achados adicionais confirmados por auditoria independente

### Interface e produto

- Serviços existe em `/portal/servicos`, mas não aparece na sidebar desktop (`src/app/portal/layout.tsx`).
- Estoque exibe movimentações explicitamente mockadas em `src/components/portal/estoque-client.tsx`; “Ver Todo Histórico” não possui ação.
- Contatos possui criação, busca e filtro, mas não possui edição, arquivamento ou detalhe completo.
- Agenda cria e lista eventos, mas não expõe edição, cancelamento e detalhe na UI.
- Chamados lista todos os status com texto de “abertos”, não oferece filtros suficientes e o `clientId` recebido pela URL de Novo Chamado não é consumido.
- Propostas não possuem criação/edição direta, busca/paginação ou detalhe completo.
- Contas bancárias possuem criação, mas não edição, arquivamento ou garantia de única conta primária.
- Catálogo de serviços tem campo de busca sem filtro implementado e defaults inseridos durante carregamento GET.
- Rascunhos Sofia tratam chamados como rascunhos sem filtrar adequadamente evento/intenção e não oferecem revisão/rejeição completa.

### Segurança e dados

- Login sem rate limit/bloqueio progressivo em `src/app/api/auth/login/route.ts`.
- Fallback por senha de ambiente precisa ficar estritamente isolado de qualquer ambiente exposto.
- `/api/sofia/actions` deve verificar autorização local além do segredo e confirmar pertencimento de identidades ao Hub.
- Callback Google deve usar o `userId` do state, em vez da integração global mais recente.
- Payloads Sofia podem armazenar PII integral em `rawPayload`; auditoria precisa ser sanitizada.
- Cadeia Drizzle declara 17 migrations, mas snapshots em `src/db/migrations/meta/` estão incompletos.
- Reconciliação de migrations não deve fabricar histórico apenas pela existência de tabelas.
- Inicialização de produção executa migration automaticamente sem gate explícito de backup/saúde.
- Lançamentos financeiros aceitam valores/status/datas sem schema fechado e não geram auditoria.
- Contas financeiras não garantem única conta principal.
- Estoque aceita `NaN`, `Infinity`, negativos ilimitados e saldo abaixo de zero no endpoint direto.
- Chamados aceitam enums/valores sem validação completa e possuem exclusão física sem transação/auditoria.
- Criação/edição CRM, Sofia, documentos/propostas e cliente/endereço precisam de transações quando a operação envolve múltiplas entidades.
- Emissão documental usa aleatoriedade para número e pode deixar entidades parcialmente criadas.

### Testes e entrega

- Não há script geral `npm test`/`test:unit`/`test:integration`.
- A suíte atual é forte em contratos e segurança estática, mas não substitui testes reais HTTP/PostgreSQL.
- Faltam testes de concorrência, rollback, conflitos de agenda, invariantes financeiras/estoque, OAuth multiusuário, rate limit e isolamento de tenant.
- `package.json` declara Next `^16.3.5`, enquanto o build auditado reportou Next `15.5.25`; reconciliar lockfile e runtime.


## 5.1. Adendo pós-release — V0.12.39 (17/09/2026)

> Este adendo registra evidências posteriores ao commit originalmente auditado. Ele não reescreve o histórico dos achados; diferencia o que foi corrigido/publicado do que continua pendente.

### P0 fechado nesta release

- **Estoque:** `stock_movements` passou a existir como ledger persistido; ajustes usam quantidade normalizada, transação e bloqueio de saldo negativo nos caminhos portal, API e Sofia.
- **Financeiro:** datas de calendário, valores positivos e status foram unificados; realizado, pendente e atrasado têm semântica consistente no portal, dashboard e Sofia.
- **Arquivamento de chamado:** chamados são arquivados com preservação de histórico, condição idempotente e auditoria; listagens operacionais excluem registros arquivados.
- **Documentos vinculados:** edição/arquivamento por API direta e Sofia exigem, na própria mutação, que o chamado vinculado permaneça ativo; emissão em chamado arquivado é bloqueada.

### Evidência publicada e de runtime

- Release publicada: `V0.12.39`, commit `c0e47a1d9f37df7cd8cd8b8104e481eb695cfff8`.
- O primeiro build falhou ao exportar layers por cancelamento transitório do BuildKit; o rebuild forçado posterior concluiu o rollout.
- Produção respondeu HTTP 200 no domínio público e serviu `V0.12.39`.
- O container ativo foi confirmado na imagem do commit V0.12.39.
- PostgreSQL de produção contém `stock_movements`, `service_requests.archived_at` e `service_requests.archived_by_id`, comprovando os efeitos das migrations `0017` e `0018`.
- Sofia autenticada em produção respondeu ação somente leitura de resumo financeiro na versão V0.12.39.
- Homologação controlada com `NumeroTeste` foi persistida como rascunho `PENDING_REVIEW`; o replay com a mesma correlation ID foi idempotente. Não houve emissão, PDF, anexação, envio ou entrega.

### Limites ainda abertos

- Não havia, na verificação, chamados/documentos arquivados preexistentes para provar a guarda correspondente com dado real de produção; a regra tem cobertura local e revisão independente, mas não essa prova de runtime específica.
- O fluxo completo `mensagem WhatsApp → revisão humana → confirmação → emissão → PDF → anexação → entrega` continua **não validado E2E**. A homologação parou deliberadamente no rascunho pendente de revisão.
- Os achados P1/P2 desta auditoria permanecem no plano; V0.12.39 não deve ser interpretada como conclusão integral de CRUDs, navegação, Google ou documentação operacional.

## 6. Critério de conclusão da auditoria de correções

Uma frente só pode ser marcada concluída quando houver:

1. teste unitário/regressão da regra;
2. teste de API autenticado e não autenticado;
3. teste de UI navegando do menu/card até detalhe;
4. migration aplicada em staging/prod com evidência;
5. estado vazio, erro e loading verificados;
6. logs/auditoria sanitizados;
7. build, testes e diff limpo;
8. versão, changelog, commit e probe de produção.
