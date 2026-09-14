import { desc } from 'drizzle-orm'
import { db, googleIntegrations } from '@/db'
import GoogleSettingsClient from './GoogleSettingsClient'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect } from 'next/navigation'
export const dynamic='force-dynamic';export default async function Page(){if(!await requireLocalPermission('settings.manage'))redirect('/portal');const row=db?(await db.select().from(googleIntegrations).orderBy(desc(googleIntegrations.updatedAt)).limit(1))[0]:null;return <GoogleSettingsClient email={row?.primaryEmail??''} connected={Boolean(row?.status==='CONNECTED'&&row.tokenCiphertext)}/>}