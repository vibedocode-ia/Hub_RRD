import {notFound} from 'next/navigation';
import {configuredService} from '@/lib/access-v1/runtime.mjs';
import SetupAccessForm from '@/components/access-v1/SetupAccessForm';
import '@/components/access-v1/access-panel.css';
export const dynamic='force-dynamic';
export default function SetupPage(){if(!configuredService('hub'))notFound();return <SetupAccessForm loginPath="/portal/login"/>;}
