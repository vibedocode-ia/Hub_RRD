import { desc } from 'drizzle-orm';
import { db, leads } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';
import { redirect } from 'next/navigation';
import LeadsClient, { LeadItem } from './LeadsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads · Hub RR' };

export default async function LeadsPage() {
  if (!await requireLocalPermission('crm.read')) redirect('/portal');

  const rows = db 
    ? await db.select().from(leads).orderBy(desc(leads.updatedAt)).limit(200) 
    : [];

  const items: LeadItem[] = rows.map(lead => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    status: lead.status,
    serviceType: lead.serviceType,
    updatedAt: lead.updatedAt.toISOString(),
    convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
  }));

  return <LeadsClient initialLeads={items} />;
}
