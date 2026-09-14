import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db, users } from '@/db'
import { getSessionUser } from '@/lib/auth'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Meu perfil · Hub RR' }

export default async function ProfilePage() {
  const session = await getSessionUser()
  if (!session) redirect('/portal/login?from=/portal/perfil')
  if (!db) return <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-sm text-red-200">Banco indisponível.</div>
  const [profile] = await db.select({ id: users.id, name: users.name, phone: users.phone, email: users.email, role: users.role, jobTitle: users.jobTitle, photoUrl: users.photoUrl, company: users.company, city: users.city, state: users.state, instagramUrl: users.instagramUrl, websiteUrl: users.websiteUrl, personalNotes: users.personalNotes }).from(users).where(eq(users.id, session.id)).limit(1)
  if (!profile) redirect('/portal/login?from=/portal/perfil')
  return <ProfileClient profile={profile} />
}
