# Task: Behaviors Operacional
Status: concluída
Tipo: behavior
Camada: api-frontend

## Descrição
Implementar a lógica da gestão Operacional.

## Funcionalidades
- [x] Toggle de status da equipe (disponível/trabalhando) chamando PATCH em `/api/operacional/equipes`.
- [x] Interatividade na agenda (abrir detalhes de serviço).
- [x] Lógica de checklist de veículos: submeter form atualiza o status na tabela e se houver gasto, gera um request de despesa via API interna.
