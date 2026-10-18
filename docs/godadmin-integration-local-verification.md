# GodAdmin RR — correção local no candidato

Base: `1014673daf2c5446aa3d3401557fb76fb1b4d893`, candidato `/root/.hermes/cache/scratch/release-rrd-6-1`. Alterações anteriores preservadas; nenhum reset, commit, push, deploy ou banco de produção.

## Trace e correção

- `access-v1/service.mjs` autentica a assertion e verifica assinatura, Hub, audience, ator, confirmação, capabilities, validade e grant em `proofCheck`. `roles.mjs` já adquire lock e transação antes de chamar esse verificador.
- A restrição artificial em `roles.mjs` negava POST/PATCH antes da proof. Variante HVD consultada read-only: `/root/.hermes/cache/scratch/release-hvd-6-1/src/lib/access-v1/roles.mjs`.
- RR agora exige `access.roles.manage` em GET e `people.manage` nas mutações; somente após proof constrói o actor soberano com catálogo completo. Mantém confirmed, revisão, audit, idempotência e propagação aos vínculos. Não transforma GodAdmin em membership de Hub.
- `/api/sofia/actions` mantém segredo Central independente e gate local para tráfego ordinário. A policy autentica a identidade/envelope, sem o antigo teto de três ações CRM. Parsers continuam selecionando operações implementadas e validando seus dados.
- CRM aceita também create/archive; domínio aceita envelope GodAdmin sem contact/client inventados. Schemas operacionais de consulta de serviços, equipes ativas e modelo documental aceitam a identidade Central. Consulta de modelo por GodAdmin não exige permissões locais.

## Evidência executada

```sh
node --import tsx --test tests/godadmin-actions-route.test.mjs src/lib/access-v1/test/godadmin-role-catalog-read.test.mjs tests/godadmin-central-contract.test.ts tests/godadmin-local-gate-preserved.test.ts
# exit 0: 16 pass, 0 fail, 0 skipped
npx tsc --noEmit --pretty false
# exit 0, sem diagnósticos
git diff --check
# exit 0
RRD_GODADMIN_BASELINE_RED=1 node --import tsx --test tests/godadmin-actions-route.test.mjs
# RED intencional: exit 1; 1 pass / 2 fail. Baseline exata carregada em memória.
# Positivo create_team: baseline devolve 403 onde se exige 201.
```

O harness compila e executa o export POST real com autenticação, policy, parsers e validadores reais; somente DB é substituído por armazenamento em memória com predicados Drizzle reais de igualdade. Não é PostgreSQL, servidor HTTP Next, modelo, canal, produção ou E2E físico. Falha inicial do harness de contagem local foi corrigida: schemas no bundle têm objetos distintos; comparação deve usar nome de tabela, não identidade do objeto. Duas execuções verdes da rota após o ajuste.

## Aceite local

- [x] GET funções com proof adequada e catálogo completo.
- [x] Criar/editar função GodAdmin; confirmação e revisão protegidas.
- [x] Proof read-only não muta; confirmação inválida não muta.
- [x] Sessão local permanece com fresh e chave de idempotência local.
- [x] Rota real: criar/editar equipe, consultar equipes ativas e estoque.
- [x] Rota real: criar/listar/editar/arquivar cliente com readback do estado isolado; retry de criação não duplica.
- [x] Token ordinário não forja GodAdmin, Hub diferente negado, dados inválidos não escrevem, tráfego local continua exigindo acesso ativo.
- [x] Typecheck e whitespace check.

## Limites explícitos — NÃO alegar CRUD total

- Criação/edição/emissão de rascunhos documentais ainda exigem autoria local real e colunas contact/client vinculadas. O caminho Central recebe 409 `CENTRAL_DOCUMENT_AUTHOR_BINDING_REQUIRED` sem escrever. Nenhuma confirmação, imutabilidade ou issuer canônico foi contornado. Implementar binding de autoria Central, persistência e confirmação documental compatíveis é trabalho adicional; schemas documentais mutantes permanecem no contrato local anterior.
- `archive_document` continua no lifecycle existente, que resolve autor local; `update_document` continua imutável/409. Não foram validados como operações soberanas completas.
- Schemas de perfil já aceitam GodAdmin, mas os executores ainda resolvem ator local, permissões e hierarquia; não houve mudança nesses serviços. Perfil Central sem ator local e mudança de telefone/identidade exigem trabalho adicional. A remoção da allowlist permite chegar ao serviço, não comprova edição soberana de perfis.
- Não foi afirmada cobertura de cada operação aceita pelos parsers. Listagens `list_teams`/`list_equipment` não têm ramo dedicado evidente na rota atual; não são positivas cobertas por esta entrega.
- Testes de funções usam role manager real com SQL/proof/idempotência doubles; não provam handshake federado, locks/constraints PostgreSQL nem concorrência.
- Build completo, suites grandes e provas físicas não executados nesta unidade por escopo. Nenhuma migration criada/aplicada.

## Arquivos desta unidade (não confundir com dirty anterior)

1. `src/lib/access-v1/roles.mjs`
2. `src/lib/access-v1/test/godadmin-role-catalog-read.test.mjs`
3. `src/lib/sofia-godadmin-policy.ts`
4. `src/lib/sofia-actions.ts`
5. `src/app/api/sofia/actions/route.ts`
6. `tests/godadmin-central-contract.test.ts`
7. `tests/godadmin-actions-route.test.mjs` (novo)
8. `docs/godadmin-integration-local-verification.md` (novo)
