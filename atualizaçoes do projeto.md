### V0.10.03 (2026-09-05) - Corrige rota de ficha completa do CRM
- **Release:** Site + Hub RRD.

### V0.10.02 (2026-09-05) - Adiciona alternância de visibilidade da senha no login
- **Release:** Site + Hub RRD.

### V0.10.01 (2026-09-04) - Patch de segurança e integração Sofia Multi Cliente
- **Release:** Site + Hub RRD.

# Atualizações do Projeto — RR Desentupidora
> Seguir norma VibeDoCode: `V[MAJOR].[MINOR].[PATCH]`

## V0.10.00 — 2026-09-04 — Lançamento do Hub RRD (MVP Interno Operacional)

**Commit:** `release: Version V0.10.00`
**Tipo:** MINOR — Fundação e Sistema Operacional de Campo da RR Desentupidora (Auth Server-side + Drizzle ORM + CRM + Chamados + PDFs Canônicos + Sofia WhatsApp API)

### O que mudou
- **Arquitetura & Fundação do Hub RRD:**
  - Sistema operacional sob medida construído no App Router (`/portal/*`) para gestão de atendimentos em Niterói e Região Metropolitana.
  - Conexão relacional persistente via **Drizzle ORM + PostgreSQL** (`src/db/index.ts` e `src/db/schema.ts`).
  - Isolamento total do Hub RRD (sem dependências ou cruzamentos de banco com outros projetos).
- **Autenticação Server-Side Real:**
  - Login autenticado via `POST /api/auth/login` com hash seguro **scrypt nativo Node.js**.
  - Sessão gravada em banco (`sessions`) e protegida por cookie **`HttpOnly`**, `Secure` e `SameSite=Lax` (`src/lib/auth.ts`).
  - **`middleware.ts`** interceptando e protegendo todas as rotas `/portal/*` no servidor.
  - Script de seed seguro (`scripts/seed-rafael.ts`) para cadastro do operador master **Rafael** (`5521996699191`) via `INITIAL_RAFAEL_PASSWORD` do `.env` (zero senhas ou hashes expostos no repositório).
- **Schema Operacional Relacional (`schema.ts`):**
  - Tabelas: `users`, `sessions`, `clients`, `client_addresses`, `service_requests`, `official_documents`, `attachments`, `sofia_events`, `teams`, `vehicles`, `equipment`.
  - Normalização de telefone (`normalizedPhone`), notas de acesso de imóvel (subsolo/VACOL), snapshot imutável em JSONB (`documentPayloadSnapshot`) e índices otimizados.
- **Módulos da Interface Operacional (`/portal`):**
  - **`/portal/login`:** Interface executiva server-side com feedback de erros e redirecionamento pós-login.
  - **`/portal/dashboard`:** Visão geral operacional com métricas em tempo real (Clientes, Chamados Pendentes, Rascunhos da Sofia e Documentos).
  - **`/portal/crm` & `/portal/crm/novo`:** Cadastro e busca instantânea de clientes (PF/PJ/Restaurantes/Condomínios) por telefone normalizado e bairro.
  - **`/portal/chamados` & `/portal/chamados/novo`:** Abertura e controle de ordens de serviço por prioridade (Normal / Urgente 24h).
  - **`/portal/documentos` & `/portal/documentos/preview/[id]`:** Central de documentos com snapshot congelado e visualizador fiel para impressão PDF.
  - **`/portal/sofia-drafts`:** Fila de revisão de áudios e mensagens capturados pela Sofia no WhatsApp, permitindo emissão do PDF oficial em 1 clique pelo Rafael.
  - **`/portal/settings`:** Configurações de equipes de campo, frota própria (Vácuo / VACOL), equipamentos e política de garantia.
- **Endpoint Seguro da Sofia (WhatsApp API):**
  - `POST /api/sofia/dispatch` com validação **Zod**, secret Bearer, `Idempotency-Key` e verificação do telefone do Rafael (`5521996699191`).
  - Suporte a dados incompletos via status `PENDING_REVIEW` com link direto para a central `/portal/sofia-drafts`.
- **Gerador de PDFs Canônicos Fiel:**
  - Templates HTML/CSS fiéis aos modelos oficiais em `Docs Modelos/Recibo_de_Pagamento_RRD.pdf` e `Ordem_de_Servico_Relatorio_Tecnico_RRD.pdf`.
  - Suporte a visualização no navegador e salvamento/impressão em PDF A4 sem distorções.
