import {notFound,redirect} from 'next/navigation';
import {cookies} from 'next/headers';
import {configuredService} from '@/lib/access-v1/runtime.mjs';
import AccessPanel from '@/components/access-v1/AccessPanel';
import '@/components/access-v1/access-panel.css';
export const dynamic='force-dynamic';
export default async function AccessPage(){
 const service=configuredService('hub');if(!service)notFound();
 const token=(await cookies()).get('access_v1')?.value;
 if(!token)redirect('/portal/login');
 const response=await service.handle(new Request('https://127.0.0.1/api/access/v1/local/me',{headers:{cookie:'access_v1='+token}}));
 if(!response.ok)redirect('/portal/login');
 return <AccessPanel side="hub"/>;
}
