# Task 007: UI — Areas Section & Orçamento Widget

**Tipo:** ui-prototype
**Camada:** frontend
**Página relacionada:** `/` (id="areas" + id="simulador")
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 001

## Descrição
Criar duas seções: (1) Áreas de Atendimento com pills de bairros/cidades com visual de destaque; (2) Widget de Orçamento Rápido com botões de seleção de serviço, dropdown de localização e toggle de urgência. Apenas visual estático nesta task — a interatividade (mensagem WhatsApp dinâmica) é implementada na task 011.

## Critério de Conclusão

### Seção Áreas (id="areas")
- [ ] H2 "Atendemos onde você precisa"
- [ ] Destaque em ciano: "Niterói · São Gonçalo · Grande Rio"
- [ ] Pills com todos os bairros e cidades: Niterói (Santa Rosa, Icaraí, Fonseca, Ingá, Pendotiba) · São Gonçalo · Maricá · Itaboraí · Rio de Janeiro
- [ ] Pills com borda, fundo translúcido e hover: fundo ciano + texto escuro

### Widget de Orçamento (id="simulador")
- [ ] Header "Qual é o seu problema?"
- [ ] 6 botões de serviço: Pia · Vaso · Fossa · Hidrojato · Caixa D'água · Dedetização
- [ ] Botões com estado visual "ativo" (fundo ciano) ao clicar — apenas aparência (useState sem lógica)
- [ ] Dropdown "Tipo de local": Residencial · Condomínio · Empresa/Indústria
- [ ] Toggle "Agendado / Urgência 24h" — apenas visual
- [ ] Badge de urgência vermelho (condicional ao toggle — apenas visual)
- [ ] Botão "Solicitar Orçamento Grátis" `.btn-cyan` grande