- **Build & Versionamento:**
  - Compilação estática e dinâmica verificada com **0 erros** (`npm run build`).
  - Versão atualizada para **`V0.10.00`** em `package.json`, `package-lock.json` e `src/lib/version.ts`.

---

## V0.05.01 — 2026-09-04 — Fotografias da Frota Limpas (Sem Banners de Anúncio) + Logo Oficial Aplicada

**Commit:** `release: Version V0.05.01`
**Tipo:** PATCH — Recriação/Tratamento das fotografias da frota KON com remoção de textos publicitários e estampagem da marca oficial RR em alta definição

### O que mudou
- **Fotografias de Frota Limpas (`site/public/assets/clean/`):**
  - Processadas as 6 principais fotografias operacionais da pasta `Criativos do KON` via script de corte inteligente e tratamento de contraste
  - Removidos banners e textos publicitários sobrepostos das imagens originais, isolando os caminhões heavy-duty, veículos compactos VACOL, equipamentos de sucção e equipe uniformizada
  - Estampagem da marca oficial `Logo Horizontal RR` sobreposta com alta definição e acabamento webp
- **Navegação & Build:**
  - `page.tsx` atualizado para exibir as novas imagens limpas na seção `Frota Real` (`#frota`)
  - `npm run build` static validado com 0 erros (5/5 páginas)

---

## V0.05.00 — 2026-09-04 — Marca Oficial RR, Galeria da Frota Real KON & Medidor Circular de Scroll

**Commit:** `release: Version V0.05.00`
**Tipo:** MINOR — Identidade oficial (Logo Horizontal + Favicon), Galeria da Frota Real (`#frota`) e Botão Voltar ao Topo com indicador de scroll

### O que mudou
- **Identidade Oficial da Marca:**
  - `site/public/assets/logo-horizontal.png`: Aplicada no Header, Footer e PortalGate com suporte retina/HD
  - `site/public/favicon.jpg`: Configurado via `metadata.icons` em `layout.tsx`
- **Seção "Nossa Frota Própria & Operação Real" (`#frota`):**
  - Galeria visual com 6 fotografias reais da operação RR em Niterói extraídas da pasta `Criativos do KON`
  - Apresentação de caminhões heavy-duty, equipe uniformizada, veículos compactos e equipamentos de hidrojateamento
- **Botão Voltar ao Topo + Medidor Circular de Scroll:**
  - Componente flutuante no canto inferior direito com anel de progresso em SVG preenchido de 0% a 100% conforme a rolagem do usuário
  - Suporte a rolagem suave (`smooth scroll`) de volta ao topo e indicador com porcentagem no hover
- **Navegação & Menu:**
  - Header e Drawer Mobile atualizados com o atalho `Frota Real` (`#frota`)
- **Build & Versão:**
  - `npm run build` static compilado com sucesso (5/5 páginas)
  - Versão atualizada para `V0.05.00` em `version.ts` e `package.json`

---

## V0.04.00 — 2026-09-04 — Expansão Comercial: Seções Dedicadas de Hidrojateamento, Caixa de Gordura e VACOL Compacto

**Commit:** `release: Version V0.04.00`
**Tipo:** MINOR — Incorporação completa do acervo técnico/comercial nas seções dedicadas da Landing Page

### O que mudou
- **Hidrojateamento Profissional (`#hidrojateamento`):**
  - Seção técnica premium dedicada com badge de alta pressão (1.500 BAR) e 100% ecológica
  - Aplicações (Tubulações/Dutos, Drenos/Esgotos, Superfícies/Equipamentos, Resíduos Comerciais/Industriais)
  - Benefícios (sem química, redução de custos de manutenção, homologação INEA, certificações NR-33/NR-35)
  - Visual fotográfico HD (`/assets/hidro.png`) e CTA direto para orçamento via WhatsApp
- **Especialistas em Caixa de Gordura (`#caixa-de-gordura`):**
  - Seção com 4 Sinais de Alerta (Transbordamento, Mau Cheiro, Escoamento Lento, Pragas)
  - Processo de sucção e limpeza em 4 passos (Inspeção, Sucção a Vácuo, Rasparia & Hidro, Descarte INEA com Laudo Ambiental)
  - Quadro explicativo Manutenção Preventiva vs Emergencial para restaurantes, condomínios e residências
