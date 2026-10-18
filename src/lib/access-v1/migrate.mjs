import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export async function migrateDisposable(sql,configuration){
 if(configuration.disposable!==true||!/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/etapa4_test$/.test(configuration.databaseUrl||''))throw new Error('disposable_database_required');
 const [{name}]=await sql`select current_database() as name`;
 if(name!=='etapa4_test')throw new Error('disposable_database_required');
 const manifest=JSON.parse(readFileSync(new URL('./migrations/manifest.json',import.meta.url),'utf8'));
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(4200401)`;
  await tx.unsafe('CREATE TABLE IF NOT EXISTS access_v1_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  for(const entry of manifest.migrations){
   const bytes=readFileSync(new URL('./migrations/'+entry.id+'.sql',import.meta.url));
   const sha=createHash('sha256').update(bytes).digest('hex');if(sha!==entry.sha256)throw new Error('migration_source_mismatch');
   const [prior]=await tx`select sha256 from access_v1_migrations where id=${entry.id}`;
   if(prior&&prior.sha256!==sha)throw new Error('migration_journal_mismatch');
   if(!prior){await tx.unsafe(bytes.toString('utf8'));await tx`insert into access_v1_migrations(id,sha256) values(${entry.id},${sha})`;}
  }
 });
}
