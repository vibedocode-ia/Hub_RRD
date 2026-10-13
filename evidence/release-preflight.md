# Release governada V0.14.04 — 2026-10-13

Autorização: deploy + migration 0021 + API online criar/consultar/purgar dados sintéticos; sem UI/Sofia/HVD/bridge.

## Gates pré-publicação
- origin/main real, HEAD e imagem ativa: ccf3b18a40eb744af7f4c4bd127b4aa820dafa44.
- Coolify app 34 / zxio022y3r54f5hspr0yecad; vibedocode-ia/Hub_RRD.git; main; autodeploy=true; domínio https://rrd.vibedocode.pro; fila ativa=0.
- PostgreSQL 17.10; app e DB container com cluster identity igual.
- 21 hashes e timestamps históricos coincidem byte a byte com migrations canônicas; 0020 já aplicada; somente 0021 pendente.
- Backup privado no VPS: /root/.hermes/secure/hubrrd-release-20261013/pre-0021.dump (0600), 4378012 bytes, SHA256 035158f70ff6e0eb926d0a80d23903e43222a232398b579d624bb59877709e3e.
- Backup restaurado em clone descartável PG17. Migrator oficial/reconcile executado duas vezes; 22 entradas; coluna UUID nullable e índice presentes; conteúdo de 32 tabelas públicas preservado; clone removido.
- Produção: migrator oficial aplicado com sucesso; readback 22 entradas, hash 0021 8bdc80f31443c86aca7cf28f50d3f131d2ac03428c3d894f5514977ff8124639, coluna nullable e índice. Nenhuma migration legada reaplicada.
- Login existente com settings.manage: HTTP 200, sem reset, seed ou grants. Segredo/cookie não faz parte desta evidência.
- Manifesto source-sha256.json: todos os 20 arquivos idênticos aos testes herdados (218 unit, 226 security, 18 PostgreSQL/API). Diff revisado; chamadas parametrizadas, geração sintética server-side e purga fail-closed preservadas.

## Rollback
Reverter somente o commit de aplicação para o baseline ccf3b18 via release forward-only e Coolify. Preservar coluna test_run_id, índice e journal 0021. Não restaurar backup em produção nem remover coluna/auditoria como rollback automático. Nenhum rollback executado.

## Estado
Migration aplicada; publicação/deploy/E2E ainda pendentes no momento deste checkpoint. Resultado final ficará em production-online.json / release-result.json (evidências sanitizadas locais).
