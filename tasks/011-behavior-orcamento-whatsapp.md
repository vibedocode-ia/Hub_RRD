# Task 011: Behavior — Widget Orçamento → WhatsApp Dinâmico

**Tipo:** behavior
**Camada:** frontend
**Página relacionada:** `/` (id="simulador")
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 007

## Descrição
Implementar a lógica interativa do Widget de Orçamento: seleção de serviço com estado ativo, dropdown de localização, toggle de urgência e geração dinâmica da mensagem WhatsApp personalizada com as opções selecionadas pelo usuário.

## Critério de Conclusão
- [ ] Estado `selectedService` (string | null) controla qual botão de serviço está ativo (fundo ciano)
- [ ] Estado `selectedLocation` (string) controla o dropdown de localização
- [ ] Estado `isUrgent` (boolean) controla o toggle de urgência
- [ ] Quando `isUrgent === true`: badge vermelho "⚡ Urgência 24h" aparece com fade
- [ ] Função `buildWhatsAppMessage()` gera mensagem dinâmica:
  - Com serviço: `"Olá! Preciso de [serviço] para [localização]. [Urgente/Agendado]."`
  - Sem serviço: mensagem genérica de contato
- [ ] Mensagem URL-encoded corretamente para o link WhatsApp
- [ ] Botão CTA abre link correto em `_blank` com mensagem montada
- [ ] Edge case: sem nenhuma seleção → mensagem genérica (não bloquear o botão)
