import type { Metadata } from 'next'
import RecoveryPasswordClient from './RecoveryPasswordClient'

export const dynamic = 'force-dynamic'

// The one-time token arrives in the query string: keep the document out of any cache
// (force-dynamic renders it no-store) and never leak it through the Referer header.
export const metadata: Metadata = { referrer: 'no-referrer' }

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  return <RecoveryPasswordClient token={token} />
}
