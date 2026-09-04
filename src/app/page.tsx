import Link from 'next/link';

const services = [
  'Desentupimento de pia, ralo e vaso',
  'Limpeza de caixa de gordura',
  'Hidrojateamento',
  'Limpa e sucção de fossas',
  'Caixa de água e caixa de esgoto',
  'Linha Dedetização',
];

const WHATSAPP = 'https://api.whatsapp.com/send?phone=5521996699191&text=Estava%20no%20seu%20site.%20Quero%20mais%20informa%C3%A7%C3%B5es.';

export default function Home() {
  return (
    <main>
      {/* NAV */}
      <header
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 5vw', background: 'rgba(10,42,94,.04)',
        }}
      >
        <strong style={{ color: 'var(--rr-navy)', fontSize: '1.1rem' }}>RR Desentupidora</strong>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="#servicos">Serviços</a>
          <a href="#avaliacoes">Avaliações</a>
          <a href="#contato">Contato</a>
          <Link
            href="/portal"
            style={{ background: 'var(--rr-navy)', color: '#fff', padding: '.55rem 1rem', borderRadius: 999, fontSize: '.9rem', fontWeight: 600 }}
          >
            Acesso ao Hub
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section
        className="bg-rr-gradient"
        style={{ color: '#fff', padding: '5.5rem 5vw', textAlign: 'center' }}
        id="inicio"
      >
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.4rem)', margin: '0 0 .5rem', lineHeight: 1.1 }}>
          Desentupimento e limpeza de fossa<br />com urgência e confiança em Niterói/RJ
        </h1>
        <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', opacity: .92, maxWidth: 720, margin: '0 auto 1.6rem' }}>
          Atendimento 24 horas, equipe especializada e tecnologia para resolver o seu
          problema sem transtornos — como se fosse na nossa própria casa.
        </p>
        <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ background: '#25d366', color: '#083016', padding: '.9rem 1.8rem', borderRadius: 999, fontWeight: 700, display: 'inline-block' }}>
          Solicitar orçamento pelo WhatsApp
        </a>
        <div style={{ marginTop: '2rem', fontSize: '.95rem' }}>
          ⭐ Excelente · 5,0 com base em 55 avaliações no Google
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" style={{ padding: '4rem 5vw' }}>
        <h2 style={{ color: 'var(--rr-navy)', textAlign: 'center' }}>Especializada em</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {services.map((s) => (
            <div key={s} style={{ border: '1px solid #e6e9f0', borderRadius: 12, padding: '1.2rem', textAlign: 'center' }}>
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* POR QUE / provas */}
      <section id="avaliacoes" className="bg-rr-navy" style={{ color: '#fff', padding: '4rem 5vw', textAlign: 'center' }}>
        <h2>Por que escolher a RR</h2>
        <p style={{ opacity: .9 }}>Atendimento 24h · +7 anos de experiência · Equipe especializada e pontual · Pagamento facilitado · Fotos antes/depois e assinatura digital do serviço.</p>
      </section>

      {/* CONTATO */}
      <section id="contato" style={{ padding: '3rem 5vw', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--rr-navy)' }}>Tem alguma dúvida?</h2>
        <p>Fale com nossa equipe especializada. Atendemos residências, condomínios e empresas.</p>
        <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ background: 'var(--rr-cyan)', color: '#06212b', padding: '.9rem 1.8rem', borderRadius: 999, fontWeight: 700, display: 'inline-block', marginTop: '1rem' }}>
          Chamar no WhatsApp — 24h
        </a>
      </section>
    </main>
  );
}
