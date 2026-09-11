# Task: Integração Sofia Webhook
Tipo: integracao
Camada: backend
Status: ✅ Concluída

## Descrição
Receber dados diretos da API da Sofia (WhatsApp) e processá-los no Banco isolado.

## Funcionalidades
- Ajustar ou criar rota `/api/sofia/webhook` (ou adaptar `/api/sofia/dispatch/route.ts`).
- Receber JSON do questionário de triagem e persistir como rascunho na tabela `chamados` (com status 'DRAFT') ou tabela auxiliar `sofia_drafts`.
