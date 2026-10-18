import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const rr=resolve(new URL('../../../../',import.meta.url).pathname);
const hvd=resolve(process.env.ETAPA4_HVD_ROOT||new URL('../../../../../etapa4-hvd',import.meta.url).pathname);
// Run TSX with HVD's tsconfig: in-process import from RR applies RR's @/*
// aliases to HVD's real Sofia dispatcher and fails before that test executes.
const result=spawnSync(process.execPath,['--import','tsx',hvd+'/src/lib/access-v1/test/stage6.mjs'],{cwd:hvd,env:{...process.env,ETAPA4_RRD_ROOT:process.env.ETAPA4_RRD_ROOT||rr},stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
