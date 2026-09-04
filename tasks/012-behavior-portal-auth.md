# Task 012: Behavior — Autenticação do Portal Gate (Server Action)

**Tipo:** behavior
**Camada:** full-stack
**Página relacionada:** `/portal`
**Prioridade:** P0-crítico
**Status:** ✅ Concluída
**Depende de:** 009

## Descrição
Implementar a lógica de autenticação do Portal Gate usando Next.js 15 Server Action. A validação da senha deve ocorrer no servidor (não exposta ao bundle do cliente). Em caso de sucesso, criar cookie de sessão com TTL de 8h. Implementar shake animation no erro e rate limiting visual após 3 tentativas.

## Critério de Conclusão
- [ ] Variável de ambiente `PORTAL_PASSWORD` criada e documentada no `.env.example`
- [ ] Server Action `validatePortalPassword(password)` verifica `password === process.env.PORTAL_PASSWORD`
- [ ] Em sucesso: cria cookie `rrd-portal-session` com valor seguro e TTL 8h, redireciona para `/portal/dashboard` (placeholder por ora)
- [ ] Em erro: retorna `{ success: false, message: 'Senha incorreta' }`
- [ ] Cliente exibe mensagem de erro em vermelho (`--rr-danger`)
- [ ] Animação de shake no campo de senha ao erro (`@keyframes shake` via classe CSS)
- [ ] Após 3 erros seguidos: botão "Entrar" desabilitado por 30s + contador regressivo visível
- [ ] Campo de senha limpo automaticamente após erro
- [ ] Ícone cadeado: animação de "destravar" (rotate + unlock) em sucesso antes do redirect
