# Spec: Site Institucional Público — RR Desentupidora
> Site público de apresentação institucional, alta conversão e credibilidade para a RR Desentupidora (Niterói/RJ). Objetivo: substituir o antigo site WordPress por uma experiência premium "Efeito UAU" — dark navy/ciano — que converte visitantes em leads via WhatsApp 24h. O botão de acesso ao Hub RRD (`/portal`) aparece de forma discreta no header para uso interno da equipe.

---

## Visão Geral

- **Tipo:** Landing Page de Alta Conversão (One-Page Scroll + rota `/portal`)
- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion + GSAP
- **Fontes:** Outfit (títulos) + Plus Jakarta Sans (corpo) — Google Fonts
- **Usuários públicos:** Moradores, Síndicos de Condomínio, Gestores de Empresas/Indústrias, visitantes via Google Ads
- **Usuário interno (oculto):** Rafael + equipe RR (acesso ao Hub RRD via `/portal`)
- **MVP do site:** Landing Page (`/`) totalmente funcional e publicada em `rrd.vibedocode.pro` + portal gate (`/portal`)

---

## Paleta e Design System

| Token | Valor | Uso |
|---|---|---|
| `--rr-bg` | `#050d1a` | Background principal |
| `--rr-navy` | `#071c3a` | Superfícies elevadas |
| `--rr-cyan` | `#10acf0` | Acento primário, CTAs, ícones |
| `--rr-royal` | `#1918eb` | Gradiente secundário |
| `--rr-white` | `#f1f5fb` | Texto principal |
| `--rr-muted` | `#8ea4bf` | Texto secundário |
| `--rr-danger` | `#e53935` | Alertas, urgência |
| `--rr-success` | `#16a36a` | Confirmações, garantia |

---

## Páginas

---

### 1. Landing Page — Home
**Rota:** `/`
**Descrição:** Página principal pública de apresentação e conversão da RR Desentupidora. Experiência de scroll único com 10 seções progressivas.

---

#### Subcomponente: ProgressBar
Barra de leitura de progresso fixada no topo da janela.

| Prop | Detalhe |
|---|---|
| Posição | `fixed top-0 left-0` acima do header, `z-[70]` |
| Estilo | Gradiente ciano → royal, altura 3px |
| Animação | `scaleX` baseado em `useScroll()` do Framer Motion com `useSpring()` |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B1.1 | Usuário scrolla a página | Barra cresce proporcionalmente de 0% a 100% | Happy Path |
| B1.2 | Usuário volta ao topo | Barra retrocede suavemente | Happy Path |

---

#### Subcomponente: Header
Navbar fixo com logo, links âncoras e CTA de acesso ao Hub.

| Elemento | Detalhe |
|---|---|
| Posição | `fixed top-0 w-full z-50` |
| Fundo | `backdrop-blur-xl bg-[#050d1a]/80 border-b border-cyan-300/10` |
| Logo | Image do logo RR + nome "RR Desentupidora" em fonte Outfit |
| Links Desktop | Serviços · Diferenciais · Avaliações · Áreas · Contato |
| CTA Interno | Botão "Acesso ao Hub" ghost com borda ciano (sem destaque de marketing) |
| CTA Emergência | Botão "Chamar 24h" em destaque ciano com ícone WhatsApp |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B2.1 | Usuário clica em link de âncora | Scroll suave até a seção correspondente | Happy Path |
| B2.2 | Usuário clica em "Chamar 24h" | Abre WhatsApp na nova aba com mensagem pré-configurada | Happy Path |
| B2.3 | Usuário clica em "Acesso ao Hub" | Navega para `/portal` | Happy Path |
| B2.4 | Header em mobile | Ícone hambúrguer; ao clicar abre drawer lateral | Mobile |
| B2.5 | Scroll para baixo > 80px | Header fica mais opaco com transição suave | Happy Path |

---

