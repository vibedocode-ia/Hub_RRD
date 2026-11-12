import { asc } from 'drizzle-orm';
import { db, teams, vehicles, collaborators } from '@/db';
import { OperacionalClient } from '@/components/portal/operacional-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Operacional · Hub RR',
};

export default async function OperacionalPage() {
  let colaboradores: any[] = [];
  let equipes: any[] = [];
  let frotas: any[] = [];

  if (db) {
    try {
      colaboradores = await db.select().from(collaborators).orderBy(asc(collaborators.name));
      equipes = await db.select().from(teams).orderBy(asc(teams.name));
      frotas = await db.select().from(vehicles).orderBy(asc(vehicles.name));
    } catch (e) {
      console.error('Erro ao consultar dados operacionais:', e);
    }
  }

  return (
    <OperacionalClient 
      initialColaboradores={colaboradores}
      initialEquipes={equipes} 
      initialFrotas={frotas} 
    />
  );
}
