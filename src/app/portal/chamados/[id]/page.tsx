import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  Truck,
  Users,
  Wrench,
  FileText,
  UserCheck,
  ShieldCheck,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  db,
  serviceRequests,
  clients,
  clientAddresses,
  teams,
  vehicles,
  equipment,
  collaborators,
  serviceRequestMaterials,
  serviceRequestExpenses,
  insumos,
} from '@/db';
import { eq, inArray, asc } from 'drizzle-orm';
import { requireLocalPermission } from '@/lib/require-local-permission';
import ChamadoCustosClient from './ChamadoCustosClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function ChamadoDetailPage({ params }: Props) {
  if (!await requireLocalPermission('operations.read')) redirect('/portal');
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const canEdit = !!(await requireLocalPermission('operations.write'));
  if (!db) return <div>Banco indisponível.</div>;

  const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  if (!request) notFound();

  // Buscar dados relacionados
  const [
    [client],
    [address],
    [team],
    [vehicle],
    [tool],
    materialsList,
    expensesList,
    allInsumos,
    allCollaborators,
  ] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, request.clientId)).limit(1),
    db.select().from(clientAddresses).where(eq(clientAddresses.id, request.addressId)).limit(1),
    request.assignedTeamId ? db.select().from(teams).where(eq(teams.id, request.assignedTeamId)).limit(1) : Promise.resolve([]),
    request.vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, request.vehicleId)).limit(1) : Promise.resolve([]),
    request.equipmentId ? db.select().from(equipment).where(eq(equipment.id, request.equipmentId)).limit(1) : Promise.resolve([]),
    db.select().from(serviceRequestMaterials).where(eq(serviceRequestMaterials.serviceRequestId, id)),
    db.select().from(serviceRequestExpenses).where(eq(serviceRequestExpenses.serviceRequestId, id)),
    db.select().from(insumos).orderBy(asc(insumos.nome)),
    db.select().from(collaborators).orderBy(asc(collaborators.name)),
  ]);

  // Identificar colaboradores atribuídos
  const assignedCollabIds = Array.isArray(request.assignedCollaboratorIds) ? request.assignedCollaboratorIds : [];
  const assignedCollaborators = allCollaborators.filter((c) => assignedCollabIds.includes(c.id));

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      {/* Navegação e Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/portal/chamados" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar aos chamados
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/documentos/novo?serviceRequestId=${id}&type=OS`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <FileText className="h-4 w-4 text-cyan-400" /> Emitir OS / Laudo do Cliente
          </Link>
          {canEdit && (
            <Link
              href={`/portal/chamados/${id}/editar`}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-500"
            >
              <Pencil className="h-4 w-4" /> Editar Chamado
            </Link>
          )}
        </div>
      </div>

      {/* Cabeçalho do Chamado */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Ordem de Serviço</span>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800/50">
              {request.status}
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
              {request.priority}
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-100">
            <ClipboardList className="h-6 w-6 text-cyan-400" /> {request.code}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {request.serviceType} · Aberto em {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
            {request.scheduledAt && (
              <span className="ml-2 text-cyan-300">
                · Agendado para {new Date(request.scheduledAt).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-400">Valor Cobrado ao Cliente</p>
          <p className="text-2xl font-black text-slate-100">R$ {request.totalAmount || '0.00'}</p>
          <p className="text-xs text-slate-400">Pagamento: {request.paymentMethod || 'Pix'}</p>
        </div>
      </header>

      {/* Grid de Informações Básicas do Atendimento */}
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Cliente</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{client?.name || 'Não informado'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{client?.phone || 'Sem telefone'}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-400" /> Endereço de Atendimento
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {address
              ? [address.street, address.number, address.complement, address.neighborhood, address.city]
                  .filter(Boolean)
                  .join(', ')
              : 'Endereço não cadastrado'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Garantia Técnica</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{request.warrantyDays || 30} dias</p>
          <p className="text-xs text-slate-400 mt-0.5">Válida por escrito</p>
        </div>
      </section>

      {/* Despacho Operacional (Equipe, Veículo, Equipamento e Técnicos) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" /> Despacho de Campo & Identificação na Portaria
          </h2>
          <span className="text-[11px] text-slate-400">Informações que saem na OS do cliente</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Equipe Responsável
            </p>
            <p className="mt-1 text-sm font-bold text-slate-100">{team?.name || 'Não vinculada'}</p>
            {team?.leaderName && <p className="text-xs text-slate-400">Líder: {team.leaderName}</p>}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-cyan-400" /> Veículo / Placa
            </p>
            <p className="mt-1 text-sm font-bold text-slate-100">{vehicle?.name || 'Não alocado'}</p>
            <p className="text-xs font-semibold text-cyan-400">Placa: {vehicle?.plate || 'Não informada'}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <p className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Equipamento Principal
            </p>
            <p className="mt-1 text-sm font-bold text-slate-100">{tool?.name || 'Padrão da operação'}</p>
            {tool?.code && <p className="text-xs text-slate-400">Código: {tool.code}</p>}
          </div>
        </div>

        {/* Técnicos e Colaboradores Designados */}
        <div className="pt-2">
          <p className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Técnicos e Colaboradores Autorizados
          </p>

          {assignedCollaborators.length === 0 ? (
            <p className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400">
              Nenhum colaborador específico registrado neste atendimento.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {assignedCollaborators.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-xs font-bold text-cyan-300">
                    {c.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-100 truncate">{c.name}</p>
                    <p className="text-[10px] text-cyan-400/80">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Relato e Diagnóstico */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Relato do Problema pelo Cliente</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-200 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            {request.problemReported}
          </p>
        </div>

        {request.problemFound && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnóstico Técnico</h3>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-200 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              {request.problemFound}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {request.customerNotes && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                Observações ao Cliente (OS Pública)
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                {request.customerNotes}
              </p>
            </div>
          )}

          {request.internalNotes && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                Notas Internas (Confidencial)
              </h3>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                {request.internalNotes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CONTROLE INTERNO & CUSTOS (COMPONENTE EXCLUSIVO DO RAFAEL) */}
      <ChamadoCustosClient
        serviceRequestId={id}
        initialMaterials={materialsList}
        initialExpenses={expensesList}
        insumos={allInsumos}
        totalAmount={request.totalAmount || '0.00'}
        canEdit={canEdit}
      />
    </main>
  );
}
