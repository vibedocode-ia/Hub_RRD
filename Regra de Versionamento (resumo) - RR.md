# Regra de Versionamento de Projetos VibeDoCode

> Fonte autoritativa: `/home/vanderoliver/Antigravity/regras de versionamento/Regra de Versionamento de Projetos VibeDoCode.md`
> Esta é uma cópia-resumo local para o projeto **37 - RR Desentupidora**. Em dúvida, consulte a mestre.

## Obrigatório (mandatório)
Formato **V[MAJOR].[MINOR].[PATCH]** ex.: `V1.02.05`.

## Blocos
- **PATCH (V x.xx.XX):** pequenos ajustes/erros/textos/visual. Incrementa de 01 a 99 a cada commit de detalhe.
- **MINOR (V x.XX.00):** nova funcionalidade/página/refatoração concluída. Incrementa de 01 a 99; PATCH zera.
- **MAJOR (V XX.00.00):** arquitetura/rebranding ou MINOR @ 99. Só sob comando explícito; MINOR e PATCH zeram.

## Arquivos e regras
- **Log obrigatório:** `atualizaçoes do projeto.md` na raiz — registro cronológico por versão.
- **Visibilidade:** versão visível na UI (rodapé) e em fonte mono, opacidade ~40-60%.
- **Deploy:** NENHUM deploy sem incremento; commit padronizado `release: Version Vx.xx.xx`.
- **Script:** `./bump-version.sh patch|minor|major "Descrição"` sincroniza package.json/package-lock, `src/lib/version.ts` (VERSION/APP_VERSION/APP_VERSION_DATE) e o changelog.

## Guardião de contexto
- Arquivo `allchat-37 - RR Desentupidora.md` — anexar bloco ao fim de cada fase e atualizar índice.