- **VACOL Compacto (`#vacol-compacto`):**
  - Apresentação do diferencial exclusivo da frota própria RR para garagens subterrâneas (subsolos) e ruas estreitas de Niterói/São Gonçalo
  - Grid de 6 vantagens (Acesso a locais restritos, Zero bloqueio de vias, Agilidade, Alta potência de sucção, Menos transtorno, Multisserviços)
- **Navegação:**
  - Header e Drawer Mobile atualizados com os links diretos para as 3 novas seções
- **Build & Versão:**
  - `npm run build` static compilado com sucesso (5/5 páginas)
  - Versão atualizada para `V0.04.00` em `version.ts` e `package.json`

---

## V0.03.01 — 2026-09-04 — Geração de Assets Visuais High-Res & Deploy Ready

**Commit:** `release: Version V0.03.01`
**Tipo:** PATCH — Assets visuais ultra high-res (Logo 3D e Hero photograph) + Selos INEA/NR-33/NR-35 em site/public

### O que mudou
- **Assets visuais gerados com IA (`generate_image`):**
  - `/assets/rr-logo.webp` / `rr-logo.png`: Logo 3D monograma moderno cromado azul cyan/royal com gota d'água sob fundo dark navy (#050d1a)
  - `/assets/hero.png`: Fotografia dramática e cinematográfica de técnico especialista em operação de hidrojateamento com van e iluminação cyan em Niterói
- **Selos Regulatórios:**
  - Cópia dos selos oficiais de homologação (`inea.png`, `nr33.png`, `nr35.jpeg`) para `site/public/images/`
- **Validação de Build:**
  - `npm run build` executado com sucesso (5/5 static pages)
  - Versão atualizada para `V0.03.01` em `version.ts` e `package.json`

---

## V0.03.00 — 2026-09-04 — Efeito UAU: Redesign Completo do Site Público

**Commit:** `release: Version V0.03.00`
**Tipo:** MINOR — Redesign visual completo + novas funcionalidades de conversão

### O que mudou
- **globals.css:** Design System completo — tokens CSS (`--rr-bg`, `--rr-cyan`, `--rr-royal`, `--rr-danger`, `--rr-success`), glassmorphism (`.glass`, `.glass-strong`, `.glass-hover`), animações (`pulse-dot`, `pulse-ring`, `shake`, `float-up`), `cert-badge`, `area-pill`, scrollbar estilizada
- **layout.tsx:** Fontes Google (Outfit + Plus Jakarta Sans) via `next/font/google`, SEO metadata completo com OG, canonical e robots
- **page.tsx:** Rewrite completo da landing page — Hero com badge 24h pulsante + contadores animados + visual glassmorphism; Seção Serviços (6 cards); Diferenciais + Selos INEA/NR-33/NR-35 com hover 3D; Avaliações Google 5★; Áreas com pills; Widget de Orçamento com WhatsApp dinâmico (seleção de serviço, tipo de local, urgência 24h); CTA Final com garantia; Footer institucional; FloatingWhatsApp com pulso; Header com drawer mobile + scroll opacity; ProgressBar de leitura
- **PortalGate.tsx:** Redesign executivo premium — ícone de cadeado, show/hide senha, shake animation no erro, rate limiting (3 tentativas → 30s lockout com contador regressivo), estado de sucesso com Unlock animado
- **version.ts:** Bumped V0.02.01 → V0.03.00
- **.env.example:** Criado com `NEXT_PUBLIC_DEMO_HUB_PASS`

### Tasks executadas (vc-auto)
- 001: Setup Design System ✅
- 002-009: UI de todas as seções ✅
- 010: Scroll animations (Framer Motion) ✅
- 011: Widget WhatsApp dinâmico ✅
- 012: Auth Portal com rate limiting ✅
- 013: Header mobile + scroll ✅
- 014: SEO + versão + .env.example ✅
- 015: Build validado ✅ (zero erros TypeScript)

### Build
```
Route /         → 13.3 kB (First Load 168 kB) — Static ○
Route /portal   →  2.85 kB (First Load 157 kB) — Static ○
```

---

## V0.02.01 — 2026-09-04 — Setup Inicial do Projeto
- Estrutura Next.js 15 App Router + Tailwind v4 criada
- Configuração inicial da paleta, globais e versão
