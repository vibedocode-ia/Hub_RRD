import {resolve} from 'node:path';
process.env.ETAPA4_RRD_ROOT ||= new URL('../../../../',import.meta.url).pathname;
const hvd=resolve(process.env.ETAPA4_HVD_ROOT||new URL('../../../../../etapa4-hvd',import.meta.url).pathname);
await import('file://'+hvd+'/src/lib/access-v1/test/autonomy.mjs');
