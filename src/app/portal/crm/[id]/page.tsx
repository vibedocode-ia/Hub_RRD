import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, clients, clientAddresses, serviceRequests, officialDocuments } from '@/db';
import { eq, desc } from 'drizzle-orm';
import {
  ArrowLeft,
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  ClipboardList,
  ReceiptText,
  CalendarClock,
  BadgeCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ficha Completa do Cliente · Hub RR',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(number) ? number : 0);
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!db) {
    return (
      <div className="space-y-4">
        <Link href="/portal/crm" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
          <ArrowLeft className="w-4 h-4" /> Voltar ao CRM
        </Link>
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-red-200">
          Banco de dados não disponível para carregar a ficha do cliente.
        </div>
      </div>
    );
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) notFound();

  const addresses = await db
    .select()
    .from(clientAddresses)
    .where(eq(clientAddresses.clientId, id))
    .orderBy(desc(clientAddresses.isMain), desc(clientAddresses.createdAt));

  const requests = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.clientId, id))
    .orderBy(desc(serviceRequests.createdAt));

  const documents = await db
    .select()
    .from(officialDocuments)
    .where(eq(officialDocuments.clientId, id))
    .orderBy(desc(officialDocuments.createdAt));

  const mainAddress = addresses[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Link href="/portal/crm" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
            <ArrowLeft className="w-4 h-4" /> Voltar ao CRM
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
                {client.type === 'PF' ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">{client.name}</h1>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Ficha completa · {client.type}</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href={`/portal/chamados/novo?clientId=${client.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500"
        >
          <ClipboardList className="w-4 h-4" /> Novo Chamado
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-cyan-400" /> Dados do Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Info label="Telefone" value={client.phone} icon={<Phone className="w-4 h-4" />} />
            <Info label="CPF/CNPJ" value={client.document || '—'} icon={<FileText className="w-4 h-4" />} />
            <Info label="E-mail" value={client.email || '—'} icon={<Mail className="w-4 h-4" />} />
            <Info label="Contato" value={client.contactPerson || '—'} icon={<User className="w-4 h-4" />} />
            <Info label="Origem" value={client.source || 'Manual/CRM'} icon={<ClipboardList className="w-4 h-4" />} />
            <Info label="Cadastro" value={formatDate(client.createdAt)} icon={<CalendarClock className="w-4 h-4" />} />
          </div>
          {client.notes && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Observações</div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" /> Endereço Principal
          </h2>
          {mainAddress ? (
            <div className="text-sm text-slate-300 space-y-2">
              <p className="font-bold text-slate-100">{mainAddress.street}, {mainAddress.number}</p>
              {mainAddress.complement && <p>{mainAddress.complement}</p>}
              <p>{mainAddress.neighborhood} · {mainAddress.city}/{mainAddress.state}</p>
              {mainAddress.referencePoint && <p className="text-xs text-slate-400">Referência: {mainAddress.referencePoint}</p>}
              {mainAddress.serviceAccessNotes && <p className="text-xs text-cyan-300">Acesso: {mainAddress.serviceAccessNotes}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum endereço cadastrado.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-400" /> Histórico de Chamados
        </h2>
        {requests.length === 0 ? (
          <Empty text="Nenhum chamado vinculado a este cliente ainda." />
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-100">{request.code} · {request.serviceType}</div>
                  <div className="text-xs text-slate-400 mt-1">{request.problemReported}</div>
                </div>
                <div className="text-xs text-right space-y-1">
                  <div className="text-cyan-300 font-bold">{request.status}</div>
                  <div className="text-slate-400">{formatCurrency(request.totalAmount)}</div>
                  <div className="text-slate-500">{formatDate(request.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
          <ReceiptText className="w-4 h-4 text-cyan-400" /> Documentos Emitidos
        </h2>
        {documents.length === 0 ? (
          <Empty text="Nenhum documento emitido para este cliente ainda." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((document) => (
              <Link
                key={document.id}
                href={`/portal/documentos/preview/${document.id}`}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-cyan-500/40 transition"
              >
                <div className="font-bold text-slate-100">{document.docNumber}</div>
                <div className="text-xs text-slate-400 mt-1">{document.docType} · {formatCurrency(document.totalValue)}</div>
                <div className="text-[10px] text-cyan-400 mt-2 uppercase font-bold">Abrir preview</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
        <span className="text-cyan-500">{icon}</span> {label}
      </div>
      <div className="text-slate-200 font-semibold break-words">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-500">{text}</div>;
}
