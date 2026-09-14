const fs=require('fs'),path=require('path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function harness(mocks={},env={}) {
 const cache={};
 function load(file){const full=path.join(root,file);if(cache[full])return cache[full].exports;const mod={exports:{}};cache[full]=mod;
 const req=n=>{if(n in mocks)return mocks[n];if(n.startsWith('@/')||n.startsWith('.')){const base=n.startsWith('@/')?path.join(root,'src',n.slice(2)):path.resolve(path.dirname(full),n);for(const ext of ['', '.ts','.tsx','/index.ts'])if(fs.existsSync(base+ext)&&fs.statSync(base+ext).isFile())return load(path.relative(root,base+ext));}return require(n)};
 const js=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports','process','fetch',js)(req,mod,mod.exports,{env},mocks.fetch||(async()=>{throw Error('NETWORK_BLOCKED')}));return mod.exports;
 }return load;
}
const nr={NextResponse:{json:(body,options={})=>({body,status:options.status||200}),redirect:url=>({status:307,url:String(url)})}};
function memoryDB(rows=[]) {
 const writes=[],selections=[];
 const get=t=>typeof rows==='function'?rows(t):rows;
 const result=(t,p)=>({returning:async()=>get(t).map(r=>Object.assign(r,p)),then:(a,b)=>Promise.resolve().then(a,b)});
 return {writes,selections,
 select(){let table;const q={from(t){table=t;selections.push(t);return q},where(){return q},orderBy(){return q},limit:async()=>get(table),then:(a,b)=>Promise.resolve(get(table)).then(a,b)};return q},
 update(t){return {set(p){writes.push({t,p});return {where:()=>result(t,p)}}}},
 insert(t){return {values(p){writes.push({t,p});return result(t,p)}}}
 };
}
module.exports={harness,nr,memoryDB};
