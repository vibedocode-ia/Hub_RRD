#!/usr/bin/env sh
set -eu

: "${POSTGRES_RRD_URL:=${DATABASE_URL:?POSTGRES_RRD_URL or DATABASE_URL must be configured}}"
export POSTGRES_RRD_URL

node scripts/reconcile-drizzle-history.cjs
npm run db:migrate
exec next start
