# Task: Behaviors Estoque
Status: concluída
Tipo: behavior
Camada: api-frontend

## Descrição
Implementar a lógica de inventário de Estoque e Ferramental.

## Funcionalidades
- [x] CRUD para Insumos via `/api/estoque/insumos`.
- [x] Validação de entrada e saída, atualizando a quantidade do insumo.
- [x] Alerta visual no frontend e lógica de background se `quantidade <= nivel_critico`.
- [x] Gatilho automático: se um serviço for fechado e exigir determinado insumo, subtrair automaticamente (ou gerar notificação para o usuário subtrair).
