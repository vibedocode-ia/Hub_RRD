# Release V0.15.00 — acesso integrado HVD/HubRRD

## Escopo e prova
Pacote cumulativo preserva etapas 1–6. Base RR `1014673daf2c5446aa3d3401557fb76fb1b4d893`; pacote técnico E10 SHA-256 `e36da8bfbcb65d4e75dcf11972828313f48e42cedbb8210a72958dc167e9ac63`. Aplicação em árvore limpa conferida pelo supervisor, tree anterior ao bump `77428f026d36f0a071c76a5a6aab17d5e85e573f`. Typecheck e build finais aprovados; logs em scratch/e10-compile-gate/rrd. Depois desse aceite, somente metadados de versão e este runbook mudaram.

## Publicação
1. Backup completo privado dos bancos, restauração em clones isolados e ensaio dos SQLs exatos.
2. Aplicar `docs/migrations/stage6-e06-central-document-authorship.sql` no RR. A migração é transacional, não reexecutável e não está no journal Drizzle. Necessária inclusive com Access V1 OFF. Conferir colunas/constraint após aplicação.
3. Aplicar migrations Access V1 na ordem e hashes de `src/lib/access-v1/migrations/manifest.json` com journal separado; preservar journal Drizzle. O helper `migrateDisposable` não é runner de produção.
4. Publicar RR antes do HVD, mantendo Access V1 OFF durante o rollout. O startup Drizzle não substitui os SQLs anteriores.
5. Confirmar versão/SHA efetivamente carregados e operação autenticada; depois habilitar o piloto somente com configuração/credenciais/transporte instalados e backup.

## Limites e rollback
Build, prova local e publicação não equivalem a migração piloto nem homologação WhatsApp. E05 precisa de instalação/recarga do consumidor e prova de PDF/entrega real. Backups ficam privados fora de Git. As alterações de schema são aditivas; em falha de app, retornar à versão anterior sem remover tabelas/dados. Restore de backup não deve sobrescrever negócios ocorridos após a captura sem análise explícita. Não recriar usuários ou vínculos para esconder pendências de migração.
