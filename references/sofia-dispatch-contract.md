# Contrato de Integração: Sofia Multi Cliente → Hub RRD

**Hub:** `hub_rrd` (RR Desentupidora)  
**Versão Atual:** `V0.10.01`  
**Base URL:** `https://rrd.vibedocode.pro`

---

## 🔒 Autenticação & Segurança

Todas as requisições enviadas pela Sofia Multi Cliente ao Hub RRD exigem autenticação via token no cabeçalho HTTP:

```http
Authorization: Bearer <SOFIA_HUB_SECRET>
```

- Se o segredo `SOFIA_HUB_SECRET` não estiver configurado no servidor Hub RRD → Retorna **HTTP 503 Service Unavailable** (`status: unhealthy`, `error: hub_secret_not_configured`).
- Se o cabeçalho `Authorization` estiver ausente ou inválido → Retorna **HTTP 401 Unauthorized**.
- Comparações de token utilizam tempo constante (`timingSafeEqual`) para mitigar timing attacks.

---

## 🏥 Endpoint de Health Check & Capabilities

Verifica a saúde do Hub RRD, a conectividade com o banco de dados e as capacidades suportadas.

- **Método:** `GET`
- **Rota:** `/api/v1/health`
- **Autenticação:** Requer `Authorization: Bearer <SOFIA_HUB_SECRET>`

### Resposta 200 OK (Saudável & Conectado)
```json
{
  "status": "healthy",
  "hub": "hub_rrd",
  "version": "V0.10.01",
  "timestamp": "2026-09-05T02:40:00.000Z",
  "database": "connected",
  "capabilities": [
    "criar_rascunho_os_rrd",
    "emitir_recibo_garantia",
    "emitir_laudo_tecnico"
  ]
}
```

### Resposta 503 Service Unavailable (Sem Banco de Dados)
```json
{
  "status": "unhealthy",
  "hub": "hub_rrd",
  "version": "V0.10.01",
  "database": "disconnected"
}
```

---

## 🚀 Endpoint de Dispatch (Recebimento de Dados da Sofia)

Recebe os dados brutos de um atendimento conversacional via WhatsApp da Sofia e registra no Hub RRD.

- **Método:** `POST`
- **Rota:** `/api/sofia/dispatch`
- **Autenticação:** Requer `Authorization: Bearer <SOFIA_HUB_SECRET>`
- **Cabeçalhos Rastreadores (Obrigatórios):**
  - `Idempotency-Key` (ou `X-Correlation-Id`)
  - A resposta conterá `X-Hub-Version` e `X-Correlation-Id`.

### Validadores Específicos
- **`senderPhone`:** Deve ser exatamente igual ao telefone autorizado do Rafael (`5521996699191`).

---

### Payload (JSON)

```json
{
  "senderPhone": "5521996699191",
  "customerName": "João da Silva",
  "customerPhone": "5521988887777",
  "customerDocument": "123.456.789-00",
  "address": {
    "street": "Rua das Flores",
    "number": "100",
    "complement": "Apto 201",
    "neighborhood": "Icaraí",
    "city": "Niterói",
    "referencePoint": "Próximo ao campo de São Bento"
  },
  "serviceType": "DESENTUPIMENTO",
  "problemReported": "Pia da cozinha entupida transbordando água",
  "estimatedAmount": "350.00",
  "priority": "URGENTE_24H",
  "intentDetected": "CRIAR_ORCAMENTO",
  "correlationId": "sofia-req-20260905-001"
}
```

#### Tipos de Serviço Suportados (`serviceType`):
- `DESENTUPIMENTO`
- `HIDROJATEAMENTO`
- `CAIXA_GORDURA`
- `LIMPA_FOSSA`
- `DEDETIZACAO`

#### Prioridades Suportadas (`priority`):
- `NORMAL`
- `URGENTE_24H`

---

### Fluxo de Processamento Interno (Hub RRD)

1. Validação de token `SOFIA_HUB_SECRET` e `senderPhone`.
2. Verificação de idenpotência e correlação.
3. Busca/criação do cliente na tabela `clients` (baseado no telefone do cliente).
4. Criação do lead/chamado na tabela `leads` com canal `'WHATSAPP_SOFIA'`.
5. Criação do rascunho de Ordem de Serviço na tabela `ordens_servico` com status `'CRIADO_DRAFT_SOFIA'`.
6. Registro do evento de auditoria na tabela `audit_logs` (`action: 'SOFIA_DISPATCH_RECEIVED'`).

---

### Resposta 200 OK (Sucesso)

```json
{
  "success": true,
  "hub": "hub_rrd",
  "correlationId": "sofia-req-20260905-001",
  "data": {
    "clientId": "clt_123456789",
    "leadId": "lead_987654321",
    "ordemServicoId": "os_456789123",
    "ordemNumber": "OS-2026-0001",
    "status": "CRIADO_DRAFT_SOFIA",
    "message": "Atendimento registrado com sucesso no Hub RRD"
  }
}
```

---

### Respostas de Erro

#### HTTP 400 Bad Request (Parâmetros Inválidos ou ausência de Idempotency-Key)
```json
{
  "error": "correlation_id_required",
  "message": "Cabeçalho Idempotency-Key ou X-Correlation-Id é obrigatório para idempotência"
}
```

#### HTTP 401 Unauthorized (Token Inválido)
```json
{
  "error": "unauthorized"
}
```

#### HTTP 403 Forbidden (Remetente não autorizado)
```json
{
  "error": "sender_not_authorized",
  "message": "Telefone de remetente não autorizado para operações Sofia no Hub RRD"
}
```

#### HTTP 503 Service Unavailable (Sem Banco / Não Configurado)
```json
{
  "error": "hub_not_configured",
  "message": "Hub RRD não está com banco de dados configurado nesta instância"
}
```
