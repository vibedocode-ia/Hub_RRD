# Changelog

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
