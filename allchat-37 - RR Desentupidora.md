# guardião — 37 - RR Desentupidora (Site + Hub RRD)

> Guardião de contexto obrigatório do projeto. Anexe (append) um bloco ao fim de cada fase/marco
> e atualize o nome/índice. Não sobrescreva histórico anterior.

## Contexto do projeto
- **Cliente:** RR Desentupidora (ativa — contrato assinado).
- **Produto:** Site institucional + Hub RRD (RR Gestão Inteligente 24/7).
- **PRD:** `Docs/PRD_Hub_RRD.md`.
- **Decisões:** URL `rrd.vibedocode.pro` · stack Next/Drizzle/Postgres + Coolify · projeto próprio (não clone de Hub de agência) · Hub RRD apartado do HubOMD.
- **1ª leva funcional:** CRM de clientes/leads + secretária (Sofia) gerando orçamento/recibo+garantia/laudo via WhatsApp (PDF-modelo da RR).
- **Regras:** versionamento `V[X.XX.XX]`; commit `release: Version Vx.xx.xx`; `atualizaçoes do projeto.md`; bump-version; nunca commitar credenciais.

---

## [2026-09-05] Fase A (inicio) — estrutura + versionamento + guardião
Criado o esqueleto do projeto Next.js na pasta 37 (`site/`): package com V0.1.00, bump-version.sh,
atualizaçoes do projeto.md, README, este guardião. Landing `/` e placeholder `/portal`. Pendente:
nome do repo GitHub e definição do domínio/host (Coolify) para deploy.

---

## [2026-09-05] Deploy no Coolify — site no ar
- App Hub_RRD criado no Coolify (projeto VibeDoCode/production), repo vibedocode-ia/Hub_RRD, domínio https://rrd.vibedocode.pro, build nixpacks (Next 15), V0.01.01.
- Correcao: removido `output: standalone` (conflita com `next start` no Coolify).
- DNS rrd.vibedocode.pro: registro A -> 187.77.34.1 proxied=false (sobrepoe curinga *.vibedocode.pro proxied) — site 200 direto no IP, propagado em DNS publico.
