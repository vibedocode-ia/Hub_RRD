import {configuredService} from './runtime.mjs';
const service=configuredService('hub');
if(!service)throw new Error('ACCESS_V1_ENABLED must explicitly be true');
const port=Number(process.env.ACCESS_V1_TLS_PORT);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('explicit unprivileged TLS port required');
// A reverse proxy must preserve this TLS peer boundary; headers are not a substitute.
const server=service.httpsServer();
server.listen(port,'127.0.0.1',()=>console.log('access-v1 TLS ingress listening on loopback'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
