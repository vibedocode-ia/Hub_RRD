# Changelog

## V0.12.43 — 2026-09-18

### Fixed
- Vincula cada complemento conversacional da Sofia a um rascunho documental opaco e específico da conversa, sem seleção por telefone ou heurística.
- Revalida no HubRRD o rascunho, pessoa, Hub, papel e estado de coleta antes de qualquer atualização.
- Uniformiza CPF/CNPJ válido e tipo PF/PJ derivado na cadeia Sofia, CRM e emissão.
- Impede que atualizações genéricas alterem entrega documental; somente a rota protegida de entrega pode marcar um documento como enviado.

### Verification
- 72 testes unitários, 80 testes de segurança, TypeScript, build e `git diff --check` aprovados.

## V0.12.42 — 2026-09-18

### Fixed
- Fecha a ponte operacional de Contatos para CRM: contatos vinculados passam a oferecer atalho explícito para a ficha do cliente.
- Protege as fichas CRM de consulta e edição com `crm.read` antes de qualquer leitura de banco, impedindo acesso direto por sessão sem permissão.

### Verification
- TDD RED→GREEN para navegação condicional Contato → CRM e para guards de acesso nas duas rotas CRM.
- Revisão independente aprovada após correção de autorização.
- 68 testes unitários, 76 testes de segurança, typecheck, build e `git diff --check` aprovados.

## V0.12.41 — 2026-09-18

### Added
- Completa a operação de Contatos no portal com edição e arquivamento lógico acessíveis por cada card.
- Reutiliza os contratos autenticados existentes de criação, atualização e arquivamento, atualizando a lista somente após resposta bem-sucedida.
- Exibe confirmação explícita antes de arquivar e esclarece que o histórico é preservado.
- Trata falhas HTTP e de transporte sem travar o formulário, restaurando controles e mostrando feedback ao operador.

### Verification
- TDD RED→GREEN para ações de edição, arquivamento e recuperação de falha de transporte.
- Revisão independente aprovada.
- 65 testes unitários, 73 testes de segurança, typecheck, build e `git diff --check` aprovados.

## V0.12.40 — 2026-09-18

### Fixed
- Torna o Catálogo de Serviços acessível também pela sidebar desktop, preservando paridade com a navegação principal mobile.
- Adiciona contrato de navegação que exige a rota `/portal/servicos` nos arrays efetivamente renderizados no desktop e no mobile.
- Expõe `npm run test:unit` como comando padrão para toda a suíte de contratos unitários.

### Verification
- TDD observado: o contrato falhou antes da correção da sidebar e antes da criação do comando padrão de testes.
- Revisão independente aprovada.
- 63 testes unitários, 70 testes de segurança, typecheck, build e `git diff --check` aprovados.

## V0.12.39 — 2026-09-16

### Fixed
- Fecha invariantes P0 de estoque: quantidade normalizada em saldo, ledger e auditoria; histórico persistido e saída atômica inclusive via Sofia.
- Fecha invariantes P0 financeiros: datas de calendário válidas, previsão e recebíveis incluem títulos atrasados no Portal, Dashboard e Sofia.
- Torna arquivamento de chamados preservador e idempotente; bloqueia edição, emissão e mutação de documentos vinculados a chamados arquivados, inclusive pela Sofia.
- Remove movimentações fictícias da tela de Estoque e exibe histórico persistido.

### Database
- Adiciona migrations `0017_stock_movements` e `0018_service_request_archive` ao journal Drizzle.

### Verification
- Revisões independentes Terra aprovadas após correções.
- 61 testes de regressão, 69 testes de segurança, typecheck, build e `git diff --check` aprovados localmente.
- Validação da migration com banco real permanece gate de produção; não foi simulada sem conexão autorizada.

## V0.12.38 — 2026-09-16

### Added
- Implementa CRUD ativo de equipes com nome obrigatório, líder, participantes, telefone, descrição e arquivamento seguro.
- Implementa CRUD ativo de veículos/frotas com tipo, placa, descrição, observações, equipe vinculada e arquivamento seguro.
- Adiciona vínculo equipe-veículo com limpeza segura ao arquivar equipe.
- Adiciona seleção de equipe e veículo na criação de eventos da Agenda.
- Permite manter histórico operacional sem exclusão física dos cadastros.