#### Seção 1: HeroSection
Seção hero de impacto máximo. Layout 2 colunas desktop / 1 coluna mobile.

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| HeroBadge | Pill animado "🟢 Atendimento 24h · Niterói e Região" com ponto pulsante verde |
| HeroHeadline | H1: "Entupiu? A gente resolve sem transtorno." — Outfit 64px desktop |
| HeroSubline | Subtexto de credibilidade: serviços + região + tecnologia |
| HeroStars | Estrelas âmbar 5,0 · 55 avaliações no Google |
| HeroCTAs | Botão primário WhatsApp + Botão ghost "Ver serviços" |
| HeroCounters | 3 counters animados: "+7 Anos" · "5,0 ★" · "24/7" |
| HeroVisual | Painel glassmorphism com imagem de operação em campo |
| MeshBackground | Grid diagonal animado + glows ciano/royal nos cantos |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B3.1 | Página carrega | Elementos entram com `fade + translateY` em stagger 0.1s | Happy Path |
| B3.2 | Seção entra na viewport | Contadores animam de 0 até o valor final | Happy Path |
| B3.3 | Usuário clica em "Chamar no WhatsApp" | Abre WhatsApp na nova aba | Happy Path |
| B3.4 | Usuário clica em "Ver serviços" | Scroll suave até `#servicos` | Happy Path |
| B3.5 | Hover no visual glassmorphism | Leve tilt 3D interativo via posição do mouse | Desktop |
| B3.6 | Imagem hero não carrega | Placeholder de gradiente ciano mantém layout | Erro |

---

#### Seção 2: ServicesSection
Grade de serviços oferecidos. id="servicos"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| SectionHeader | Label "O que fazemos" + H2 |
| ServiceCard x6 | Card glassmorphism com ícone, nome e descrição |

**Serviços:**
1. Desentupimento (Pias, ralos, vasos, caixas de gordura — residencial e predial)
2. Limpa Fossa e Sucção (Fossas, caixas de esgoto — VACOL)
3. Hidrojateamento (Alta pressão — desobstrução industrial)
4. Caixa D'água e Gordura (Limpeza e manutenção preventiva)
5. Rede de Esgoto (Colunas, redes, tubulações prediais e pluviais)
6. Dedetização (Controle de pragas — responsabilidade ambiental INEA)

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B4.1 | Cards entram na viewport | Animação fade-up em stagger 0.12s | Happy Path |
| B4.2 | Hover em ServiceCard | Card sobe 4px + borda ciano glows | Desktop |
| B4.3 | Click em ServiceCard mobile | Sem ação; CTA flutuante WhatsApp sempre visível | Mobile |

---

#### Seção 3: DifferentialsSection
Por que escolher a RR. id="porque"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| DiffHeadline | H2 + texto de credibilidade + link "Solicitar orçamento" |
| DiffCard x4 | Card horizontal com ícone + título + descrição |
| CertBadges | Selos holográficos: INEA · NR-33 · NR-35 com hover 3D tilt |

**Diferenciais:**
1. Atendimento 24h (emergências, fins de semana, feriados)
2. 5,0 no Google (55 avaliações reais verificadas)
3. +7 Anos de experiência com equipe especializada e pontual
4. Equipamento moderno e compacto (VACOL + Hidrojato)

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B5.1 | Seção entra na viewport | Fade-up staggered para headline e cards | Happy Path |
| B5.2 | Hover nos selos INEA/NR | Efeito tilt 3D leve + glow border | Desktop |
| B5.3 | Click em "Solicitar orçamento" | Abre WhatsApp com mensagem pré-formatada | Happy Path |

---

#### Seção 4: ReviewsSection
Central de prova social. id="avaliacoes"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| ReviewsHeader | H2 + selo Google "5,0 ★ · 55 avaliações" com badge verificado |
| ReviewCard x3 | Card glassmorphism com estrelas âmbar, texto e nome |
| ReviewsStats | Barra mostrando 100% de avaliações 5 estrelas |

