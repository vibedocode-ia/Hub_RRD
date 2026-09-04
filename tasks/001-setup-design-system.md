# Task 001: Setup Design System & Fontes

**Tipo:** setup
**Camada:** frontend
**Página relacionada:** Global
**Prioridade:** P0-crítico
**Status:** ✅ Concluída
**Depende de:** Nenhuma

## Descrição
Configurar o Design System completo do projeto: importar as fontes Google (Outfit + Plus Jakarta Sans) via `next/font/google`, atualizar `globals.css` com todos os tokens CSS da paleta RR (navy, cyan, royal, danger, success), classes utilitárias de glassmorphism, grid background, botões e texto gradiente. Base para todos os componentes visuais do site.

## Critério de Conclusão
- [ ] Fontes Outfit + Plus Jakarta Sans importadas e aplicadas via `layout.tsx`
- [ ] Todos os tokens CSS (`--rr-bg`, `--rr-navy`, `--rr-cyan`, `--rr-royal`, `--rr-white`, `--rr-muted`, `--rr-danger`, `--rr-success`) definidos em `:root`
- [ ] Classes `.glass`, `.glass-strong`, `.glass-hover` funcionando
- [ ] Classes `.grid-bg`, `.mesh-bg`, `.hero-overlay` funcionando
- [ ] Classes `.btn-cyan`, `.btn-ghost`, `.btn-danger` funcionando
- [ ] Classe `.grad-text` com gradiente ciano→royal funcionando
- [ ] `layout.tsx` com meta title, meta description e OG image configurados
- [ ] `scroll-behavior: smooth` global aplicado
