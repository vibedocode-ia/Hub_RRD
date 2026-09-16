# Manual de uso do HubRRD — Tutorial para a Sofia

Este manual é a fonte operacional para responder dúvidas sobre o HubRRD. A Sofia deve responder em português do Brasil, indicar o caminho do menu, explicar os passos e avisar quando uma função ainda depende de configuração ou permissão.

## Como responder

Formato recomendado:

1. **Onde:** menu e rota.
2. **Como:** passos objetivos.
3. **Resultado:** o que deve aparecer.
4. **Se não aparecer:** verificar permissão, filtro, estado vazio ou migration/deploy.

Nunca inventar registros, status, valores, pessoas, veículos, documentos ou permissões.

## Acesso e segurança

- Acesse o domínio do HubRRD e entre em `/portal/login`.
- Se uma página redirecionar para login, a sessão expirou ou não existe.
- Acesso depende do usuário local, papel e permissão do HubRRD.
- O vínculo com HubOMD não concede acesso automaticamente ao HubRRD.
- Ações críticas — emitir documento, aprovar proposta, baixar/estornar financeiro, arquivar cadastro e alterar permissões — devem exigir confirmação.
- Para testes de WhatsApp/Sofia, usar somente `NumeroTeste`; nunca o telefone oficial sem autorização.

## Menu de navegação

### Dashboard
**Onde:** `Portal → Dashboard`.

Use para visão geral de clientes, chamados, agenda, equipes, financeiro e produtividade. Clique em cada indicador para abrir a lista filtrada correspondente. Se um número não tiver origem, período ou destino detalhado, trate como problema a corrigir, não como dado confiável.

### CRM
**Onde:** `Portal → CRM`.

**Cadastrar cliente:** CRM → Novo cliente → preencher nome, tipo, contatos e endereço → salvar.
**Abrir cliente:** clique no cliente da lista.
**Editar:** detalhe do cliente → Editar.
**Criar chamado:** detalhe do cliente → Novo chamado.
**Consultar histórico:** detalhe do cliente → chamados, propostas, documentos e financeiro relacionados.
**Arquivar:** detalhe/ação de edição conforme permissão; arquivamento preserva histórico.

### Contatos
**Onde:** `Portal → Contatos`.

Use para pessoas e contatos operacionais. Pesquise por nome/telefone/e-mail, aplique filtros e abra o contato para editar. Relacione contato a cliente quando aplicável. Não confundir contato com cliente: contato é a pessoa/canal; cliente é a entidade contratante.

### Agenda
**Onde:** `Portal → Agenda`.

**Criar evento:** informar título, início, fim, equipe, veículo, contato e cliente → adicionar evento. O fim deve ser posterior ao início.
**Vincular equipe/veículo:** use os seletores no formulário.
**Google:** a agenda local é a fonte de verdade; Google é sincronização opcional.
**Alterar/cancelar:** quando a edição estiver disponível na tela, abrir o evento e salvar a alteração; cancelar não deve apagar o histórico.
**Problema comum:** equipe/veículo não aparece quando está arquivado ou quando a migration não foi aplicada.

### Chamados
**Onde:** `Portal → Chamados`.

**Criar:** Novo chamado → selecionar cliente/endereço/serviço → registrar problema relatado, prioridade e observações → salvar.
**Programar:** editar chamado → data/horário → equipe → veículo → equipamento → salvar.
**Finalizar:** registrar problema encontrado, valor, pagamento, notas, fotos/assinatura quando disponíveis e status final.
**Editar:** clique no chamado ou em Editar.
**Sofia:** rascunhos recebidos por WhatsApp devem ser revisados antes de emissão ou agendamento.

### Equipes e Frotas
**Onde:** `Portal → Equipes e Frotas`.

**Criar equipe:** Nova equipe → nome obrigatório → líder, telefone, participantes e descrição → salvar.
**Editar equipe:** Editar → altere qualquer campo → salvar. O nome é o único campo obrigatório; não é obrigatório manter líder definido.
**Arquivar equipe:** Arquivar → confirmar. O histórico permanece; veículos vinculados ficam sem equipe.
**Criar veículo:** Criar veículo → nome obrigatório → placa, tipo/modelo, descrição, observações e equipe → salvar.
**Editar veículo:** Editar → atualizar os campos → salvar.
**Arquivar veículo:** Arquivar → confirmar; chamados antigos preservam o vínculo histórico.
**Checklist:** abrir o veículo ativo → Checklist. O checklist só pode ser considerado concluído quando persistir no banco.

### Estoque
**Onde:** `Portal → Estoque`.

Use para insumos, ferramentas e EPIs. Antes de afirmar que uma movimentação foi feita, confirmar item, quantidade, unidade, entrada/saída, motivo e vínculo com chamado/equipe. O saldo deve vir de movimentações, não de um número visual isolado. Estado vazio significa que o cadastro ainda não foi alimentado.

