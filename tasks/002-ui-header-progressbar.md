# Task 002: UI — Header & ProgressBar

**Tipo:** ui-prototype
**Camada:** frontend
**Página relacionada:** `/` (global)
**Prioridade:** P0-crítico
**Status:** ✅ Concluída
**Depende de:** 001

## Descrição
Criar o componente `<Header />` fixo com navbar, logo RR, links de âncora, CTA "Chamar 24h" e botão "Acesso ao Hub" (discreto). Criar o componente `<ProgressBar />` de leitura de scroll. Implementar o drawer mobile com hambúrguer. Apenas visual — sem comportamentos JS interativos ainda.

## Critério de Conclusão
- [ ] `<Header />` renderizado com logo (`/assets/rr-logo.webp`) + nome "RR Desentupidora" em Outfit
- [ ] Links de âncora visíveis em desktop: Serviços · Diferenciais · Avaliações · Áreas · Contato
- [ ] Botão "Chamar 24h" ciano com ícone WhatsApp visível
- [ ] Botão "Acesso ao Hub" ghost discreto, à direita dos links
- [ ] Layout responsivo: em mobile, links colapsam em ícone hambúrguer
- [ ] `<ProgressBar />` renderizado com gradiente ciano→royal na borda superior da viewport
- [ ] Fundo do header com `backdrop-blur-xl` e border bottom sutil