### Verification
- Typecheck, testes de autorização operacional, build e `git diff --check` aprovados.

## V0.12.37 — 2026-09-16

### Added
- Adiciona seletor de período por mês e ano no Financeiro.
- Calcula receitas, despesas, saldo, previsão e atrasados no período selecionado.
- Separa Receita Anual como acumulado do ano selecionado.
- Preserva mês/ano nos links dos cards, blocos e listas.
- Torna entradas, saídas, saldo, movimentações e documentos navegáveis.

### Verification
- Typecheck, build e `git diff --check` aprovados.

## V0.12.36 — 2026-09-16

### Added
- Adiciona seletor de período por mês e ano no Financeiro.
- Corrige receitas, despesas, saldo, previsão e atrasados para respeitarem o mês/ano selecionado.
- Calcula Receita Anual pelo acumulado do ano selecionado, separado do resultado mensal.
- Carrega histórico financeiro suficiente para os cálculos temporais.
- Propaga o período selecionado aos links dos cards e listas.
- Torna os blocos de entradas, saídas, saldo e movimentações recentes navegáveis.
- Adiciona visão anual via `visao=ANO`.

### Verification
- Typecheck, testes focais, build e `git diff --check` aprovados.

## V0.12.35 — 2026-09-16

### Added
- Cria cadastro persistido de contas bancárias da empresa com banco, agência, conta, Pix, cartão e conta principal.
- Adiciona `/portal/financeiro/contas` e API autenticada de contas.
- Transforma indicadores financeiros em links vivos para as visões filtradas correspondentes.
- Transforma movimentações recentes em navegação para tipo/status.
- Transforma emissões recentes em acesso direto ao preview oficial.
- Adiciona filtro de status financeiro na página do Financeiro.

### UX rule
- Cards, indicadores, gráficos, blocos e ações do HubRRD devem conduzir a uma tela, filtro, detalhe ou ação real; nenhum elemento deve ser apenas decorativo.

### Verification
- Typecheck, testes focais, build e `git diff --check` aprovados.

## V0.12.33 — 2026-09-16

### Added
- Pipeline comercial persistido para propostas, com transições auditáveis e vínculo a documentos emitidos.
- API autenticada `/api/proposals` para consultar, criar e atualizar status de propostas.
- Tela de Propostas conectada aos dados persistidos, com aprovação e recusa controladas.
- Emissão de orçamento passa a criar a proposta comercial correspondente em `SENT`.
- Migration `0014_proposals.sql` para produção.

### Verification
- Typecheck aprovado.
- Testes focais aprovados.
- Build de produção aprovado.
- `git diff --check` aprovado.
- Deploy pendente de acionamento do Coolify: rota nova ainda retornou 404 no probe pós-push.

## V0.12.32 — 2026-09-16

### Added
- Cria entidade persistida `proposals` para o pipeline comercial do HubRRD.
- Adiciona estados DRAFT, SENT, NEGOTIATION, APPROVED, REJECTED, EXPIRED, CANCELLED e NOT_COUNTED.
- Adiciona API autenticada de criação, consulta e transição de propostas.
- Registra mudanças de status em auditoria local sanitizada.
- Liga a emissão de ORCAMENTO/ORCAMENTO_TECNICO à criação automática de proposta enviada.
- Conecta propostas a cliente, chamado e documento oficial, preservando o snapshot documental.
- Substitui a visão estática de propostas por dados persistidos e ações de aprovação/recusa.

### Verification
- Typecheck, testes focais, build e `git diff --check` aprovados.

## V0.12.31 — 2026-09-15

### Added
- Evolui Contatos para cards operacionais com indicadores, busca, filtros e cadastro.
- Evolui o Catálogo de Serviços com indicadores de emergência, avaliação, preço configurado, garantia e cards operacionais.
- Adiciona a rota Propostas com visão dos orçamentos emitidos e acesso ao PDF.
- Adiciona indicadores financeiros inspirados no painel VibeDoCode: saldo, receitas, despesas, a receber, atraso, previsão, receita anual e resultado.
- Inclui Propostas na navegação desktop e mobile.

