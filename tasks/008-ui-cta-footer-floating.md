# Task 008: UI — CTA Final, Footer & FloatingWhatsApp

**Tipo:** ui-prototype
**Camada:** frontend
**Página relacionada:** `/` (id="contato" + footer + floating)
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 001

## Descrição
Criar três componentes finais da landing page: (1) Seção CTA Final de conversão com card glassmorphism grande, número de telefone em destaque e badge de garantia; (2) Footer completo com 3 colunas e versão do sistema; (3) FloatingWhatsApp como dock fixo no canto inferior direito.

## Critério de Conclusão

### CTA Final (id="contato")
- [ ] Card `.glass-strong` com cantos arredondados `rounded-[2.5rem]`
- [ ] Ícone de confirmação (CheckCircle2 em ciano) centralizado
- [ ] H2 "Entupiu aí? A gente resolve hoje."
- [ ] Subtexto "Atendimento 24h por WhatsApp. Solicite seu orçamento agora."
- [ ] Botão ".btn-cyan" grande com ícone de telefone + "(21) 99669-9191"
- [ ] Badge verde "✓ Garantia de 30 dias incluída" abaixo do botão

### Footer
- [ ] Grid 3 colunas desktop / 1 coluna mobile
- [ ] Col 1: Logo RR + tagline "Desentupimento com tecnologia, agilidade e cuidado."
- [ ] Col 2: Endereço (Rua Santos Moreira, 40 · Santa Rosa, Niterói/RJ) + Telefone (21) 99669-9191 · 24h
- [ ] Col 3: Links Instagram + WhatsApp em uppercase tracking-wide
- [ ] Rodapé inferior: `© RR Desentupidora · VibeDoCode · [ano] · [VERSION]` em font-mono opacidade 40%

### FloatingWhatsApp
- [ ] Botão circular `fixed bottom-6 right-6 z-50` com fundo ciano
- [ ] Desktop: botão com label "Chamar 24h" + ícone WhatsApp
- [ ] Mobile: apenas ícone, sem label
- [ ] Animação de pulso ciano ao redor do botão (ring pulsante via CSS)
- [ ] `aria-label="Chamar RR Desentupidora no WhatsApp"`