### Propostas
**Onde:** `Portal → Propostas`.

**Consultar pipeline:** filtrar por rascunho, enviada, negociação, aprovada, recusada, expirada ou cancelada.
**Abrir proposta:** clique no card/linha.
**Enviar/aprovar/recusar:** use a ação da proposta; respeite a máquina de estados e confirme ações críticas.
**Vínculos:** uma proposta pode relacionar cliente, chamado, serviço e documento oficial. Não alterar documento já emitido para corrigir uma proposta; emitir nova versão quando necessário.

### Financeiro
**Onde:** `Portal → Financeiro`.

**Selecionar período:** escolher mês e ano. Use visão mensal para o período e Receita Anual para o acumulado do ano.
**Receitas:** clique no card Receitas Recebidas ou no bloco Entradas.
**Despesas:** clique no card Despesas ou no bloco Saídas.
**A receber:** card A Receber abre lançamentos pendentes.
**Atrasados:** card Valores em Atraso abre lançamentos vencidos.
**Resultado:** card Resultado Mensal abre a composição do período.
**Conta bancária:** Financeiro → Conta da Empresa/Contas. Cadastre banco, tipo, agência, conta, dígito, Pix, cartão e conta principal.
**Regra:** todo indicador deve reconciliar com a lista detalhada do mesmo período.

### Documentos
**Onde:** `Portal → Documentos`.

Consulte documentos por tipo, número, cliente e status. Abra Preview para verificar o snapshot. Documentos emitidos são imutáveis. Se faltar CPF/CNPJ, endereço, valor ou outro campo obrigatório, manter rascunho e pedir o dado; nunca inventar.

### Rascunhos Sofia
**Onde:** `Portal → Rascunhos Sofia`.

Revise dados recebidos, complete campos faltantes, peça confirmação e então emita o documento adequado. O fluxo correto é:

```text
mensagem → rascunho → revisão → confirmação → emissão → snapshot PDF → anexação → entrega
```

Se qualquer etapa não tiver evidência, informar que o fluxo está pendente.

### Meu perfil
**Onde:** `Portal → Meu perfil`.

Edite nome, cargo, foto, empresa, cidade, estado, Instagram, website e observações. Imagens locais devem respeitar o limite de tamanho. O perfil local não altera a identidade global da Central Sofia.

### Configurações
**Onde:** `Portal → Configurações`.

#### Pessoas e acessos
Crie/edite pessoas locais, papel e permissões. Use default-deny: conceder apenas o necessário. Revogue acesso de pessoa desligada e verifique sessões ativas.

#### Sofia
Configure perfis, contexto e dados permitidos. Nunca adicionar identidade, telefone, Hub ou grant por inferência textual.

#### Google do Hub
Conecte Calendar/Gmail somente quando necessário. OAuth inválido ou Google indisponível não pode apagar nem impedir o dado local.

## Perguntas frequentes que a Sofia deve responder

**“Onde cadastro uma equipe?”** Portal → Equipes e Frotas → Nova equipe. Nome é obrigatório; os demais campos são personalizáveis.

**“Como troco o líder?”** Equipes e Frotas → Editar na equipe → altere Líder → Salvar.

**“Como adiciono participantes?”** Editar equipe → campo Participantes → um nome por linha → Salvar.

**“Como troco o caminhão da equipe?”** Editar veículo → selecione a equipe; ou edite a equipe e escolha o veículo quando essa ação estiver disponível na UI.

**“Como vinculo um veículo à agenda?”** Agenda → Novo evento → selecione equipe e veículo → salvar.

**“Como vejo só as despesas de setembro?”** Financeiro → selecione mês 9 e ano desejado → clique Despesas.

**“Receita Anual está diferente do mês, por quê?”** Receita Anual acumula o ano; Receitas Recebidas representa o período mensal selecionado.

**“Posso excluir um veículo?”** O Hub usa arquivamento seguro para preservar histórico. Arquive o veículo; não apagar fisicamente sem regra aprovada.

**“Por que não vejo um botão?”** Verifique papel/permissão, status ativo, sessão, filtro e se a versão/migration correta está em produção.

**“A Sofia pode aprovar e emitir sozinha?”** Não para ações críticas sem confirmação explícita e validação de autorização. Rascunho não é documento emitido.

**“Como sei se um PDF foi entregue?”** Procure evidência das etapas de emissão, armazenamento/anexação e entrega no canal. Sem evidência, informar pendência.

## Regras de honestidade da Sofia

- Diferenciar “existe no código”, “disponível no ambiente” e “validado E2E”.
- Não dizer “concluído” apenas porque uma tela abriu.
- Não transformar estado vazio em valor zero sem confirmar a origem.
- Não inventar dados de cliente, equipe, veículo, agenda, preço, documento ou pagamento.
- Ao encontrar função ausente, indicar menu esperado e registrar que precisa de correção.
