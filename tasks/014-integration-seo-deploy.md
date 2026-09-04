# Task 014: Integração — SEO, Assets & Deploy Prep

**Tipo:** integration
**Camada:** full-stack
**Página relacionada:** Global
**Prioridade:** P0-crítico
**Status:** ✅ Concluída
**Depende de:** 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013

## Descrição
Finalizar todas as integrações de SEO, assets de imagem e preparação para deploy no Coolify. Inclui: configuração de metadata Next.js 15, OG image, favicon, cópia dos assets de imagem para `public/assets/`, configuração do `.env.example`, bump de versão e preparação do commit de release.

## Critério de Conclusão
- [ ] `layout.tsx` com `export const metadata` completo: title · description · OG image · canonical · robots
- [ ] Meta title: "RR Desentupidora Niterói | Desentupimento 24h · (21) 99669-9191"
- [ ] Meta description: "Desentupimento, limpa fossa e hidrojateamento em Niterói 24h. 5,0 ⭐ no Google. Residências, condomínios e empresas. Ligue agora!"
- [ ] Favicon configurado via `app/favicon.ico` (usar logo RR)
- [ ] `/public/assets/rr-logo.webp` existindo (logo principal)
- [ ] `/public/assets/hero.png` existindo (imagem do hero)
- [ ] `/public/images/inea.png` · `/public/images/nr33.png` · `/public/images/nr35.jpeg` existindo (selos)
- [ ] `.env.example` criado com `PORTAL_PASSWORD=sua_senha_aqui`
- [ ] `next.config.mjs` verificado (sem `output: standalone`)
- [ ] `lib/version.ts` atualizado para `V0.03.00`
- [ ] `package.json` versão atualizada para `0.03.00`
- [ ] `atualizaçoes do projeto.md` atualizado com entry da nova versão
- [ ] `allchat-37 - RR Desentupidora.md` atualizado com o contexto desta entrega
- [ ] Build `npm run build` passa sem erros antes do commit
- [ ] Commit no padrão: `release: Version V0.03.00`
