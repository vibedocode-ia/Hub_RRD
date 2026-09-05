import { Settings, ShieldCheck, Truck, Wrench, Users, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Configurações Operacionais · Hub RR',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          Configurações Operacionais da RR <Settings className="w-5 h-5 text-cyan-400" />
        </h1>
        <p className="text-sm text-slate-400">
          Gerenciamento de equipes de campo, frotas de caminhões, equipamentos e termos de garantia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Equipes */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Users className="w-4 h-4" /> Equipes de Atendimento
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">Equipe Alpha (Hidrojato)</div>
              <div className="text-[10px] text-slate-500">Líder: Leonardo Santos</div>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">Equipe Bravo (Vácuo)</div>
              <div className="text-[10px] text-slate-500">Líder: Rafael (Operador Master)</div>
            </div>
          </div>
        </div>

        {/* Veículos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Truck className="w-4 h-4" /> Frota Própria RR
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">Caminhão Vácuo Heavy</div>
              <div className="text-[10px] text-slate-500">Capacidade: 10m³ • Esgotamento</div>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">VACOL Compacto 4x4</div>
              <div className="text-[10px] text-slate-500">Subsolos até 2.1m • Garagens Niterói</div>
            </div>
          </div>
        </div>

        {/* Equipamentos */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Wrench className="w-4 h-4" /> Equipamentos
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">Hidrojato 1.500 BAR</div>
              <div className="text-[10px] text-slate-500">Alta Pressão Ecológica</div>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200">Máquina K-50 / K-500</div>
              <div className="text-[10px] text-slate-500">Desentupimento Rotativo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Garantia Operacional */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
          <ShieldCheck className="w-4 h-4" /> Política de Garantia Padrão
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          A garantia padrão dos serviços de desentupimento e manutenção executados pela RR Desentupidora é de <strong>30 dias</strong>, válida desde que não seja constatado mau uso das instalações hidráulicas. Para contratos corporativos e condomínios, o período de garantia e termos específicos podem ser editados diretamente ao emitir cada recibo/laudo.
        </p>
      </div>
    </div>
  );
}
