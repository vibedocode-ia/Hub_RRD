import PortalGate from './PortalGate';
import { APP_NAME } from '@/lib/version';

export const metadata = { title: `Acesso ao Hub · ${APP_NAME}` };

export default function PortalPage() {
  return <PortalGate />;
}
