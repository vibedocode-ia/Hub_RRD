# Especificação: Hub RR Desentupidora V2.0

## 1. Dashboard Executivo (Home / Gerencial BI)
### Componentes
- **Resumo Financeiro (Cards):** Faturamento do dia, Resumo de gastos.
- **Gráficos de Produtividade:** Rank de equipes, Rank de serviços mais realizados.
- **Painel de Operação:** Equipes em campo, Próximos chamados do dia.
- **Alertas Prioritários (List/Banners):** Notas pendentes, Estoque zero/crítico, Contas vencendo.
- **Ações Rápidas (Floating Action Buttons ou Header Buttons):** "Novo Chamado", "Emitir Recibo", "Lançar Despesa".

### Comportamentos
- Os cards financeiros devem calcular dinamicamente baseados nas entradas/saídas do dia.
- Clicar em uma ação rápida abre modal ou redireciona para o formulário correspondente.
- Alertas críticos devem aparecer em destaque e permitir ação imediata (ex: clicar no alerta de estoque leva para reposição).

---

## 2. Módulo Operacional (/portal/operacional)
### Componentes
- **Tabela de Equipes:** Lista de equipes com status (Disponível/Trabalhando) e produtividade.
- **Visualizador de Agenda:** Calendário ou linha do tempo diária/semanal (serviços e revisões).
- **Gestão de Frotas/Equipamentos:** Lista de veículos, controle de km e checklist.

### Comportamentos
- Toggle para alterar o status da equipe em tempo real.
- Na agenda, arrastar ou clicar em um evento abre os detalhes do serviço (ou revisão).
- Preenchimento do checklist de veículo (gasto de combustível, manutenção) atualiza o status do carro e gera lançamento em despesas (Financeiro).

---

## 3. Módulo de Estoque (/portal/estoque)
### Componentes
- **Inventário de Insumos:** Tabela com produtos de dedetização (líquidos, géis, pós) indicando quantidade e unidade.
- **Inventário de Ferramental:** Tabela de ativos (máquinas, cabos, hidrojato, EPIs).
- **Painel de Entradas/Saídas:** Histórico de movimentações.

### Comportamentos
- Indicadores visuais de "Nível Crítico" quando o insumo estiver baixo.
- Fluxo de movimentação: Adicionar (compra) ou Subtrair (uso em serviço). O sistema deve subtrair automaticamente em caso de gatilho do serviço.

---

## 4. Módulo Financeiro (/portal/financeiro)
### Componentes
- **Visão de Caixa (DRE Simplificada):** Entrada/Saída por dia, semana, mês.
- **Tabela Contas a Pagar/Receber:** Controle de boletos e faturamento de empresas/condomínios.
- **Documentos de Saída:** Lista de Recibos/OS gerados fielmente ao PDF canônico.

### Comportamentos
- Filtragem de DRE por período.
- Validação estrita ao gerar Recibos/OS (CPF/CNPJ, valor extenso automático, campos não nulos).
- Botão para "Imprimir/Gerar PDF" gerando o arquivo imutável sem alterar os dados base se já emitido.

---

## 5. Módulo CRM e Chamados (Atualização + Sofia Drafts)
### Componentes
- **Lista Sofia Drafts:** Tabela de rascunhos de chamados e triagens pré-criados pela Sofia via WhatsApp.
- **Visualizador/Editor de Triagem:** Modal para revisar as perguntas dinâmicas e o diagnóstico gerado.

### Comportamentos
- O sistema da Sofia insere drafts via webhook; o Rafael visualiza na área de "Drafts".
- Ao clicar no draft, o Rafael pode editar ou aprovar.
- Aprovação converte o draft em Chamado Oficial e permite geração direta de Recibo/OS.
