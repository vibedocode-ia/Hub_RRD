# Changelog

## V0.10.10 — 2026-09-11

### Fixed
- Corrige a divergência entre o release do Hub RRD e seu schema PostgreSQL: adiciona migration idempotente para `financeiro_lancamentos`, `insumos` e `sofia_drafts`.
- O dashboard trata respostas HTTP de erro da API BI sem disparar exceção client-side.

### Verification
- Migration executada duas vezes contra cópia isolada do schema existente: ambas concluíram sem erro.
- `npm run build` aprovado.
