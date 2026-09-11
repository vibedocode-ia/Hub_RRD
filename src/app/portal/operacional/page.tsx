import { db, teams, vehicles } from '@/db';
import { OperacionalClient } from '@/components/portal/operacional-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Operacional · Hub RR',
};

export default async function OperacionalPage() {
  let equipes: any[] = [];
  let frotas: any[] = [];

  if (db) {
    try {
      equipes = await db.select().from(teams);
      frotas = await db.select().from(vehicles);
    } catch (e) {
      console.error('Erro ao consultar dados operacionais:', e);
    }
  }

  return (
    <OperacionalClient 
      initialEquipes={equipes} 
      initialFrotas={frotas} 
    />
  );
}
