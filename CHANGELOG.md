# Changelog

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
