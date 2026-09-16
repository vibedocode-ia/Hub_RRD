import { agendaEvents, clients, contacts, db, teams, vehicles } from '@/db'
import { asc, eq } from 'drizzle-orm'
import AgendaClient from './AgendaClient'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect } from 'next/navigation'
export const dynamic='force-dynamic'
export default async function Page(){if(!await requireLocalPermission('operations.read'))redirect('/portal');const [events,people,companies,equipes,frotas]=db?await Promise.all([db.select().from(agendaEvents).where(eq(agendaEvents.status,'SCHEDULED')).orderBy(asc(agendaEvents.startsAt)),db.select({id:contacts.id,name:contacts.name}).from(contacts).where(eq(contacts.isActive,true)),db.select({id:clients.id,name:clients.name}).from(clients).where(eq(clients.isActive,true)),db.select({id:teams.id,name:teams.name}).from(teams).where(eq(teams.isActive,true)).orderBy(asc(teams.name)),db.select({id:vehicles.id,name:vehicles.name}).from(vehicles).where(eq(vehicles.isActive,true)).orderBy(asc(vehicles.name))]):[[],[],[],[],[]];return <div className="space-y-6"><header><h1 className="text-2xl font-black">Agenda</h1><p className="text-sm text-slate-400">Equipe e veículo podem ser vinculados em cada compromisso.</p></header><AgendaClient initial={events} contacts={people} clients={companies} teams={equipes} vehicles={frotas}/></div>}
