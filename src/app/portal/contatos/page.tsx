import { clients, contacts, db } from '@/db'
import { asc, eq } from 'drizzle-orm'
import ContactsClient from './ContactsClient'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect } from 'next/navigation'
export const dynamic='force-dynamic';export default async function Page(){if(!await requireLocalPermission('crm.read'))redirect('/portal');const [people,companies]=db?await Promise.all([db.select().from(contacts).where(eq(contacts.isActive,true)).orderBy(asc(contacts.name)),db.select({id:clients.id,name:clients.name}).from(clients).where(eq(clients.isActive,true)).orderBy(asc(clients.name))]):[[],[]];return <div className="space-y-6"><header><h1 className="text-2xl font-black">Contatos</h1><p className="text-sm text-slate-400">Pessoas reais do relacionamento, vinculadas a uma empresa somente quando fizer sentido.</p></header><ContactsClient initial={people} companies={companies}/></div>}