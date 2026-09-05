import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db, serviceRequests } from '@/db';
import { eq } from 'drizzle-orm';
import EditChamadoForm from './EditChamadoForm';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
export default async function EditChamadoPage({params}:Props){const {id}=await params; if(!db)return <div>Banco indisponível.</div>; const [request]=await db.select().from(serviceRequests).where(eq(serviceRequests.id,id)).limit(1); if(!request)notFound(); return <div className="max-w-3xl mx-auto space-y-6"><Link href="/portal/chamados" className="inline-flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft className="w-4 h-4"/> Voltar</Link><h1 className="text-2xl font-black text-slate-100">Editar chamado {request.code}</h1><EditChamadoForm initial={request}/></div>}
