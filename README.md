# Site + Hub RRD — RR Desentupidora (VibeDoCode)

App Next.js (Next 15 · React 19 · TypeScript · Tailwind v4 · Drizzle/Postgres a seguir) do
**Site institucional** da RR Desentupidora + **Hub RRD (RR Gestão Inteligente 24/7)**.

## Como rodar
```bash
npm install
./bump-version.sh patch "descrição"     # ao mudar (obrigatório antes de deploy)
npm run dev
```

## Estrutura
- `src/app/page.tsx` — landing institucional (rota `/`).
- `src/app/portal/*` — área de acesso ao Hub (gate de senha) — placeholder do MVP.
- `src/lib/version.ts` — versão exibida na UI (mantida pelo bump-version.sh).

## Regras
1. **Versionamento** obrigatório `V[X.XX.XX]` (ver `Regra de Versionamento de Projetos VibeDoCode.md`).
2. Commit de deploy padronizado: `release: Version Vx.xx.xx`.
3. Guardião:** append em `allchat-37 - RR Desentupidora.md` após cada fase e atualizar índice.
4. URL de deploy alvo: **`https://rrd.vibedocode.pro`** (subdomínio no VPS / Coolify).

## Documentos do projeto
- PRD do Hub RRD: `Docs/PRD_Hub_RRD.md`.
- Dossiê/reunião/modelos: em `Docs/`.

> Segurança: nunca commitar `.env`/credenciais. A senha do gate de acesso ao hub é placeholder demo nesta versão (MVP de estrutura); a autenticação real entra na fase de Hub.