**Avaliações:**
- "Raquel C." — Atendimento maravilhoso! Super atenciosos e competentes...
- "Fernando e Rafael" — Profissionais de primeira linha. Resolveram um problemão...
- "Alex A." — Respondem rápido no WhatsApp e a equipe é muito bem preparada...

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B6.1 | Cards entram na viewport | Fade-up em stagger | Happy Path |
| B6.2 | Hover em ReviewCard | Borda ciano sutil + escala 1.01 | Desktop |
| B6.3 | Badge Google aparece | Animação de check mark + "Verificado pelo Google" | Happy Path |

---

#### Seção 5: AreasSection
Áreas de atendimento cobertas. id="areas"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| AreasHeader | H2 "Atendemos onde você precisa" |
| AreasPills | Pills/tags de bairros e cidades |
| AreasHighlight | Destaque "Niterói · São Gonçalo · Grande Rio" |

**Áreas mapeadas:**
Niterói (Santa Rosa, Icaraí, Fonseca, Ingá, Pendotiba...) · São Gonçalo · Maricá · Itaboraí · Rio de Janeiro (região)

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B7.1 | Pills entram na viewport | Appear animation em onda, esquerda para direita | Happy Path |
| B7.2 | Hover em pill de cidade | Pill → fundo ciano + texto escuro | Desktop |

---

#### Seção 6: OrcamentoWidget
Simulador rápido de orçamento. id="simulador"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| WidgetHeader | "Qual é o seu problema?" |
| ServicePicker | Botões de seleção: Pia · Vaso · Fossa · Hidrojato · Caixa D'água · Dedetização |
| LocationPicker | Dropdown: Residencial · Condomínio · Empresa/Indústria |
| UrgencyToggle | Toggle: Agendado · Urgência 24h |
| WidgetCTA | Botão "Solicitar Orçamento Grátis" que abre WhatsApp com mensagem dinâmica |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B8.1 | Usuário seleciona serviço | Botão ativa (fundo ciano) | Happy Path |
| B8.2 | Usuário clica CTA com seleções | Mensagem WhatsApp montada dinamicamente com as opções | Happy Path |
| B8.3 | Nenhuma opção selecionada | CTA abre WhatsApp com mensagem genérica | Edge Case |
| B8.4 | Urgência 24h selecionada | Badge vermelho aparece + mensagem WhatsApp indica urgência | Happy Path |

---

#### Seção 7: CTAFinal
Call to action final de conversão. id="contato"

**Subcomponentes:**
| Componente | Descrição |
|---|---|
| CTACard | Card glassmorphism grande com headline de urgência |
| PhoneDisplay | Número "(21) 99669-9191" em destaque tipográfico |
| CTAButton | Botão primário ciano grande "Chamar agora no WhatsApp" |
| GuaranteeBadge | Pill "Garantia de 30 dias incluída" em verde |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B9.1 | Seção entra na viewport | Card aparece com fade + scale 0.96 → 1 | Happy Path |
| B9.2 | Usuário clica em "Chamar agora" | Abre WhatsApp na nova aba | Happy Path |
| B9.3 | Usuário clica no número em mobile | Aciona discador (`tel:5521996699191`) | Mobile |

---

#### Componente: Footer
Rodapé completo com informações institucionais.

| Elemento | Detalhe |
|---|---|
| Coluna 1 | Logo RR + tagline curta |
| Coluna 2 | Endereço (Rua Santos Moreira, 40 · Santa Rosa, Niterói/RJ) + Telefone 24h |
| Coluna 3 | Links: Instagram · WhatsApp |
| Rodapé inferior | "© RR Desentupidora · VibeDoCode · [ano] · [VERSION]" em fonte mono opacidade 40% |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B10.1 | Click em Instagram | Abre instagram.com/rr.desentupidora em nova aba | Happy Path |
| B10.2 | Click em WhatsApp | Abre WhatsApp em nova aba | Happy Path |

---

#### Componente: FloatingWhatsApp
Dock flutuante de emergência sempre visível durante o scroll.

