import { db, serviceRequests, clients, clientAddresses, teams } from '@/db';
import { eq, desc, isNull } from 'drizzle-orm';
import ChamadosClient, { ChamadoItem } from './ChamadosClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chamados & Atendimentos · Hub RR',
};

// Navegação para detalhe do chamado: `/portal/chamados/${req.id}` -> "Ver chamado"
export default async function ChamadosPage() {
  let requestsList: ChamadoItem[] = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: serviceRequests.id,
          code: serviceRequests.code,
          serviceType: serviceRequests.serviceType,
          priority: serviceRequests.priority,
          status: serviceRequests.status,
          problemReported: serviceRequests.problemReported,
          totalAmount: serviceRequests.totalAmount,
          createdAt: serviceRequests.createdAt,
          clientName: clients.name,
          clientPhone: clients.phone,
          neighborhood: clientAddresses.neighborhood,
          teamName: teams.name,
        })
        .from(serviceRequests)
        .innerJoin(clients, eq(serviceRequests.clientId, clients.id))
        .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
        .leftJoin(teams, eq(serviceRequests.assignedTeamId, teams.id))
        .where(isNull(serviceRequests.archivedAt))
        .orderBy(desc(serviceRequests.createdAt));

      requestsList = records.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
    }
  }

  return <ChamadosClient initialRequests={requestsList} />;
}
