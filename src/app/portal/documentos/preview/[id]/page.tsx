import { notFound } from 'next/navigation';
import { db, officialDocuments } from '@/db';
import { eq } from 'drizzle-orm';
import { PrinterButton } from './PrinterButton';

export const metadata = {
  title: 'Visualizador de Documento Oficial · RR Desentupidora',
};

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!db) {
    return notFound();
  }

  const docs = await db
    .select()
    .from(officialDocuments)
    .where(eq(officialDocuments.id, id))
    .limit(1);

  if (docs.length === 0) {
    return notFound();
  }

  const doc = docs[0];
  const htmlContent = doc.htmlSnapshot || '<h1>Documento sem preview disponível.</h1>';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="w-full bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex items-center justify-between max-w-4xl mx-auto rounded-b-2xl shadow-2xl print:hidden">
        <div>
          <div className="text-xs font-mono font-bold text-cyan-400">{doc.docNumber}</div>
          <div className="text-sm font-bold text-slate-100">{doc.docType} — RR Desentupidora</div>
        </div>
        <PrinterButton />
      </div>

      {/* Embedded Document HTML */}
      <div className="w-full max-w-4xl bg-white text-slate-900 my-6 rounded-lg shadow-2xl overflow-hidden print:m-0 print:shadow-none print:w-full">
        <iframe
          srcDoc={htmlContent}
          className="w-full min-h-[1120px] border-none"
          title={`Documento ${doc.docNumber}`}
        />
      </div>
    </div>
  );
}
