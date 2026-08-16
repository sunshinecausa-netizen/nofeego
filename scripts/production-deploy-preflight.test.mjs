import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVED, evaluateProductionPreflight } from './production-deploy-preflight.mjs';

const sha = 'a'.repeat(40);
const cleanFacts = () => ({
  insideGitRepository: true,
  remoteUrl: APPROVED.remoteUrl,
  worktreePath: 'C:\\Users\\Work-AI\\Documents\\GitHub\\nofeego',
  branch: 'main',
  detachedHead: false,
  gitStatus: '',
  upstream: 'origin/main',
  fetchSucceeded: true,
  headSha: sha,
  originMainSha: sha,
  ahead: 0,
  behind: 0,
  vercelProjectId: APPROVED.vercelProjectId,
  vercelOrgId: APPROVED.vercelOrgId,
  vercelProjectName: APPROVED.vercelProjectName,
  target: 'production',
  previewEvidence: {
    status: 'accepted', productionCandidateSha: sha, baseSha: 'b'.repeat(40), previewUrl: 'https://example.invalid',
    acceptedAt: '2026-08-16T00:00:00Z', acceptedBy: 'test-user', approvedForMain: true,
    desktop: 'pass', tablet: 'pass', mobile: 'pass', coreRoutes: 'pass', signIn: 'pass', aiSearch: 'pass', rentalCase: 'pass', map: 'pass', contentIntegrity: 'pass', performance: 'pass',
    databaseMigrationIncluded: false, environmentVariableChangeRequired: false,
  },
  migrationFilesChanged: false,
});

test('passes only when every production condition is satisfied', () => assert.equal(evaluateProductionPreflight(cleanFacts()).pass, true));
for (const [name, mutate, expected] of [
  ['non-main branch', (facts) => { facts.branch = 'feature/test'; }, 'main 分支'],
  ['dirty worktree', (facts) => { facts.gitStatus = ' M app/page.tsx'; }, '不是 clean'],
  ['detached HEAD', (facts) => { facts.detachedHead = true; facts.branch = ''; }, 'detached HEAD'],
  ['origin mismatch', (facts) => { facts.originMainSha = 'c'.repeat(40); facts.behind = 1; }, '不一致'],
  ['wrong Vercel project', (facts) => { facts.vercelProjectId = 'wrong'; }, '.vercel'],
  ['migration change', (facts) => { facts.migrationFilesChanged = true; }, 'migration'],
  ['temporary source', (facts) => { facts.worktreePath = 'C:\\temp\\deploy-site'; }, '临时'],
]) test(`blocks ${name}`, () => {
  const facts = cleanFacts();
  mutate(facts);
  const result = evaluateProductionPreflight(facts);
  assert.equal(result.pass, false);
  assert.ok(result.blockers.some((message) => message.includes(expected)));
});
