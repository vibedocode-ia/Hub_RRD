# Task 010: Behavior — Animações de Scroll (Framer Motion + Contadores)

**Tipo:** behavior
**Camada:** frontend
**Página relacionada:** `/`
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 003, 004, 005, 006, 007, 008

## Descrição
Implementar todas as animações de scroll da landing page usando Framer Motion: fade-up staggerado por seção, contadores numéricos animados no Hero (de 0 ao valor final ao entrar na viewport), ProgressBar de leitura, e pulso do badge 24h no hero.

## Critério de Conclusão
- [ ] `<ProgressBar />` usa `useScroll()` + `useSpring()` do Framer Motion e anima `scaleX`
- [ ] Cada `<Section />` wrapper usa `useInView({ once: true, margin: '-80px' })` para acionar fade-up
- [ ] Variante `fade` com `{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }`
- [ ] Stagger de 0.12s entre filhos em cada seção
- [ ] Contadores no Hero animam com `useMotionValue` + `useTransform` de 0 → valor final ao entrar na viewport
- [ ] Ponto verde do badge 24h pulsa com animação CSS `@keyframes pulse`
- [ ] FloatingWhatsApp aparece/desaparece com `useScroll` ao passar de 200px
- [ ] Pulso ciano do FloatingWhatsApp a cada 3s via CSS animation
