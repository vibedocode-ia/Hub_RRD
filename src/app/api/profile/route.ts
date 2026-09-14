import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, users } from '@/db'
import { getSessionUser } from '@/lib/auth'
import { z } from 'zod'
const Profile=z.object({name:z.string().trim().min(2).max(160),email:z.string().trim().email().max(254).optional().nullable(),jobTitle:z.string().trim().max(120).optional().nullable(),photoUrl:z.string().url().max(2048).optional().nullable()}).strict()
export async function GET(){const user=await getSessionUser();return user?NextResponse.json({success:true,profile:user}):NextResponse.json({error:'Não autorizado'},{status:401})}
export async function PATCH(req:NextRequest){const user=await getSessionUser();if(!user)return NextResponse.json({error:'Não autorizado'},{status:401});if(!db)return NextResponse.json({error:'Banco indisponível'},{status:503});const parsed=Profile.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Perfil inválido'},{status:422});const [profile]=await db.update(users).set({...parsed.data,updatedAt:new Date()}).where(eq(users.id,user.id)).returning({id:users.id,name:users.name,email:users.email,jobTitle:users.jobTitle,photoUrl:users.photoUrl});return NextResponse.json({success:true,profile})}