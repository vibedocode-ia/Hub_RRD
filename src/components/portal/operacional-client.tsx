'use client';

import { useState } from 'react';
import { Truck, Users, CalendarClock, Settings2, Plus, Wrench, CheckCircle2 } from 'lucide-react';
import { ModalNovaEquipe } from './ModalNovaEquipe';
import { ModalNovoVeiculo } from './ModalNovoVeiculo';
import { ModalChecklistVeiculo } from './ModalChecklistVeiculo';

export function OperacionalClient({ 
  initialEquipes, 
  initialFrotas 
}: { 
  initialEquipes: any[]; 
  initialFrotas: any[]; 
}) {
  const [equipes, setEquipes] = useState(initialEquipes);
  const [loadingEquipe, setLoadingEquipe] = useState<string | null>(null);
  const [isNovaEquipeOpen, setIsNovaEquipeOpen] = useState(false);
  const [isNovoVeiculoOpen, setIsNovoVeiculoOpen] = useState(false);
  const [checklistVehicle, setChecklistVehicle] = useState<any | null>(null);

  const toggleEquipeStatus = async (id: string, currentStatus: boolean) => {
    setLoadingEquipe(id);
    try {
      const res = await fetch('/api/operacional/equipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      if (res.ok) {
        const { team } = await res.json();
        setEquipes(prev => prev.map(e => e.id === id ? team : e));
      }
    } catch (e) {
      console.error('Erro ao alternar status', e);
    } finally {
      setLoadingEquipe(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Gestão Operacional <Settings2 className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Controle de Equipes, Frotas e Agenda
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsNovaEquipeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700/80 transition"
          >
            <Plus className="w-4 h-4" /> Nova Equipe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equipes */}
        <div className="lg:col-span-2 space-y-6">
          <div id="equipes" className="scroll-mt-24 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" /> Equipes
              </h2>
            </div>
            <div className="p-6">
              {equipes.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma equipe cadastrada.</p>
              ) : (
                <div className="space-y-4">
                  {equipes.map((equipe) => (
                    <div key={equipe.id} className={`flex items-center justify-between p-4 bg-slate-800/40 border ${equipe.isActive ? 'border-emerald-500/30' : 'border-slate-700/50'} rounded-xl transition`}>
                      <div>
                        <h3 className="text-base font-bold text-slate-200">{equipe.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">Líder: {equipe.leaderName} | Contato: {equipe.phone || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          disabled={loadingEquipe === equipe.id}
                          onClick={() => toggleEquipeStatus(equipe.id, equipe.isActive)}
                          className={`px-3 py-1 text-[10px] font-bold rounded uppercase cursor-pointer transition ${
                            equipe.isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          } ${loadingEquipe === equipe.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {loadingEquipe === equipe.id ? 'Atualizando...' : (equipe.isActive ? 'Disponível' : 'Inativa')}
                        </button>
                        <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                          <span>OS Hoje: 3</span>
                          <span>Eficiência: 94%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Frotas */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" /> Frotas e Veículos
              </h2>
              <button 
                onClick={() => setIsNovoVeiculoOpen(true)}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar Veículo
              </button>
            </div>
            <div className="p-6">
              {initialFrotas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum veículo cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {initialFrotas.map((frota) => (
                    <div key={frota.id} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:border-cyan-500/30 transition group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold text-slate-200">{frota.name}</h3>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{frota.plate || 'S/ Placa'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Tipo: {frota.type}</p>
                      <button 
                        onClick={() => setChecklistVehicle(frota)}
                        className="w-full py-2 bg-slate-700/50 hover:bg-cyan-600/20 hover:text-cyan-400 text-xs text-slate-200 rounded font-semibold transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Preencher Checklist
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div id="equipamentos" className="scroll-mt-24 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" /> Equipamentos
              </h2>
              <button className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Hidrojato 1500 BAR</h3>
                    <p className="text-xs text-slate-400 mt-1">Cód: HJ-01</p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded uppercase bg-emerald-500/10 text-emerald-400">Pronto</span>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Bomba Vácuo 10m³</h3>
                    <p className="text-xs text-slate-400 mt-1">Cód: BV-02</p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded uppercase bg-amber-500/10 text-amber-400">Em Uso</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agenda */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden sticky top-8">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" /> Agenda de Hoje
              </h2>
            </div>
            <div className="p-6">
              <div className="relative border-l border-slate-700/50 ml-3 space-y-6 pb-4">
                {/* Exemplo interativo de agenda */}
                <div 
                  className="relative pl-6 cursor-pointer group"
                  onClick={() => alert('Abrir OS: Desentupimento Vaso - Equipe Alpha. Permite despachar equipe, registrar hora de chegada e anexar laudo.')}
                >
                  <div className="absolute w-3 h-3 bg-amber-400 rounded-full -left-1.5 top-1.5 ring-4 ring-slate-900 group-hover:scale-125 transition-transform"></div>
                  <p className="text-xs text-slate-400 font-bold mb-1">09:00 - 11:30</p>
                  <div className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-lg group-hover:border-amber-400/30 transition">
                    <p className="text-sm font-bold text-slate-200">Desentupimento Vaso</p>
                    <p className="text-xs text-slate-400 mt-1">Equipe Alpha (Icaraí)</p>
                  </div>
                </div>
                
                <div 
                  className="relative pl-6 cursor-pointer group"
                  onClick={() => alert('Abrir OS: Limpeza de Caixa de Gordura - Equipe Beta.')}
                >
                  <div className="absolute w-3 h-3 bg-cyan-400 rounded-full -left-1.5 top-1.5 ring-4 ring-slate-900 group-hover:scale-125 transition-transform"></div>
                  <p className="text-xs text-slate-400 font-bold mb-1">14:00 - 16:00</p>
                  <div className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-lg group-hover:border-cyan-400/30 transition">
                    <p className="text-sm font-bold text-slate-200">Limpeza de Caixa de Gordura</p>
                    <p className="text-xs text-slate-400 mt-1">Equipe Beta (Centro)</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-bold rounded-lg border border-slate-700 transition">
                Ver Agenda Completa
              </button>
            </div>
          </div>
        </div>
      </div>

      <ModalNovaEquipe isOpen={isNovaEquipeOpen} onClose={() => setIsNovaEquipeOpen(false)} />
      <ModalNovoVeiculo isOpen={isNovoVeiculoOpen} onClose={() => setIsNovoVeiculoOpen(false)} />
      <ModalChecklistVeiculo isOpen={!!checklistVehicle} vehicle={checklistVehicle} onClose={() => setChecklistVehicle(null)} />
    </div>
  );
}