### Notes
- Os estados comerciais completos de proposta (aprovada, recusada, expirada e não contabilizar) permanecem pendentes de entidade própria e não são inferidos de documentos emitidos.

### Verification
- Typecheck aprovado.
- Testes focais aprovados.
- Build de produção aprovado.
- `git diff --check` aprovado.

## V0.12.30 — 2026-09-15

### Added
- O bloco de usuário no canto superior direito agora abre explicitamente a edição do próprio perfil, com sinal visual, tooltip e acessibilidade por teclado.
- A seção **Segurança** fica diretamente no painel pessoal, com troca de senha protegida por senha atual e encerramento das sessões.

### Verification
- Testes de segurança, TypeScript e build aprovados.

## V0.12.29 — 2026-09-15

### Added
- Adiciona o botão **Emitir Orçamento Técnico** à fila de rascunhos da Sofia, conectado ao tipo `ORCAMENTO_TECNICO`.

### Verification
- Typecheck, build e testes focais aprovados antes do deploy.

## V0.12.28 — 2026-09-15

### Added
- Adiciona o modelo canônico **Orçamento Técnico** baseado no PDF fornecido pela RR Desentupidora.
- Preserva a fonte PDF de referência e cria renderer separado em duas páginas, sem substituir o modelo de orçamento existente.
- Inclui contratante, contratada, CNPJs, endereço da obra, objeto, escopo, responsabilidade, valor por extenso, condições comerciais, garantia e assinaturas.
- Expõe `ORCAMENTO_TECNICO` na biblioteca de modelos, no renderer, na emissão e na listagem de documentos.

### Verification
- 7/7 testes focais aprovados.
- Typecheck, build de produção e `git diff --check` aprovados.

## V0.12.24 — 2026-09-15

### Fixed
- A criação local em Pessoas e Acessos RRD aceita e persiste o status `isActive` explicitamente selecionado, tanto ativo quanto inativo.
- O contrato de criação permanece estrito e rejeita campos desconhecidos; status omitido é rejeitado em vez de assumir estado silenciosamente.

### Security
- A mudança permanece limitada a `users` e às permissões locais allowlisted; não cria nem altera Hub, grants da Central Sofia, acesso WhatsApp ou permissões fora do papel permitido.

### Verification
- Regressões focais, suíte de segurança (38/38), typecheck, build e `git diff --check` aprovados localmente.

## V0.12.23 — 2026-09-14

### Fixed
- Remove a exigência de cadastro/permissão local duplicada para ações Sofia autenticadas pela Central no Hub RRD. O contrato Central → RRD continua fail-closed: Bearer server-to-server, Hub central fixo, chave de idempotência, payload tipado e papel autorizado continuam obrigatórios.
- Mantém o cadastro local opcional e restrito ao login e às operações do portal RRD; ele não cria, amplia nem revoga grants da Central Sofia.
- Exibe no formulário de pessoas o campo e a causa da validação rejeitada pela API, em vez da mensagem genérica `Dados de pessoa inválidos.`.

### Verification
- 37/37 testes de segurança e regressão aprovados.
- Typecheck e build de produção aprovados.

## V0.12.22 — 2026-09-14

### Fixed
- Corrige o erro `Dados de perfil inválidos` causado pelo envio de campos internos não aceitos pela API.

### Added
- Permite escolher a foto diretamente pelo dispositivo, com preview e remoção.
- Aceita imagens JPG, PNG e WebP de até 2 MB, sem depender de colar URL.

### Verification
- 3 testes de perfil aprovados.
- Typecheck aprovado.
- Build de produção aprovado com `/portal/perfil` e `/api/profile`.

## V0.12.21 — 2026-09-14

### Changed
- Evolui Meu perfil do Hub RRD para uma experiência completa de identidade pessoal e profissional.
- Adiciona resumo visual com avatar/foto, iniciais, cargo e contexto do Hub.
- Adiciona empresa, WhatsApp, cidade, estado, Instagram, website e observações pessoais.
- Adiciona validação server-side de telefone, e-mail e URLs seguras.
- Registra alterações de perfil em auditoria local sem expor dados sensíveis.

