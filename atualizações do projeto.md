# Atualizações do Projeto — RR Desentupidora
> Seguir norma VibeDoCode: `V[MAJOR].[MINOR].[PATCH]`

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
