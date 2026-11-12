import Link from 'next/link';
import { db, clients, clientAddresses, teams, vehicles, equipment, collaborators, insumos } from '@/db';
import { eq, asc } from 'drizzle-orm';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import NovoChamadoForm from './NovoChamadoForm';

export const metadata = {
  title: 'Abrir Chamado · Hub RR',
};

export default async function NovoChamadoPage() {
  let clientOptions: Array<{ id: string; name: string; phone: string; addressId?: string; addressText?: string }> = [];
  let teamOptions: any[] = [];
  let vehicleOptions: any[] = [];
  let equipmentOptions: any[] = [];
  let collaboratorOptions: any[] = [];
  let insumoOptions: any[] = [];

  if (db) {
    try {
      const [records, teamRows, vehicleRows, equipmentRows, collabRows, insumoRows] = await Promise.all([
        db
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
          .leftJoin(clientAddresses, eq(clients.id, clientAddresses.clientId)),
        db.select().from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name)),
        db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.name)),
        db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.name)),
        db.select().from(collaborators).where(eq(collaborators.isActive, true)).orderBy(asc(collaborators.name)),
        db.select().from(insumos).orderBy(asc(insumos.nome)),
      ]);

      clientOptions = records.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        addressId: r.addressId || undefined,
        addressText: r.street ? `${r.street}, ${r.number} - ${r.neighborhood}` : 'Sem endereço',
      }));

      teamOptions = teamRows;
      vehicleOptions = vehicleRows;
      equipmentOptions = equipmentRows;
      collaboratorOptions = collabRows;
      insumoOptions = insumoRows;
    } catch (e) {
      console.error('Erro ao buscar dados para abertura de chamado:', e);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/portal/chamados"
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            Abertura de Chamado / Ordem de Serviço <ClipboardList className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Despacho operacional, alocação de equipe/veículo e controle interno de custos da RRD.
          </p>
        </div>
      </div>

      <NovoChamadoForm
        clients={clientOptions}
        teams={teamOptions}
        vehicles={vehicleOptions}
        equipment={equipmentOptions}
        collaborators={collaboratorOptions}
        insumos={insumoOptions}
      />
    </div>
  );
}