### Verification
- 17 testes automatizados aprovados.
- Typecheck aprovado após limpeza dos artefatos antigos do Next.js.
- Build de produção aprovado com 27 páginas e `/portal/perfil`.

## V0.12.07 — 2026-09-12

### Added
- Evolui Clientes para CRM operacional: carteira filtrável, cards acionáveis, período, busca e métricas derivadas de serviços e financeiro vinculados.
- Adiciona campos editáveis de relacionamento: recorrência, origem, cliente desde, último contato, próxima visita e observações.
- Vincula lançamentos financeiros opcionalmente ao cliente para calcular total pago, pendências, último pagamento e LTV sem dados duplicados.
- Registra a operação semântica `get_client_profile` para ficha CRM completa autorizada via Sofia, com busca por nome ou ID, e atualização fechada dos campos CRM.

### Security
- Consulta completa CRM permanece restrita à identidade autorizada, Hub RRD e campos contratados; logs de evento persistem apenas ação e nomes de campos, sem PII.
- Contexto Sofia por chat direto expira em 24 horas e armazena somente coordenadas de autorização.

### Verification
- Migration Drizzle `0008_uneven_rachel_grey` aplicada em produção e schema verificado.
- Typecheck, testes CRM/Sofia e build de produção aprovados.


## V0.10.14 — 2026-09-11

### Changed
- Reorganiza configurações em hub com menu superior para Sofia, Acessos, Equipes, Frotas e Equipamentos.
- Separa a configuração da Sofia em página própria, sem misturar seus controles com usuários locais.
- Agrupa o menu principal em Visão geral, Operação, Gestão, Sofia e Sistema.
- Expõe Clientes/CRM, Chamados, Equipes/Frotas, Estoque, Financeiro, Documentos e Configurações na navegação.
- Amplia o menu mobile com os módulos operacionais no submenu Mais.

### Verification
- Typecheck aprovado.
- 13 testes automatizados aprovados.
- Build de produção aprovado com as rotas `/portal/settings/sofia` e `/portal/settings/pessoas`.

## V0.10.13 — 2026-09-11

### Fixed
- Reconcilia histórico legado do Drizzle quando migrations antigas já foram aplicadas manualmente no banco RRD sem registro no journal.
- Evita loop de reinício do container na inicialização de produção.

### Verification
- Fluxo completo testado em cópia do banco produtivo dentro da rede Coolify: reconciliação + `drizzle-kit migrate` concluídos.
- Typecheck, 13 testes e build de produção aprovados.

## V0.10.12 — 2026-09-11

### Added
- Painel local de Pessoas e Acessos do Hub RRD, com papéis locais, permissões granulares, auditoria e revogação de sessão por desativação ou troca de senha.
- Enforcement server-side nas mutações de CRM, chamados, documentos, estoque, financeiro, equipes, serviços e configurações.
- Entrada de produção que executa migrations Drizzle antes de iniciar o Next.js.

### Security
- Usuários administrativos do Hub RRD permanecem locais; a Central Sofia não é copiada para a tabela `users`.
- Login usa resposta uniforme para credenciais inválidas.
- Migrations idempotentes para permissões e remoção de colunas de identidade Central indevidas.

### Verification
- Typecheck e 13 testes aprovados.
- Build de produção aprovado.
- `drizzle-kit migrate` executado com sucesso contra banco descartável dentro da rede Coolify: 7 migrations, 2 colunas de usuário e 3 tabelas requeridas verificadas.

## V0.10.10 — 2026-09-11

### Fixed
- Corrige a divergência entre o release do Hub RRD e seu schema PostgreSQL: adiciona migration idempotente para `financeiro_lancamentos`, `insumos` e `sofia_drafts`.
- O dashboard trata respostas HTTP de erro da API BI sem disparar exceção client-side.

### Verification
- Migration executada duas vezes contra cópia isolada do schema existente: ambas concluíram sem erro.
- `npm run build` aprovado.
