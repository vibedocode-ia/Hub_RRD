import Link from 'next/link';
import { db, officialDocuments, clients, serviceRequests } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { FileText, Printer, Download, Eye, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Central de Documentos · Hub RR',
};

export default async function DocumentosPage() {
  let docsList: Array<{
    id: string;
    docType: string;
    docNumber: string;
    totalValue: string;
    paymentMethod: string;
    status: string;
    issuedAt: Date | null;
    clientName: string;
    clientPhone: string;
  }> = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: officialDocuments.id,
          docType: officialDocuments.docType,
          docNumber: officialDocuments.docNumber,
          totalValue: officialDocuments.totalValue,
          paymentMethod: officialDocuments.paymentMethod,
          status: officialDocuments.status,
          issuedAt: officialDocuments.issuedAt,
          clientName: clients.name,
          clientPhone: clients.phone,
        })
        .from(officialDocuments)
        .innerJoin(clients, eq(officialDocuments.clientId, clients.id))
        .orderBy(desc(officialDocuments.createdAt));

      docsList = records;
    } catch (e) {
      console.error('Erro ao buscar documentos emitidos:', e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          Central de Documentos Emitidos <FileText className="w-5 h-5 text-cyan-400" />
        </h1>
        <p className="text-sm text-slate-400">
          Histórico unificado de recibos de pagamento, termos de garantia e laudos técnicos com snapshot imutável
        </p>
      </div>

      {docsList.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">Nenhum Documento Emitido Ainda</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Acesse a fila de rascunhos da Sofia ou abra um chamado para emitir o primeiro documento em formato oficial.
          </p>
          <Link
            href="/portal/sofia-drafts"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
          >
            Ir para Rascunhos Sofia
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Total de Documentos Oficialmente Emitidos: {docsList.length}
            </div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {docsList.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {doc.docNumber}
                    </span>
                    <span className="text-sm font-bold text-slate-100">{doc.clientName}</span>
                    <span className="text-[10px] font-bold uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      {doc.docType === 'RECIBO_GARANTIA' ? 'Recibo + Garantia' : 'Laudo / OS'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Forma de pagamento: {doc.paymentMethod} • Emitido em {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-100">R$ {doc.totalValue}</div>
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" /> Snapshot Congelado
                    </div>
                  </div>
                  <Link
                    href={`/portal/documentos/preview/${doc.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar / Imprimir PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
