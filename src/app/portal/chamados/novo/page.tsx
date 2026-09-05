import Link from 'next/link';
import { db, clients, clientAddresses } from '@/db';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import NovoChamadoForm from './NovoChamadoForm';

export const metadata = {
  title: 'Abrir Chamado · Hub RR',
};

export default async function NovoChamadoPage() {
  let clientOptions: Array<{ id: string; name: string; phone: string; addressId?: string; addressText?: string }> = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: clients.id,
          name: clients.name,
          phone: clients.phone,
          addressId: clientAddresses.id,
          street: clientAddresses.street,
          number: clientAddresses.number,
          neighborhood: clientAddresses.neighborhood,
        })
        .from(clients)
        .leftJoin(clientAddresses, eq(clients.id, clientAddresses.clientId));

      clientOptions = records.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        addressId: r.addressId || undefined,
        addressText: r.street ? `${r.street}, ${r.number} - ${r.neighborhood}` : 'Sem endereço',
      }));
    } catch (e) {
      console.error('Erro ao buscar clientes:', e);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/portal/chamados"
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            Abertura de Chamado / Atendimento <ClipboardList className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400">Registre ordens de serviço de desentupimento, hidrojateamento ou limpa fossa</p>
        </div>
      </div>

      <NovoChamadoForm clients={clientOptions} />
    </div>
  );
}

// Helper eq import if needed for server components
import { eq } from 'drizzle-orm';
