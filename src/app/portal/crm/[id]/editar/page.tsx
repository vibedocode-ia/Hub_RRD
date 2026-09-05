import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db, clients, clientAddresses } from '@/db';
import { eq } from 'drizzle-orm';
import EditClientForm from './EditClientForm';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  if (!db) return <div>Banco indisponível.</div>;
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) notFound();
  const [address] = await db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).limit(1);
  const initial = { ...client, ...(address || {}) };
  return <div className="max-w-3xl mx-auto space-y-6"><Link href={`/portal/crm/${id}`} className="inline-flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft className="w-4 h-4" /> Voltar</Link><h1 className="text-2xl font-black text-slate-100">Editar cliente</h1><EditClientForm initial={initial} /></div>;
}
