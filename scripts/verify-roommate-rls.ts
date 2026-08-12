import { spawnSync } from 'node:child_process';
const url=process.env.SUPABASE_DB_URL;
if(!url){console.error('NOT RUN: SUPABASE_DB_URL is required. Apply migrations and fixtures to an isolated project first.');process.exit(2)}
for(const file of ['supabase/tests/fixtures/roommate_mvp.sql','supabase/tests/roommate_rls.sql']){
  const run=spawnSync('psql',[url,'-v','ON_ERROR_STOP=1','-f',file],{stdio:'inherit',shell:process.platform==='win32'});
  if(run.status!==0)process.exit(run.status??1);
}
console.log('Roommate RLS checks passed against the configured isolated database.');
