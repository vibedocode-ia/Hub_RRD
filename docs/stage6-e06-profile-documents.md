# E06 — perfil e vertical documental RR comprovados localmente

## Vertical documental funcional (substitui o bloqueio anterior)

`create_service_draft`, `update_service_draft` e `issue_service_draft` aceitam envelope soberano estrito. O dispatcher constrói `externalAuthor` somente após segredo Central dedicado + validação Hub/grant/envelope; não recebe autoria do JSON. Ownership e replay vinculam grant + Hub + sender + papel + authorKind. Caminho ordinário mantém RBAC local e autoria legada. Removido o bloqueio `CENTRAL_DOCUMENT_AUTHOR_BINDING_REQUIRED`.

Create/update retornam `review` canônico (reviewVersion, effectiveValues e modelo). Para emissão Central, enviar `confirmed:true` e `reviewVersion` da última revisão; atualização invalida revisão anterior. Valores/modelo não podem ser trocados durante issue. O emissor canônico continua validando destinatário existente, consentimentos opcionais, modelo/fonte/placements, locks e snapshots. Central persiste autor externo em documento/proposta e metadata de audit; `createdById`, `reviewedById`, `actorUserId` ficam null, sem criar pessoa/membership ou apropriar identidade local. Documento convertido não pode ser alterado via update de draft.

### Prova reproduzível

```sh
# PostgreSQL16 descartável, bind apenas loopback; nenhum banco vivo.
RRD_DOCUMENT_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:33055/rrd_document_test \
 node --import tsx --test tests/stage6-e06-document-vertical.test.ts
```

Resultado: **1 pass, 0 fail, 0 skipped**. Teste aplica todas as migrations do journal + migration preparada de autoria (fora journal) após reset SOMENTE da base descartável com URL validada. Executa export POST real (bundle esbuild, nenhum mock DB/issuer/renderer): cria ORCAMENTO para lead fixture → altera valor → recusa revisão antiga e ausência de confirmação → nova confirmação → emissão canônica → SQL readback documento/proposta/audit/draft → replay legítimo; outro grant/Hub e replay alheio recusados; atualização pós-emissão recusada e documento idêntico; users=0.

Renderer registrado real PDF.js/canvas: HTML 564075 bytes. Chrome real gera PDF **14020 bytes, 1 página**, PDF.js reabre e extrai `Ana Exemplo` e `400,00`. Artefatos locais: `/root/.hermes/cache/scratch/e06-issued.html` e `e06-issued.pdf`. Segredos, destinatário e template são fixtures explícitas descartáveis; nenhuma identidade de ator fictícia foi persistida.

### Limites explícitos

- Vertical comprovada: orçamento para lead existente no RR, POST export real, não servidor HTTP/SSR Next.
- Atualização posterior: HVD agora encadeia review/confirmed e prova conversa → conector/cofre reais → export POST RR → PostgreSQL/PDF/arquivo retornado; ver `docs/stage6-e06-conversation-vertical.md` no candidato HVD. Canal/anexo com ACK continuam pendentes; PDF local não prova entrega WhatsApp/Telegram.
- Outros docTypes, destinatário client e revisão/supersede soberana não receberam vertical; não marcar homologados. Archive soberano recebeu depois prova conversacional com lifecycle real, snapshot intacto e externalAuthor no audit.
- Migration de autoria continua preparada fora journal; não aplicada em produção. Sem commit/deploy; E05/bridge intocados. E06 global sujeito à aceitação do pai.

## Histórico anterior de perfil (seções abaixo não são o estado documental atual)

## Resultado local, sujeito à validação do pai

Perfil soberano usa o serviço existente `executeSofiaManagedPersonProfile`, com opção server-only de autoridade passada exclusivamente depois de autenticação pelo segredo Central dedicado e policy do envelope. Não transforma GodAdmin em ADMIN/OWNER nem cria conta ou membership. Resolve eventual usuário local por telefone autenticado; sem usuário local, `audit_events.actor_user_id` é null e metadata preserva grant, Hub e remetente autenticado. Esta é auditoria externa explícita, não autoria documental falsa.

Mantidos schema estrito, bloqueio de mudança de telefone/identidade, invariantes de último administrador, revogação de sessões, transação/audit rollback. O caminho ordinário conserva permissões e hierarquia locais. `get_my_profile`/`update_my_profile` soberanos reutilizam o mesmo serviço, com alvo derivado do remetente, sem ganhar campos de autoridade no payload pessoal.

## Checklist contrato → dispatcher (domínios relevantes)

- [x] `get_person_profile` / `update_person_profile`: schemas aceitam envelope soberano; handler passa autoridade validada; serviço transacional consulta/altera e audita.
- [x] `get_my_profile` / `update_my_profile`: schemas existentes preservados; dispatcher usa serviço gerenciado somente na lane soberana; alvo é o próprio remetente.
- [x] `get_document_template`: contrato soberano e ramo implementado já existentes; não alterados.
- [x] `create_service_draft` / `update_service_draft` / `issue_service_draft`: integrados e comprovados na vertical documental RR descrita no topo; conversa HVD depois comprovada; canal/ACK continuam pendentes.
- [x] `archive_document`: lifecycle canônico aceita autor Central externo (audit actorUserId null + externalAuthor) após autenticação; ordinário resolve UUID local, nunca telefone em coluna UUID. Prova conversacional HVD confirmou status ARQUIVADO preservando payload/HTML.
- [x] `update_document`: bloqueio 409 intencional por domínio, não autoridade: documento emitido segue imutável; continuidade deve ocorrer por rascunho/revisão e emissor canônico, não edição direta de snapshot.
- [x] Emissor canônico localizado em `src/lib/sofia-issue-draft.ts`: valida identidade única do destinatário, modelo registrado, revisão, renderer, locking, proposta, persistência e auditoria na mesma transação. Não recriado.

## Impedimento documental histórico superado

A autoria distinta, o ownership/replay e o emissor soberano foram integrados conforme prova no topo. Não há fake user nem substituição do issuer/template/renderer. Os resultados de perfil a seguir permanecem como evidência anterior independente.

## Prova executada

```sh
# No candidato RR /root/.hermes/cache/scratch/release-rrd-6-1
# Container PostgreSQL 16 descartável, porta loopback dinâmica (nesta execução 33052).
RRD_PROFILE_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:33052/rrd_people_test \
  node --import tsx --test tests/sofia-person-service-postgres.test.ts
# 11 pass, 0 fail, 0 skipped
npx tsc --noEmit --pretty false
# exit 0
git diff --check
# exit 0
```

Teste real inclui alteração descritiva e readback pelo handler/SQL; ator soberano sem linha local; alvo OWNER; audit null + grant e remetente explícitos; contagem de usuários inalterada; token ordinário incapaz de forjar autoridade; troca de telefone rejeitada. Identidades/segredos de transporte são fixtures sintéticas explícitas; executor/negócio/Drizzle/PostgreSQL não são mocks. Não houve consulta de identidade pessoal em produção nem emissão por fixture inventada.

Arquivos desta unidade: `src/lib/sofia-person-profile-service.ts`, delta de perfil em `src/app/api/sofia/actions/route.ts`, `tests/sofia-person-service-postgres.test.ts`, este documento. Demais dirty preexistentes preservados. Sem commit/deploy/migration viva. E06 não marcado aceito.
