import { getDb, sofiaResponseProfiles, serviceCatalog } from '../src/db';
import { DEFAULT_SOFIA_PROFILES, DEFAULT_SERVICE_CATALOG } from '../src/lib/rr-defaults';

async function seed() {
  const db = getDb();
  for (const profile of DEFAULT_SOFIA_PROFILES) {
    await db.insert(sofiaResponseProfiles).values(profile).onConflictDoNothing();
  }
  for (const item of DEFAULT_SERVICE_CATALOG) {
    await db.insert(serviceCatalog).values(item).onConflictDoNothing();
  }
  console.log('✅ Defaults operacionais da Sofia e serviços aplicados.');
}
seed().then(()=>process.exit(0)).catch((err)=>{ console.error('❌ Falha no seed operacional:', err); process.exit(1); });
