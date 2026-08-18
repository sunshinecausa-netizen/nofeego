import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const migration=readFileSync('supabase/pending_migrations/20260818170000_agent_authorized_inventory_projection_candidate.sql','utf8');
const route=readFileSync('app/api/agent/inventory/route.ts','utf8');
const publicProjection=readFileSync('lib/public-buildings.ts','utf8');

test('authorized inventory is an authenticated RPC allowlist, not a Rental Case scope',()=>{
  assert.match(migration,/agent_building_inventory_access/);
  assert.match(migration,/a\.agent_id=auth\.uid\(\)/);
  assert.match(migration,/a\.status='active'/);
  assert.doesNotMatch(migration,/rental_cases/);
  assert.match(route,/rpc\('agent_authorized_inventory'/);
});

test('base inventory grants remain closed to anon and authenticated',()=>{
  assert.match(migration,/REVOKE ALL ON public\.agent_building_inventory_access, public\.application_policies, public\.unit_fees/);
  assert.match(migration,/REVOKE ALL ON public\.units, public\.inventory_snapshots, public\.building_sources/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.agent_authorized_inventory\(uuid\) FROM PUBLIC, anon, authenticated/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.agent_authorized_inventory\(uuid\) TO authenticated/);
});

test('public projection still omits internal inventory field names',()=>{
  for(const field of ['unit_number','inventory_snapshots','building_sources','property_contacts'])assert.doesNotMatch(publicProjection,new RegExp(field));
});
