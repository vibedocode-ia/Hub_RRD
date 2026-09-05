'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft, Save, Loader2, Building2, MapPin } from 'lucide-react';

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'PF',
    phone: '',
    document: '',
    email: '',
    contactPerson: '',
    notes: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: 'Icaraí',
    city: 'Niterói',
    state: 'RJ',
    referencePoint: '',
    serviceAccessNotes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar cliente.');
        setLoading(false);
        return;
      }

      router.push('/portal/crm');
      router.refresh();
    } catch (err) {
      setError('Erro de rede ao salvar cliente.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/portal/crm"
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            Novo Cadastro de Cliente <Users className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400">Cadastre dados comerciais, pessoais e endereço técnico do imóvel</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Dados Principais */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-400 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4" /> Dados Gerais
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Tipo de Cliente</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="PF">Pessoa Física (Residencial)</option>
                <option value="PJ">Pessoa Jurídica (Empresa)</option>
                <option value="CONDOMINIO">Condomínio Residencial/Comercial</option>
                <option value="RESTAURANTE">Restaurante / Cozinha Industrial</option>
                <option value="INDUSTRIA">Indústria / Galpão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Nome / Razão Social *</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Condomínio Edifício Solar"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Telefone Principal *</label>
              <input
                type="text"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="(21) 99669-9191"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">CPF ou CNPJ</label>
              <input
                type="text"
                name="document"
                value={form.document}
                onChange={handleChange}
                placeholder="53.102.506/0001-78"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Endereço do Imóvel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-400 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4" /> Endereço do Atendimento
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Logradouro / Rua</label>
              <input
                type="text"
                name="street"
                value={form.street}
                onChange={handleChange}
                placeholder="Rua Mariz e Barros"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Número</label>
              <input
                type="text"
                name="number"
                value={form.number}
                onChange={handleChange}
                placeholder="236"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Bairro *</label>
              <input
                type="text"
                name="neighborhood"
                required
                value={form.neighborhood}
                onChange={handleChange}
                placeholder="Icaraí"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Cidade</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Niterói"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Ponto de Referência</label>
              <input
                type="text"
                name="referencePoint"
                value={form.referencePoint}
                onChange={handleChange}
                placeholder="Próximo à praia"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Notas de Acesso / Galpão / Subsolo</label>
            <input
              type="text"
              name="serviceAccessNotes"
              value={form.serviceAccessNotes}
              onChange={handleChange}
              placeholder="Ex: Acesso pela garagem subsolo limite 2.1m (Usar caminhão VACOL compacto)"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Cliente no CRM
        </button>
      </form>
    </div>
  );
}
