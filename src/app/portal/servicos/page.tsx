import { asc, eq } from 'drizzle-orm';
import { db, serviceCatalog } from '@/db';
import { DEFAULT_SERVICE_CATALOG } from '@/lib/rr-defaults';
import ServicosClient, { ServiceCatalogItem } from './ServicosClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Catálogo de Serviços · Hub RR' };

async function loadServices(): Promise<ServiceCatalogItem[]> {
  if (!db) return [];

  // Garante que o catálogo padrão exista no banco
  for (const item of DEFAULT_SERVICE_CATALOG) {
    const existing = await db
      .select({ id: serviceCatalog.id })
      .from(serviceCatalog)
      .where(eq(serviceCatalog.name, item.name))
      .limit(1);

    if (!existing.length) {
      await db.insert(serviceCatalog).values(item);
    }
  }

  const rows = await db
    .select()
    .from(serviceCatalog)
    .orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name));

  return rows as ServiceCatalogItem[];
}

export default async function ServicesPage() {
  const services = await loadServices();

  return <ServicosClient initialServices={services} />;
}
