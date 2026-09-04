# Task 005: UI — Differentials Section (com Selos INEA/NR)

**Tipo:** ui-prototype
**Camada:** frontend
**Página relacionada:** `/` (id="porque")
**Prioridade:** P1-importante
**Status:** ✅ Concluída
**Depende de:** 001

## Descrição
Criar a seção "Por que a RR" com layout 2 colunas: lado esquerdo com headline + texto + link CTA, lado direito com 4 DiffCards horizontais e os 3 selos holográficos (INEA, NR-33, NR-35). Os selos devem ter estilo diferenciado que transmita autoridade técnica e ambiental.

## Critério de Conclusão
- [ ] Layout 2 colunas (desktop) / 1 coluna (mobile) com `gap-12`
- [ ] Coluna esquerda: label "POR QUE A RR" + H2 "Uma empresa que vai pra resolver o seu problema" + texto + link "Solicitar orçamento →" em ciano
- [ ] 4 DiffCards horizontais (ícone + título + descrição): 24h · 5,0 Google · +7 Anos · Equipamento moderno
- [ ] 3 selos INEA / NR-33 / NR-35 — cards menores com ícone de badge/shield + nome do selo + "Conformidade certificada"
- [ ] Selos com efeito `hover:rotate-y-6` (Tailwind 3D tilt via CSS `perspective`) — apenas CSS, sem JS
- [ ] Selos com borda gradiente ciano e fundo `.glass`
- [ ] Imagens dos selos em `/images/inea.png`, `/images/nr33.png`, `/images/nr35.jpeg` (já existem na pasta images do projeto)
