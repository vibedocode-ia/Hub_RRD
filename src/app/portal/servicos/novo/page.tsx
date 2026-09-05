import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ServiceForm from '../ServiceForm';
export default function NewServicePage(){return <div className="max-w-3xl mx-auto space-y-6"><Link href="/portal/servicos" className="inline-flex items-center gap-2 text-sm text-cyan-400"><ArrowLeft className="w-4 h-4"/> Voltar</Link><h1 className="text-2xl font-black text-slate-100">Novo serviço</h1><ServiceForm /></div>}
