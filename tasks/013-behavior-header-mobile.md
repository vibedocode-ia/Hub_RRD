# Task 013: Behavior — Header Mobile Drawer & Scroll Opacity

**Tipo:** behavior
**Camada:** frontend
**Página relacionada:** `/` (Header global)
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 002

## Descrição
Implementar os dois comportamentos interativos do Header: (1) menu mobile com drawer lateral controlado por hambúrguer; (2) opacidade dinâmica do header ao fazer scroll (mais opaco ao descer).

## Critério de Conclusão
- [ ] Estado `menuOpen` (boolean) controla abertura/fechamento do drawer mobile
- [ ] Drawer mobile: slide-in da direita com `x: '100%' → x: 0` via Framer Motion
- [ ] Drawer contém todos os links de âncora + CTA "Chamar 24h" + "Acesso ao Hub"
- [ ] Ao clicar em link no drawer: fecha o drawer + scroll suave até a seção
- [ ] Overlay escuro semi-transparente atrás do drawer ao abrir; fecha o drawer ao clicar no overlay
- [ ] `useScroll()` monitora `scrollY`: abaixo de 80px background `bg-[#050d1a]/70`, acima de 80px `bg-[#050d1a]/95` com transição suave
- [ ] Em mobile, botão "Chamar 24h" some do header (o FloatingWhatsApp assume essa função)
