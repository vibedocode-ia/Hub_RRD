import Link from 'next/link';
import { db, serviceRequests, clients, clientAddresses, sofiaEvents } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { MessageSquareCode, CheckCircle, FileText, Phone, MapPin, Clock } from 'lucide-react';
import DraftActionButtons from './DraftActionButtons';

export const metadata = {
  title: 'Central de Rascunhos Sofia · Hub RR',
};

export default async function SofiaDraftsPage() {
  let draftsList: Array<{
    id: string;
    code: string;
    serviceType: string;
    problemReported: string;
    totalAmount: string | null;
    createdAt: Date;
    clientName: string;
    clientPhone: string;
    clientDoc: string | null;
    neighborhood: string | null;
    intentDetected?: string;
  }> = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: serviceRequests.id,
          code: serviceRequests.code,
          serviceType: serviceRequests.serviceType,
          problemReported: serviceRequests.problemReported,
          totalAmount: serviceRequests.totalAmount,
          createdAt: serviceRequests.createdAt,
          clientName: clients.name,
          clientPhone: clients.phone,
          clientDoc: clients.document,
          neighborhood: clientAddresses.neighborhood,
        })
        .from(serviceRequests)
        .innerJoin(clients, eq(serviceRequests.clientId, clients.id))
        .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
        .orderBy(desc(serviceRequests.createdAt));

      draftsList = records;
    } catch (error) {
      console.error('Erro ao listar rascunhos da Sofia:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          Fila de Rascunhos & Pedidos da Sofia (WhatsApp) <MessageSquareCode className="w-5 h-5 text-cyan-400" />
        </h1>
        <p className="text-sm text-slate-400">
          Revise e converta áudios e mensagens capturados pela assistente Sofia no WhatsApp em documentos oficiais da RR
        </p>
      </div>

      {draftsList.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <MessageSquareCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">Fila de Rascunhos Vazia</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Quando o Rafael mandar áudios ou textos de orçamento para a Sofia no WhatsApp (`5521996699191`), os rascunhos aparecerão aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {draftsList.map((draft) => (
            <div key={draft.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                    {draft.code}
                  </span>
                  <span className="text-base font-extrabold text-slate-100">{draft.clientName}</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(draft.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Telefone & Imóvel</div>
                  <div className="text-slate-200 flex items-center gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" /> {draft.clientPhone}
                  </div>
                  <div className="text-slate-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {draft.neighborhood || 'Niterói/RJ'}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 md:col-span-2">
                  <div className="font-bold text-slate-400 uppercase text-[10px] mb-1">Serviço Detectado</div>
                  <div className="text-cyan-400 font-bold text-xs">{draft.serviceType}</div>
                  <div className="text-slate-300 mt-1 line-clamp-2">{draft.problemReported}</div>
                </div>
              </div>

              {/* Action Buttons for Rafael */}
              <DraftActionButtons draftId={draft.id} defaultAmount={draft.totalAmount || '300.00'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
