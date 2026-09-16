import { asc } from 'drizzle-orm'
import { companyAccounts, db } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect } from 'next/navigation'
import ContasClient from './ContasClient'
export const dynamic='force-dynamic'
export default async function ContasPage(){
  if(!await requireLocalPermission('financial.read')) redirect('/portal')
  const accounts=db?await db.select().from(companyAccounts).orderBy(asc(companyAccounts.name)):[]
  return <ContasClient initial={accounts}/>
}