| Elemento | Detalhe |
|---|---|
| Posição | `fixed bottom-6 right-6 z-50` |
| Desktop | Botão circular ciano com ícone WhatsApp + label "Chamar 24h" |
| Mobile | Botão circular menor sem label |
| Animação | Aparece após scroll 200px · Pulso ciano a cada 3s |

**Comportamentos:**
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B11.1 | Scroll > 200px | Botão aparece com fade + scale | Happy Path |
| B11.2 | Retorno ao topo < 200px | Botão desaparece suavemente | Happy Path |
| B11.3 | Usuário clica no botão | Abre WhatsApp com mensagem padrão | Happy Path |

---

### 2. Portal Gate
**Rota:** `/portal`
**Descrição:** Tela de acesso restrito ao Hub RRD. Aparência executiva e futurista. Solicitação de senha antes do acesso ao painel interno.

#### Componentes
| Componente | Descrição |
|---|---|
| PortalBackground | Background dark navy full-screen com partículas sutis e grid |
| PortalLogo | Logo RR + label "Hub RRD · Acesso Restrito" |
| PortalLockIcon | Ícone de cadeado animado que "destrava" quando autenticado |
| PasswordInput | Campo de senha estilizado com borda ciano + botão "Entrar" |
| PortalVersion | Versão do sistema em fonte mono opacidade 40% no rodapé |

#### Comportamentos
| ID | Ação | Resposta | Cenário |
|---|---|---|---|
| B12.1 | Usuário acessa `/portal` | Tela gate aparece; campo de senha em foco automaticamente | Happy Path |
| B12.2 | Senha correta + Enter / click "Entrar" | Lock icon destrava com animação; redireciona ao dashboard | Happy Path |
| B12.3 | Senha incorreta | Campo vibra (shake animation) + "Senha incorreta" em vermelho | Erro |
| B12.4 | 3 erros seguidos | Botão desabilitado por 30s + contador regressivo | Edge Case |
| B12.5 | Acesso sem JS | Formulário continua funcional (progressive enhancement) | Edge Case |

---

## Regras Globais

### Design e Tipografia
- Fontes obrigatórias: Outfit (700/800 headings) + Plus Jakarta Sans (400/500 corpo) via `next/font/google`
- Paleta: seguir Design System desta spec — sem violeta/roxo
- Glassmorphism: backdrop-blur + bg-opacity + bordas translúcidas ciano
- Animações: Framer Motion `useInView` com `once: true` (performance)
- Progress bar de scroll: sempre visível no topo, z acima do header

### SEO
- Meta title: "RR Desentupidora Niterói | Desentupimento 24h · (21) 99669-9191"
- Meta description: "Desentupimento, limpa fossa e hidrojateamento em Niterói 24h. 5,0 ⭐ no Google. Residências, condomínios e empresas. Ligue agora!"
- OG image configurado para compartilhamento social
- Todas as Images com `priority` no Hero (LCP)
- Fontes com `display: swap`

### Acessibilidade
- Todos os botões com `aria-label` descritivo
- Contraste mínimo 4.5:1 para texto principal
- Links de âncora com `scroll-behavior: smooth`
- FloatingWhatsApp com `aria-label` adequado

### Autenticação do Portal
- Senha via variável de ambiente `PORTAL_PASSWORD` (nunca hardcoded no cliente)
- Validação via Server Action Next.js 15 (não expõe a senha no bundle)
- Cookie de sessão com TTL de 8h

### WhatsApp
- Link padrão: `https://api.whatsapp.com/send?phone=5521996699191&text=...`
- Mensagem padrão: "Olá! Vi o site da RR Desentupidora e gostaria de solicitar um orçamento."
- Todos os CTAs abrem em `target="_blank" rel="noreferrer"`

### Versionamento
- Seguir norma VibeDoCode: `V[MAJOR].[MINOR].[PATCH]`
- Visível no rodapé em `font-mono opacity-40`
- Atualizar `lib/version.ts` + `package.json` + `atualizaçoes do projeto.md` a cada release
- Commit pattern: `release: Version VX.XX.XX`
