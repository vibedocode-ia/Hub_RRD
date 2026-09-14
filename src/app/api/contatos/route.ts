import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { contacts, db } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { CreateContactSchema } from '@/lib/validation/contacts-agenda'

export async function GET() { const auth=await requireLocalPermission('crm.read'); if(!auth)return NextResponse.json({error:'Permissão insuficiente'},{status:403}); if(!db)return NextResponse.json({error:'Banco indisponível'},{status:503}); return NextResponse.json({success:true,contacts:await db.select().from(contacts).where(eq(contacts.isActive,true)).orderBy(asc(contacts.name))}) }
export async function POST(req:NextRequest) { const auth=await requireLocalPermission('crm.write'); if(!auth)return NextResponse.json({error:'Permissão insuficiente'},{status:403}); if(!db)return NextResponse.json({error:'Banco indisponível'},{status:503}); const parsed=CreateContactSchema.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:'Dados de contato inválidos.'},{status:422}); const [contact]=await db.insert(contacts).values({...parsed.data,createdById:auth.access.id}).returning(); return NextResponse.json({success:true,contact},{status:201}) }