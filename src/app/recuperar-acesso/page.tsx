import RecoveryPasswordClient from './RecoveryPasswordClient'

export const dynamic = 'force-dynamic'

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  return <RecoveryPasswordClient token={token} />
}
