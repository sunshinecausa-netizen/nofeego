import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('Agent-only inventory overlay is private and role-gated', () => {
  assert.equal(existsSync(join(process.cwd(), 'app/api/v1/buildings/catalog/route.ts')), false);
  const route = source('app/api/agent/inventory/route.ts');
  assert.match(route, /authenticateAccountRequest\(request\)/);
  assert.match(route, /rpc\('current_account_role'\)/);
  assert.match(route, /role !== 'agent'/);
  assert.match(route, /agent_authorized_inventory/);
  assert.match(source('components/agent-home-browser.tsx'), /\/api\/agent\/inventory/);
});

test('public routes do not import Agent components or Agent catalog APIs', () => {
  for (const path of ['app/page.tsx', 'app/buildings/page.tsx', 'components/building-browser.tsx']) {
    const contents = source(path);
    assert.doesNotMatch(contents, /@\/app\/agent|\/api\/agent\//, path);
  }
  const browser = source('components/building-browser.tsx');
  assert.doesNotMatch(browser, /AgentBuildingBrowseFrame|building-browse-frame/);
  assert.match(browser, />List<\/Button>/);
  const publicCard = source('components/building-result-card.tsx');
  assert.doesNotMatch(publicCard, /actions\?|showSaveAndCompare|AgentBuildingCard/);
  const agentHome = source('components/agent-home-browser.tsx');
  assert.match(agentHome, /<BuildingBrowser/);
  assert.match(agentHome, /<BuildingCard \{\.\.\.card\}/);
});

test('Agent inventory authorization never filters the public catalog query', () => {
  const publicQuery = source('lib/public-buildings.ts');
  assert.doesNotMatch(publicQuery, /agent_building_inventory_access|rental_cases|tenant_interest/);
  assert.match(source('app/agent/page.tsx'), /fetchBuildingsPage/);
  const agentHome = source('components/agent-home-browser.tsx');
  assert.match(agentHome, /inventoryByBuilding\.get\(card\.building\.id\)/);
  assert.match(agentHome, /if \(!authorizedBuilding \|\| !inventory\) return <BuildingCard/);
});
