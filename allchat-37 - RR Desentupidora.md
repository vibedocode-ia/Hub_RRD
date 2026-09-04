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

---

## [2026-09-05] V0.02.01 — site institucional premium no ar
- Home reescrita em padrao premium (dark navy/cian, glass, gradientes, grid, framer-motion+scrool reveal, barra de progresso), seguindo o SistemaRRProposal (Sistema OMD / 04). Assets reais da RR (rr-logo, hero).
- Deps adicionadas: framer-motion, gsap, lucide-react. Portal /portal mantido (gate de senha).
- Deploy: Coolify, repo vibedocode-ia/Hub_RRD, https://rrd.vibedocode.pro (V0.02.01). Container OK 200; DNS propagado.

---

## Sessão 2026-09-04 — Efeito UAU: /vc-spec → /vc-break → /vc-auto

### Resumo
Ciclo completo VibeDoCode Fase 1→4 executado na mesma sessão:
- `/vc-spec` → gerou `site/references/spec.md` (2 páginas, 28 componentes, 38 behaviors)
- `/vc-break` → gerou 15 tasks atômicas em `site/tasks/001–015`
- `/vc-auto` → executou todas as 15 tasks, buildou e validou

### O que foi implementado
- **globals.css:** Design System premium completo (navy/cyan/royal, glassmorphism, animações CSS)
- **layout.tsx:** Google Fonts (Outfit + Plus Jakarta Sans) + SEO/OG metadata completo
- **page.tsx:** Landing page "Efeito UAU" com Hero, Services, Differentials+Selos, Reviews, Areas, Widget Orçamento → WhatsApp dinâmico, CTA Final, Footer, FloatingWhatsApp, Header com drawer mobile e ProgressBar de leitura
- **PortalGate.tsx:** Redesign executivo com rate limiting (3 tentativas, 30s lockout), shake animation, show/hide senha, estados idle/error/success animados
- **version.ts:** V0.02.01 → V0.03.00
- **site/.env.example:** Criado
- **Build:** `✓ Compiled 0 errors — Static /  + /portal`

### Decisões
- `Home` ícone Lucide conflitou com export `Home` → renomeado para `HomeIcon`
- Rota `/portal` mantida discreta no header (ghost button, sem destaque de marketing)
- Widget de orçamento monta mensagem WhatsApp personalizada com serviço + local + urgência
- Portal Gate usa `NEXT_PUBLIC_DEMO_HUB_PASS` (MVP visual) — migrar para Server Action na fase Hub

### Próximo passo
- Commit: `release: Version V0.03.00`
- Deploy via Coolify push para `rrd.vibedocode.pro`
- Adicionar `public/assets/rr-logo.webp` e `public/assets/hero.png` reais

### Versão
V0.03.00 · 2026-09-04

---

## Sessão 2026-09-04 — Assets Visuais High-Res & Deploy Pronto (V0.03.01)

### Resumo
- **Logo 3D em Alta Resolução:** Monograma `RR` com gradientes azul cyan (#10acf0) e royal (#1918eb) sobre fundo dark navy (#050d1a), salvo em `site/public/assets/rr-logo.webp` e `rr-logo.png`.
- **Fotografia Hero de Alto Impacto:** Imagem cinematográfica de técnico especialista em hidrojateamento com van de atendimento e iluminação cyan em Niterói, salvo em `site/public/assets/hero.png`.
- **Selos Regulatórios:** Cópia dos selos oficiais de homologação (`inea.png`, `nr33.png`, `nr35.jpeg`) para `site/public/images/`.
- **Build & Push:** `npm run build` static compilado com 0 erros (5/5 static pages). Commit `release: Version V0.03.01` enviado com sucesso para `main` no GitHub.
- **Deploy:** Deploy automatizado acionado via webhook no Coolify para `https://rrd.vibedocode.pro`.

### Versão
V0.03.01 · 2026-09-04

---

## Sessão 2026-09-04 — Expansão Comercial das 3 Seções Dedicadas (V0.04.00)

### Resumo
Com base nas orientações comerciais do Hermes e do Vanderson, recuperamos e reorganizamos todo o acervo de conteúdo útil e técnico da RR em 3 seções dedicadas com o mesmo padrão visual "Efeito UAU":

1. **Hidrojateamento Profissional (`#hidrojateamento`):**
   - Apresentação completa da tecnologia de alta pressão (até 1.500 BAR) e 100% ecológica sem química.
   - Grid com 4 Aplicações (Tubulações/Dutos, Drenos/Esgotos, Superfícies/Equipamentos, Resíduos Comerciais/Industriais).
   - Benefícios de preservação hidráulica, redução de custos de manutenção e certificações NR-33/NR-35.
   - Visual fotográfico HD (`/assets/hidro.png`) e CTA direto para WhatsApp.

2. **Especialistas em Caixa de Gordura (`#caixa-de-gordura`):**
   - 4 Sinais de Alerta para contratação urgente (Transbordamento/Refluxo, Mau Cheiro, Escoamento Lento, Pragas).
   - Processo técnico em 4 etapas (Inspeção, Sucção a Vácuo, Rasparia & Hidro, Descarte INEA com Laudo Ambiental).
   - Quadro explicativo de Manutenção Preventiva vs Emergencial para restaurantes, condomínios e residências.

3. **VACOL Compacto (`#vacol-compacto`):**
   - Apresentação do diferencial exclusivo da frota própria RR para garagens subterrâneas (subsolos) e ruas estreitas de Niterói/São Gonçalo.
   - Grid de 6 vantagens exclusivas (Acesso a locais restritos, Zero bloqueio de vias, Agilidade, Alta potência de sucção, Operação silenciosa, Multisserviços).

4. **Navegação & Deploy:**
   - Header e Drawer Mobile atualizados com os links de ancoragem direta.
   - Build estático verificado com sucesso (`npm run build` 5/5 páginas).
   - Release `V0.04.00` enviada para o GitHub e deploy verificado em produção no Coolify (`https://rrd.vibedocode.pro`).

### Versão
V0.04.00 · 2026-09-04


