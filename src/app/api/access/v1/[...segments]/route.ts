import { routeFor } from '../../../../../lib/access-v1/runtime.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Federation peer context comes only from the TLS ingress, never caller headers.
const handler = routeFor('hub');
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
