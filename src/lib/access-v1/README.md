# Etapa 4 — acesso federado HVD ↔ RR (não ativado)

Fatia server-side integrada aos dois projetos: `src/app/api/access/v1/[...segments]/route.ts` chama este serviço; os schemas nativos exportam `schema.ts`. Não é um servidor-demo com ACK/membership em memória. Contas usam `users.id`/verificador nativo; permissões RR também são gravadas em `user_permissions`. Sessões v1, inbox/outbox, decisões, ACKs e desired/applied estão em PostgreSQL.

## Reproduzir

Pré-requisitos: Node >=22, Docker acessível, OpenSSL, imagem **já local** `postgres:16-alpine`, ambos checkouts atuais e dependências dos projetos. Sem configuração/credenciais reais.

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix src/lib/access-v1
ETAPA4_RRD_ROOT=/caminho/etapa4-rrd npm run test:access-v1:unit
ETAPA4_RRD_ROOT=/caminho/etapa4-rrd npm run test:access-v1
```

No RR, definir `ETAPA4_HVD_ROOT=/caminho/etapa4-hvd` e executar os mesmos comandos; o wrapper importa o harness HVD e fixa o checkout RR. O harness gera PKI/Ed25519 descartáveis, inicia **dois containers/bancos diferentes**, publica portas aleatórias exclusivamente em 127.0.0.1 e executa os exports **GET/POST/PATCH reais das rotas Next** dentro do adaptador HTTPS TLS1.3. Não inicia o servidor de páginas Next nem prova UI. Toda criação/alteração da jornada passa pelos handlers; apenas os dois gestores iniciais, a grant e o estado de suspensão do teste são fixtures SQL sintéticas.

O canal de setup do teste é um spool local privado (arquivo 0600 em diretório descartável), não e-mail/SMS/WhatsApp enviado. Desafios de setup/e-mail/telefone são aleatórios, persistidos somente por digest, consumidos via HTTPS; o teste lê o spool como destinatário. Isso prova consumo e vinculação dos desafios, **não entrega externa nem posse de números reais**. O runtime normal falha 503 se não houver adaptador local de verificação: nunca inventa confirmação/envia mensagem real.

`ETAPA4_FORCE_FAILURE=1` força saída não-zero após o bootstrap, exercitando o `finally` de limpeza. Não é teste de caos distribuído. Não reutiliza nenhum container ou DB de produção e não limpa recursos alheios.

## Reprodutibilidade da fixture

A sondagem de subida do PostgreSQL usa conexões descartadas em `finally` a cada tentativa; o pool funcional é criado somente após readiness. Reutilizar o pool que recebeu falhas de startup conservava backoff por conexão no driver `postgres`: o primeiro checkout concorrente da introspecção podia esperar além do timeout mTLS e a criação retornar HTTP 500 intermitente. A correção é exclusivamente no harness HVD, também importado pelo wrapper RR; não aumenta timeout, não repete a operação administrativa e não altera asserções, handlers ou política de autoridade.

## Protocolo e autoridade reais

- Schema exato da etapa 3: `contract.schema.json`; validação fechada Ajv 2020-12, parse que rejeita chaves duplicadas/Unicode inválido, limite 256 KiB.
- RFC8785 JCS pela biblioteca canonicalize; Ed25519 com chaves distintas de message/proof; mTLS TLS1.3 com CA e fingerprint peer pinados no registro. Nunca confiar em headers de proxy como certificado.
- Request assinado: método/path/digest/request_id/tempo/Hub/emissor; nonce persistido, janela 60s. O TLS identifica o serviço; cookie local resolve a pessoa e grant GodAdmin ativa resolve autoridade global.
- Proof instalada, ator/Hub/audience/TTL <=900s/confirmation iguais. Extensão interna fechada `/federation/authorizations` instala decisão autenticada que vincula `authorization_ref` ao digest integral do command payload, ator, operação e prova. Não é quinto tipo de evento.
- Antes do efeito global, introspecção assinada via mTLS na Central consulta grant real. Só indisponibilidade de rede permite usar prova instalada ainda válida; login local não chama a Central.
- Inbox idempotente e ACK imutável são gravados junto do efeito/auditoria/outbox. Desired permanece queued até ACK criptograficamente validado e compatível com digest/version. Replay exato retorna ACK original, inclusive depois da revogação.
- Worker explícito, sem scheduler instalado; backoff e limite de 20 tentativas por item, dead_letter. Nenhum ACK gerado em resposta a ACK. Rate limit básico por processo/peer/identificador: 20 tentativas/min; escolha do executor, não política de escala aprovada.

## Integração e ativação

**OFF por padrão** (`ACCESS_V1_ENABLED` precisa ser exatamente `true`). Sem flag, as rotas v1 retornam 404 antes de configurar DB; caminhos legados não consultam a nova estrutura. Com flag habilitada, o guard no login legado recusa identificador piloto, sem fallback. Não há UI/corte de tráfego nesta entrega.

Configuração futura: `ACCESS_V1_CONFIG_FILE` absoluto e 0600, campos `side` (`central` no HVD / `hub` no RR), `hubId`, `epoch`, `databaseUrl`, `origin`, `peerUrl`, `peerFingerprint`, caminhos `messagePrivateKeyFile`, `messagePublicKeyFile`, `peerMessagePublicKeyFile`, `proofPublicKeyFile`, `proofPrivateKeyFile` (só Central), `tlsKeyFile`, `tlsCertFile`, `tlsCaFile`. Registro e URLs são administrados, não vêm do body. Não criar esse arquivo com segredos no repo.

O Next HTTP padrão não fornece peer TLS: mensagens federadas ali são negadas. `serve.mjs` é o ingress TLS real de loopback (porta explícita `ACCESS_V1_TLS_PORT`), usa os mesmos handlers e extrai o peer do socket. O teste instrumentaliza esse mesmo ingress para invocar os exports Next. Não foi iniciado nenhum serviço persistente nem configurado proxy/deploy. Promover o ingress e instalar transporte de verificação são gates posteriores.

## Migração

`schema.ts` é importado pelo schema Drizzle nativo. `migrations/0001_access_v1.sql` e `manifest.json` são versionados; `migrate.mjs` tem journal e hash, transação/lock e recusa qualquer alvo que não seja URL loopback de `etapa4_test` com `disposable:true`. O harness aplica duas vezes e confere duas entradas (0001 e 0002_sync). Não foi anexado SQL ao journal de produção nem executado `db:push`/migração real. `initialize()` não é chamado por rota/startup normal.

## Limite honesto da fatia

Implementados e exercitados: Operador por HVD; provisão nativa; entrega/ACK; setup local; três logins; leitura do próprio perfil com gate funcional `profile.read`; alteração de capacidade removendo permissão nativa e invalidando sessões; revogação/tombstone mantendo UUID/hash; RR→projeção HVD sem copiar credenciais; idempotência e negativos fundamentais. O teste usa as colunas nativas consumidas, não um dump completo nem todos módulos do Hub.

Não implementados/atestados: catálogo completo, painéis e SofIA, novas operações de negócio/documentos, hierarquia completa/gestão de SuperAdmins, ciclo de múltiplos GodAdmins, vínculos/claims globais verificados, migração de legados, troca/reset próprio de senha, cutover/rollback produtivo, restore/rotação de chaves, clear/regrant, reconciliação periódica automática e o protocolo completo além dos cenários controlados da etapa 5. Mensagens/operações fora da fatia falham fechadas, não simulam aplicação. A janela de saga da etapa 4 foi tratada na etapa 5 com intenção durável anterior ao efeito e reserva remota idempotente, conforme seção abaixo. `sofia.use` persistida não prova execução Sofia. Nenhum usuário real foi acessado ou migrado.

Builds completos: a primeira rodada intencionalmente offline falhou no fetch Google Fonts dos layouts existentes; não era prova de indisponibilidade geral da rede. Após autorização de fetch de dependências, **ambos builds reais passaram** com `NODE_USE_SYSTEM_CA=1 NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`, validação TLS mantida e fontes reais obtidas pela rede. Não foram alterados layouts nem usadas fontes/respostas fictícias. DATABASE_URL e POSTGRES_RRD_URL foram fixados em loopback fechado `127.0.0.1:1/etapa4_test`, flag v1 OFF. As chamadas do teste integrado continuam somente em loopback. Build, typecheck e HTTP+PostgreSQL são evidências distintas de deploy.


## Etapa 5 — autonomia e sincronização controladas

Executar `ETAPA4_RRD_ROOT=/caminho/etapa4-rrd npm run test:access-v1:autonomy` no HVD; no RR usar `ETAPA4_HVD_ROOT=/caminho/etapa4-hvd` e o mesmo script. `ETAPA5_FORCE_FAILURE=1` exercita contraprova de cleanup; `ETAPA5_EVIDENCE_FILE=/caminho/privado/readback.json` grava consultas reais sanitizadas para revisão após remover os bancos.

- Central fisicamente parada: três logins locais e perfil, Admin LOCAL legítimo cria Operador; outbox pendente sobrevive a dois processos distintos de entrega; reconexão ingere uma vez e devolve ACK real. Sessões respeitam 24h/8h, sem lease de membership.
- RR parado: transição soberana grava desired e comando antes da rede; applied permanece anterior. Criação grava `access_provision_intents` antes de qualquer provisão remota. Perda da resposta de provisão após commit RR deixa intenção pendente; replay usa a mesma chave de reserva e recupera UUID/target sem órfão/segunda criação.
- `access_delivery_context` persiste Proof/decisão junto do comando. Expiração não é renovada automaticamente. Para intenção de provisão pendente, POST `/central/provision-intents/{ref}/retry`, `{confirmed:true}`, sessão GodAdmin fresca do mesmo ator e Idempotency-Key autoriza explicitamente nova Proof no mesmo intento. Comando já emitido conserva seus bytes/IDs: expiração resulta em rejeição persistida; um novo ato confirmado emite novo command/message/revisão.
- Entrega consulta GET `/federation/messages/{id}/result` antes de reinstalar Proof: ACK perdido após commit pode ser recuperado mesmo após expiração, conferindo digest original e ACK assinado. Nunca reaplica nem reautoriza efeito.
- PATCH `/local/memberships/{target}` é a fatia mínima de edição/disable/enable para testar partição: sessão fresca, capabilities, hierarquia estrita, anti-self, CAS e idempotência; somente capabilities operacionais conhecidas, sem papel novo. Estado, auditoria, invalidação de sessões e evento são transacionais.
- `membership.block` é restritivo: supera L concorrente sem copiar role/caps antigas de desired, mantém UUID/credencial/estado local e bloqueia operações após commit. Central recebe estado real divergente de desired por `/federation/reconcile` autenticado, validado contra versão/digest do ACK; não fabrica applied a partir do pedido.
- Conflito CAS mantém estado efetivo, grava `access_conflicts` em ambos, ACK e desired separado. Nova transição exige `rebase_of` do conflito conhecido, confirmação fresca e versão exata; não usa timestamp, união de capabilities ou retry permissivo automático. Rebase desta fatia preserva local_disabled; não implementa liberação/regrant implícito.
- Reordenação block/revoke antes de set anterior e replay exato não ressuscitam acesso. Proof inválida/expirada offline nega GLOBAL sem fallback; grant LOCAL legítima continua identificada como `hub_local`.

O fault adapter é exclusivamente do harness: após o handler Next real concluir/commitar, descarta a resposta e provoca HTTP 500; não substitui banco/efeito/ACK. Paradas fecham os listeners HTTPS de fato. O cenário de ACK após expiração avança somente Date.now dos dois handlers do teste por 901s e restaura em finally; fixtures de Proof vencida e limites de sessão são SQL sintético, não espera real de 15min/24h. Workers de entrega são subprocessos reais com configurações/chaves descartáveis 0600. Cleanup verifica listeners/portas fechadas, containers removidos por nome exclusivo e diretório PKI ausente.

Limites: nenhum scheduler/cron instalado, sem reconciliação periódica 60s promovida; dispatcher/outbox/result-readback e snapshot restritivo são funcionais quando chamados. Lacunas de ordem mantêm evento na outbox para retry (não há fila de gaps no destino). Não há clear_block/regrant, restore/fence de backup, rotação, escala/hardening, UI/SofIA ou migração produtiva. O estado de snapshot restritivo precisa coincidir exatamente com o ACK; se evoluir durante a leitura, falha fechado e permanece pendente, sem afirmar convergência universal. Essas extensões não foram exercitadas como aceites desta fatia.


## Etapa 6 — candidato local em evolução, NÃO concluído

Esta seção substitui somente as limitações históricas correspondentes das etapas4/5. Nenhuma flag foi ativada em produção, nenhum dado real foi migrado, nenhum commit/push/deploy foi realizado.

- `/acessos` autentica e direciona aos painéis dentro dos layouts nativos: `/dashboard/acessos` (GodAdmin HVD), `/portal/acessos` (local HVD/RR). Login nativo encaminha piloto para authv1; getters e logout nativos revalidam/revogam a mesma sessão. Um SuperAdmin local HVD NÃO é traduzido em soberano global legado.
- SuperAdmin cria/edita/revoga pares locais; Admin somente inferiores; anti-self de autoridade e proteção de último responsável; nome próprio editável sem alteração parcial de papel. Funções customizadas têm rank100, capabilities locais delegáveis, revisão e edição que atualiza permissões nativas/invalida sessões.
- GodAdmin é grant independente: proposta pending, aceite autenticado do destinatário, múltiplos ativos, revogação/suspensão, principal/último protegidos sob lock. Notificação assinada GodAdminEvent replica revisão/revogação, sem fabricar membership. O resolvedor Sofia usa o mesmo grant para contas piloto e não cai no legado após revogação.
- Central cria e altera papéis fixos remotos pelo protocolo existente; status queued/applied/conflict vem do ledger/ACK. Vínculos nunca são delete físico. Custom roles remotas e diretório multiHub/links estáveis ainda requerem continuação.
- Integração real `conversation-runtime.ts` oferece capacidades fechadas access_directory/access_create/access_roles/access_role_create/access_sources/access_knowledge. Modelo somente escolhe capacidade e argumentos; identidade/Hub/autoridade são server-side. Escrita gera proposta persistida e exige outra mensagem confirmatória com código de uso único, vinculada a identidade/chat/payload/revisão; não renova authority expirada. GodAdmin só cria acesso remoto com `requestedHubId` explícito e registrado, nunca Hub escolhido pelo modelo ou padrão implícito.
- `/knowledge/catalog` e `/knowledge/query` usam o leitor bounded existente, registro privado de fontes, versões e digests de documentos explicitamente aprovados. Não copiam corpus/skills reais. PrivadoHub exige knowledge.read no Hub e privadoGlobal exige grant. Conteúdo diferente do digest aprovado não é devolvido. Registro opcional no config0600: knowledgeSources[{source_ref,kind,scope,hub_id,version,provenance_ref,manifestFile,approved:[{reference,digest}]}]. Não colocar configuração privada no Git. Compartilhamento opt-in dinâmico/federado ainda não implementado.
- Migrations0003_roles e0004_channel e schema Drizzle versionados; runner continua recusando alvos fora do descartável. Contagem do journal de teste é derivada do manifest, não hardcoded2. Histórico0001/0002 e probes de readiness foram preservados.

Reproduzir testes reais de hierarquia/concor­rência/acervo/Sofia (modelo e canal sintéticos, bancos reais separados):

```sh
# HVD
ETAPA4_RRD_ROOT=/root/.hermes/cache/scratch/etapa4-rrd npm run test:access-v1:stage6
# RR wrapper
ETAPA4_HVD_ROOT=/root/.hermes/cache/scratch/etapa4-hvd npm run test:access-v1:stage6
```

Browser: harness privado `/root/.hermes/cache/scratch/etapa6/browser-test.mjs`, executado a partir do HVD com `ETAPA6_SIDE=central` ou `hub` e `node --import tsx <harness>`. Instalação Playwright fica só no scratch; script gera senha aleatória em fixture0600, usa Next HTTPS real loopback e Chromium, preenche por código protegido e verifica botões→servidor→PostgreSQL, incluindo desktop/mobile. Não usa endpoints fake, senha real, TLS desabilitado no app, fonte de build mockada ou navegador em produção. `ETAPA6_FORCE_FAILURE=1` força falha após a jornada para exercitar finally. Os logs e screenshots são privados e exclusivamente sintéticos.

Lacunas bloqueantes para fechar a etapa6: diretório unificado pessoa↔múltiplosHubs com links verificados e registry de múltiplos peers; CRUD global de funções custom remotas; consumo dos novos papéis RR na resolução/conector do runtime Central (não confundir teste interno do adapter com canal); fonte opt-in versionada/revogável com propagação; jornada UI completa de configuração local segura e seu adaptador de entrega fixture; catálogo de negócio além da fatia de perfil/acervo; invariantes conversacionais completas e efeitos após revogação em todas essas extensões. Não chamar o candidato de etapa6 concluída só porque os gates desta fatia passaram. Produção, migração piloto e etapa7 continuam proibidas.
