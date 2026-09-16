import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { auditEvents, clients, db, proposals, serviceRequests } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { canTransitionProposal, PROPOSAL_STATUSES } from '@/lib/proposals'

export async function GET(){
  const authorized=await requireLocalPermission('crm.read'); if(!authorized)return NextResponse.json({error:'Permissão insuficiente'},{status:403}); if(!db)return NextResponse.json({error:'Banco indisponível'},{status:500})
  const rows=await db.select({proposal:proposals,clientName:clients.name,service:serviceRequests.serviceType}).from(proposals).innerJoin(clients,eq(proposals.clientId,clients.id)).leftJoin(serviceRequests,eq(proposals.serviceRequestId,serviceRequests.id)).orderBy(desc(proposals.createdAt)).limit(200)
  return NextResponse.json({success:true,proposals:rows.map(r=>({...r.proposal,clientName:r.clientName,service:r.service}))})
}

export async function POST(req:NextRequest){
  const authorized=await requireLocalPermission('crm.write'); if(!authorized)return NextResponse.json({error:'Permissão insuficiente'},{status:403}); if(!db)return NextResponse.json({error:'Banco indisponível'},{status:500})
  const body=await req.json();const clientId=String(body.clientId||'');const title=String(body.title||'').trim();const value=Number(body.totalValue)
  if(!/^[0-9a-f-]{36}$/i.test(clientId)||!title||!Number.isFinite(value)||value<=0)return NextResponse.json({error:'Cliente, título e valor válido são obrigatórios.'},{status:400})
  const [client]=await db.select({id:clients.id}).from(clients).where(eq(clients.id,clientId)).limit(1);if(!client)return NextResponse.json({error:'Cliente não encontrado.'},{status:404})
  const [created]=await db.insert(proposals).values({clientId,title,description:body.description||null,totalValue:value.toFixed(2),status:PROPOSAL_STATUSES.DRAFT,serviceRequestId:body.serviceRequestId||null,validUntil:body.validUntil?new Date(body.validUntil):null,notes:body.notes||null,createdById:authorized.access.id}).returning()
  await db.insert(auditEvents).values({actorUserId:authorized.access.id,action:'proposal.created',targetType:'proposal',targetId:created.id,metadata:{status:created.status,totalValue:created.totalValue}})
  return NextResponse.json({success:true,proposal:created},{status:201})
}

export async function PATCH(req:NextRequest){
  const authorized=await requireLocalPermission('crm.write'); if(!authorized)return NextResponse.json({error:'Permissão insuficiente'},{status:403}); if(!db)return NextResponse.json({error:'Banco indisponível'},{status:500})
  const body=await req.json();const id=String(body.id||'');const next=String(body.status||'');if(!/^[0-9a-f-]{36}$/i.test(id)||!Object.values(PROPOSAL_STATUSES).includes(next as never))return NextResponse.json({error:'Proposta ou status inválido.'},{status:400})
  const [current]=await db.select().from(proposals).where(eq(proposals.id,id)).limit(1);if(!current)return NextResponse.json({error:'Proposta não encontrada.'},{status:404});if(!canTransitionProposal(current.status,next))return NextResponse.json({error:`Transição não permitida: ${current.status} → ${next}`},{status:409})
  const now=new Date();const values:any={status:next,updatedAt:now};if(next===PROPOSAL_STATUSES.SENT)values.sentAt=now;if(next===PROPOSAL_STATUSES.APPROVED)values.approvedAt=now;if(next===PROPOSAL_STATUSES.REJECTED)values.rejectedAt=now;if(next===PROPOSAL_STATUSES.APPROVED)values.convertedAt=now
  const [updated]=await db.update(proposals).set(values).where(eq(proposals.id,id)).returning();await db.insert(auditEvents).values({actorUserId:authorized.access.id,action:'proposal.status_changed',targetType:'proposal',targetId:id,metadata:{from:current.status,to:next}})
  return NextResponse.json({success:true,proposal:updated})
}
