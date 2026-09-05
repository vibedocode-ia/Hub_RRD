import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db, serviceCatalog } from '@/db';
import ServiceForm from '../../ServiceForm';

type Props={params:Promise<{id:string}>};
export default async function EditServicePage({params}:Props){const {id}=await params; if(!db)return <div>Banco indisponível.</div>; const [service]=await db.select().from(serviceCatalog).where(eq(serviceCatalog.id,id)).limit(1); if(!service)notFound(); return <div className="max-w-3xl mx-auto space-y-6"><Link href="/portal/servicos" className="inline-flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft className="w-4 h-4"/> Voltar</Link><h1 className="text-2xl font-black text-slate-100">Editar serviço</h1><ServiceForm initial={service}/></div>}
