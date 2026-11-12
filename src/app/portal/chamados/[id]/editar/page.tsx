import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { db, serviceRequests, teams, vehicles, equipment, collaborators } from '@/db';
import { eq, asc } from 'drizzle-orm';
import { requireLocalPermission } from '@/lib/require-local-permission';
import EditChamadoForm from './EditChamadoForm';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export default async function EditChamadoPage({ params }: Props) {
  if (!await requireLocalPermission('operations.write')) redirect('/portal');
  const { id } = await params;
  if (!db) return <div>Banco indisponível.</div>;

  const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  if (!request) notFound();

  const [teamList, vehicleList, toolList, collabList] = await Promise.all([
    db.select().from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name)),
    db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.name)),
    db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.name)),
    db.select().from(collaborators).where(eq(collaborators.isActive, true)).orderBy(asc(collaborators.name)),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href={`/portal/chamados/${id}`} className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Voltar aos detalhes
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Pencil className="w-5 h-5 text-cyan-400" /> Editar Chamado {request.code}
        </h1>
        <span className="text-xs text-slate-400">Atualize dados do atendimento e alocação</span>
      </div>
      <EditChamadoForm
        initial={request}
        teams={teamList}
        vehicles={vehicleList}
        equipment={toolList}
        collaborators={collabList}
      />
    </div>
  );
}
