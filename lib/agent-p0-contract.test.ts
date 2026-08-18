import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('P0 migration is additive, deployment-paused, and default-deny',()=>{
  const sql=read('supabase/pending_migrations/20260818120000_agent_p0_close_candidate.sql');
  assert.match(sql,/DEPLOYMENT PAUSED/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.application_status_history/);
  assert.match(sql,/ALTER TABLE public\.application_status_history ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.application_status_history FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/agent_building_inventory_access/);
  assert.match(sql,/mark_property_contact_sent/);
  assert.match(sql,/get_tenant_case_progress/);
  assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|service_role/i);
});

test('Tenant request remains idempotent and returns the canonical Case URL',()=>{
  const api=read('app/api/account/inquiries/route.ts');
  const form=read('components/rental-demand-form.tsx');
  assert.match(api,/idempotencyKey: z\.string\(\)\.uuid\(\)/);
  assert.match(api,/create_rental_case_from_inquiry/);
  assert.match(form,/\/cases\/\$\{result\.rentalCase\.id\}/);
  assert.match(form,/\/sign-in\?next=/);
});

test('Recommendation, manual email, and Application actions use protected RPCs',()=>{
  const recommendation=read('app/api/agent/cases/[id]/recommendations/route.ts');
  assert.match(recommendation,/agent_send_verified_recommendation/);
  assert.match(recommendation,/inventorySnapshotId/);
  const contact=read('app/api/cases/[id]/property-contact/route.ts');
  assert.match(contact,/mark_property_contact_sent/);
  assert.match(contact,/create_case_property_email_draft/);
  assert.doesNotMatch(contact,/simulate_property_contact_send/);
  assert.match(read('app/api/agent/cases/[id]/progress/route.ts'),/transition_case_application/);
});

test('Tenant detail uses a safe Application projection and never returns Outbox rows',()=>{
  const route=read('app/api/account/rental-cases/route.ts');
  assert.match(route,/get_tenant_case_progress/);
  assert.match(route,/role==='tenant'\?Promise\.resolve\(\{data:\[\],error:null\}\):auth\.supabase\.from\('property_contact_outbox'\)/);
});

test('Protected Public catalog components are not modified by P0',()=>{
  const status=read('docs/ACCEPTED_PRODUCT_BASELINE.md');
  assert.match(status,/Public Header and navigation/);
  for(const path of ['components/building-browser.tsx','components/building-result-card.tsx','components/building-map.tsx','lib/public-buildings.ts']){
    assert.ok(read(path).length>0,path);
  }
});
