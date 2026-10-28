import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade | RR Desentupidora Niterói',
  description: 'Conheça nossa política de privacidade, tratamento de dados (LGPD) e segurança da informação.',
};

export default function PoliticaPrivacidade() {
  return (
    <main className="min-h-screen bg-[#050d1a] text-white/80 py-16 px-5">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Início
        </Link>

        <div className="p-8 md:p-12 rounded-3xl bg-[#08152c] border border-cyan-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Política de Privacidade & LGPD
              </h1>
              <p className="text-xs text-white/50 font-mono mt-1">
                RR Desentupidora e Dedetizadora LTDA · CNPJ 53.102.506/0001-78
              </p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-white/70 border-t border-white/10 pt-6">
            <section>
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-cyan-400" /> 1. Compromisso com sua Privacidade
              </h2>
              <p>
                A RR Desentupidora e Dedetizadora LTDA valoriza a transparência e a segurança dos dados dos seus clientes e visitantes. Esta política descreve como tratamos as informações coletadas em nosso site oficial (www.rrdesentupidora.com.br), em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" /> 2. Coleta e Finalidade dos Dados
              </h2>
              <p>
                Os únicos dados coletados através dos nossos formulários ou canais de contato são:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
                <li>Nome completo (para identificação no atendimento emergencial);</li>
                <li>Telefone / WhatsApp (para retorno e agendamento da visita técnica);</li>
                <li>Bairro / Cidade e tipo de imóvel (para envio da equipe mais próxima);</li>
                <li>Descrição do problema relatado (para direcionamento do maquinário adequado).</li>
              </ul>
              <p className="mt-2">
                Não compartilhamos, vendemos ou repassamos seus dados a terceiros para fins publicitários.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 3. Atendimento e Redirecionamento ao WhatsApp
              </h2>
              <p>
                Ao utilizar o formulário ou botão de contato, os dados preenchidos são formatados para facilitar a abertura do chamado técnico via aplicativo oficial WhatsApp. Você possui controle total sobre o envio da mensagem diretamente ao nosso plantão técnico.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-white mb-2">
                4. Seus Direitos e Contato do Encarregado (DPO)
              </h2>
              <p>
                Você pode, a qualquer momento, solicitar a confirmação, correção ou exclusão definitiva dos seus dados de nossos registros operacionais entrando em contato pelo e-mail oficial ou pelo telefone (21) 99669-9191.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
                Endereço: Rua Santos Moreira, 40 · Santa Rosa, Niterói - RJ, 24240-000<br />
                Plantão Técnico e Administrativo: (21) 99669-9191
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
