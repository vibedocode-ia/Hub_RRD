import { desc } from 'drizzle-orm'
import { db, googleIntegrations } from '@/db'
import GoogleSettingsClient from './GoogleSettingsClient'
export const dynamic='force-dynamic';export default async function Page(){const row=db?(await db.select().from(googleIntegrations).orderBy(desc(googleIntegrations.updatedAt)).limit(1))[0]:null;return <GoogleSettingsClient email={row?.primaryEmail??''} connected={Boolean(row?.status==='CONNECTED'&&row.tokenCiphertext)}/>}