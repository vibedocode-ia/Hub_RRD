import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireLocalPermission } from '@/lib/require-local-permission';
import { ArrowLeft } from 'lucide-react';
import { db, clients, clientAddresses, contacts } from '@/db';
import { eq } from 'drizzle-orm';
import EditClientForm from './EditClientForm';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
export default async function EditClientPage({ params }: Props) {
  if (!await requireLocalPermission('crm.read')) redirect('/portal');
  const { id } = await params;
  if (!db) return <div>Banco indisponível.</div>;
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) notFound();
  const [address, contactOptions] = await Promise.all([
    db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).limit(1),
    db.select({ id: contacts.id, name: contacts.name, phone: contacts.phone }).from(contacts).where(eq(contacts.clientId, id)),
  ]);
  const initial = { ...client, ...(address[0] || {}), contactId: contactOptions[0]?.id || '' };
  return <div className="max-w-3xl mx-auto space-y-6"><Link href={`/portal/crm/${id}`} className="inline-flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft className="w-4 h-4" /> Voltar</Link><h1 className="text-2xl font-black text-slate-100">Editar cliente</h1><EditClientForm initial={initial} contacts={contactOptions} /></div>;
}
