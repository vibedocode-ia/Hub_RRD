# Task: Setup Database Schema
Tipo: setup
Camada: database
Status: ✅ Concluída

## Descrição
Adicionar as novas tabelas necessárias para os módulos de Operacional, Estoque e Financeiro no schema do Drizzle.

## Especificação
- [x] Adicionar tabela `equipes` (id, nome, status, data_criacao).
- [x] Adicionar tabela `veiculos` (id, placa, modelo, equipe_id, status_checklist).
- [x] Adicionar tabela `insumos` (id, nome, categoria, quantidade, nivel_critico, unidade).
- [x] Adicionar tabela `financeiro_lancamentos` (id, tipo: 'RECEITA'|'DESPESA', valor, descricao, data, categoria, status).
- [x] Atualizar a tabela `chamados` para linkar com `equipes` e `veiculos` (já existente no DB).
- [x] Gerar e rodar migration.
