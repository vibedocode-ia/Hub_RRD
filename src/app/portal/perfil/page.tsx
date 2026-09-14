import { getSessionUser } from '@/lib/auth'
import ProfileClient from './ProfileClient'
export const dynamic='force-dynamic';export default async function Page(){const user=await getSessionUser();if(!user)return null;return <ProfileClient profile={user}/>}