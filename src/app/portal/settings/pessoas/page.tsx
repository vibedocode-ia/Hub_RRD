import { redirect } from 'next/navigation'
import { getCurrentLocalAccess } from '@/lib/local-access'
import PeopleAccessClient from './PeopleAccessClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pessoas e Acessos · Hub RR' }

export default async function PeopleAccessPage() {
  const access = await getCurrentLocalAccess()
  if (!access) redirect('/portal/login?from=/portal/settings/pessoas')
  if (!access.permissions.includes('people.manage')) redirect('/portal/settings')
  return <PeopleAccessClient currentUserId={access.id} />
}
