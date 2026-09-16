import { desc, eq } from 'drizzle-orm'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { clients, db, proposals, serviceRequests } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect } from 'next/navigation'
import PropostasClient from './PropostasClient'
export const dynamic='force-dynamic'
export const metadata={title:'Propostas · Hub RR'}
export default async function PropostasPage(){if(!await requireLocalPermission('crm.read'))redirect('/portal');const rows=db?await db.select({proposal:proposals,clientName:clients.name,service:serviceRequests.serviceType}).from(proposals).innerJoin(clients,eq(proposals.clientId,clients.id)).leftJoin(serviceRequests,eq(proposals.serviceRequestId,serviceRequests.id)).orderBy(desc(proposals.createdAt)).limit(200):[];const data=rows.map(r=>({...r.proposal,clientName:r.clientName,service:r.service}));return <div className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Gestão comercial</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-100">Propostas <FileText className="h-5 w-5 text-cyan-400"/></h1><p className="mt-1 text-sm text-slate-400">Pipeline real: rascunho, envio, negociação, aprovação e conversão.</p></div><Link href="/portal/sofia-drafts" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500"><Plus className="h-4 w-4"/>Criar via Sofia</Link></header><PropostasClient initial={data}/></div>}
