import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const APPROVED = Object.freeze({
  remoteUrl: 'https://github.com/sunshinecausa-netizen/nofeego.git',
  vercelProjectId: 'prj_5LZ7PTQH987QNcoyiQnQqRzS0aIm',
  vercelOrgId: 'team_pbhuryUqPDpZ80NGUWzUWxh1',
  vercelProjectName: 'nofeego',
});

const temporaryPattern = /(^|[\\/._-])(temp(?:orary)?|tmp|deploy-[^\\/]*|\.codex-[^\\/]*)([\\/._-]|$)/i;
const migrationPattern = /(^|\/)(supabase\/migrations|supabase\/migration_candidates|supabase\/data_migrations|database\/migrations)\//i;

function normalizeRemote(value = '') {
  return value.trim().replace(/^git@github\.com:/i, 'https://github.com/').replace(/\/$/, '').toLowerCase();
}

export function evaluateProductionPreflight(facts) {
  const blockers = [];
  const block = (message) => blockers.push(message);
  if (!facts.insideGitRepository) block('当前目录不属于 Git 仓库。');
  if (normalizeRemote(facts.remoteUrl) !== normalizeRemote(APPROVED.remoteUrl)) block('Git remote 不是批准的 NYC Homes / NoFeeGo 仓库。');
  if (temporaryPattern.test(facts.worktreePath) || temporaryPattern.test(facts.branch)) block('当前路径或分支属于临时、deploy 或 .codex 来源。');
  if (facts.detachedHead) block('当前是 detached HEAD，无法追溯正式分支。');
  if (facts.branch !== 'main') block('Production 只能从 main 分支发布。');
  if (facts.gitStatus) block('工作树不是 clean；存在 staged、unstaged 或 untracked 文件。');
  if (!facts.upstream) block('本地 main 没有配置 upstream。');
  if (!facts.fetchSucceeded) block('无法 fetch origin/main，不能确认远程最新状态。');
  if (!facts.originMainSha) block('无法读取 origin/main。');
  if (facts.headSha && facts.originMainSha && facts.headSha !== facts.originMainSha) block('本地 HEAD 与 origin/main 不一致。');
  if (facts.ahead !== 0 || facts.behind !== 0) block(`本地 main 与 origin/main 未同步（ahead ${facts.ahead ?? '未知'} / behind ${facts.behind ?? '未知'}）。`);
  if (facts.vercelProjectId !== APPROVED.vercelProjectId || facts.vercelOrgId !== APPROVED.vercelOrgId || facts.vercelProjectName !== APPROVED.vercelProjectName) block('当前 .vercel 链接的 project 或 org 不是批准的 NoFeeGo Production 项目。');
  if (facts.target !== 'production') block('必须显式指定 --target=production。');
  if (!facts.previewEvidence) block('没有找到与当前 main SHA 对应的 Preview 验收记录。');
  if (facts.previewEvidence && facts.previewEvidence.status !== 'accepted') block('当前 Preview 验收记录尚未标记为 accepted。');
  if (facts.previewEvidence && facts.previewEvidence.productionCandidateSha !== facts.headSha) block('Preview 验收记录的 Production candidate SHA 与当前 HEAD 不一致。');
  if (facts.previewEvidence && facts.previewEvidence.approvedForMain !== true) block('Preview 记录未明确批准进入 main。');
  const requiredPreviewChecks = ['desktop', 'tablet', 'mobile', 'coreRoutes', 'signIn', 'aiSearch', 'rentalCase', 'map', 'contentIntegrity', 'performance'];
  if (facts.previewEvidence && requiredPreviewChecks.some((field) => facts.previewEvidence[field] !== 'pass')) block('Preview 记录中的设备或核心功能验收未全部通过。');
  if (facts.previewEvidence && (!facts.previewEvidence.acceptedBy || !facts.previewEvidence.acceptedAt || !String(facts.previewEvidence.previewUrl ?? '').startsWith('https://'))) block('Preview 记录缺少验收人、验收时间或有效 HTTPS URL。');
  if (!facts.previewEvidence?.baseSha) block('Preview 验收记录缺少用于检查变更范围的 base SHA。');
  if (facts.migrationFilesChanged || facts.previewEvidence?.databaseMigrationIncluded === true) block('候选版本包含数据库 migration；必须取得独立数据库授权，不能走普通网站发布。');
  if (facts.previewEvidence && facts.previewEvidence.databaseMigrationIncluded !== false) block('Preview 记录未明确确认 databaseMigrationIncluded=false。');
  if (facts.previewEvidence?.environmentVariableChangeRequired === true) block('候选版本需要修改环境变量；必须取得敏感凭据独立授权。');
  if (facts.previewEvidence && facts.previewEvidence.environmentVariableChangeRequired !== false) block('Preview 记录未明确确认 environmentVariableChangeRequired=false。');
  return { pass: blockers.length === 0, blockers };
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

export function collectRuntimeFacts({ cwd = process.cwd(), target = '' } = {}) {
  let root = resolve(cwd);
  let insideGitRepository = false;
  try { root = resolve(git(cwd, 'rev-parse', '--show-toplevel')); insideGitRepository = true; } catch { /* evaluated below */ }
  if (!insideGitRepository) return { insideGitRepository, worktreePath: root, branch: '', detachedHead: true, target };
  let branch = '';
  try { branch = git(root, 'symbolic-ref', '--short', '-q', 'HEAD'); } catch { /* detached */ }
  const headSha = git(root, 'rev-parse', 'HEAD');
  let remoteUrl = '';
  let upstream = '';
  let originMainSha = '';
  try { remoteUrl = git(root, 'remote', 'get-url', 'origin'); } catch { /* evaluated below */ }
  try { upstream = git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'); } catch { /* evaluated below */ }
  const fetch = spawnSync('git', ['-C', root, 'fetch', '--quiet', 'origin', 'main'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const fetchSucceeded = fetch.status === 0;
  try { originMainSha = git(root, 'rev-parse', 'origin/main'); } catch { /* evaluated below */ }
  let ahead = null;
  let behind = null;
  if (originMainSha) {
    try { [behind, ahead] = git(root, 'rev-list', '--left-right', '--count', `origin/main...HEAD`).split(/\s+/).map(Number); } catch { /* evaluated below */ }
  }
  const vercel = readJson(resolve(root, '.vercel', 'project.json')) ?? {};
  const acceptance = readJson(resolve(root, 'docs', 'deployment', 'preview-acceptance.json'));
  const previewEvidence = acceptance?.acceptances?.find((item) => item.productionCandidateSha === headSha) ?? null;
  let changedFiles = [];
  if (previewEvidence?.baseSha) {
    try { changedFiles = git(root, 'diff', '--name-only', `${previewEvidence.baseSha}...${headSha}`).split(/\r?\n/).filter(Boolean); } catch { changedFiles = ['<unable-to-determine>']; }
  }
  return {
    insideGitRepository,
    repositoryName: basename(root),
    worktreePath: root,
    branch,
    detachedHead: !branch,
    headSha,
    remoteUrl,
    gitStatus: git(root, 'status', '--porcelain=v1'),
    upstream,
    fetchSucceeded,
    originMainSha,
    ahead,
    behind,
    vercelProjectId: vercel.projectId ?? '',
    vercelOrgId: vercel.orgId ?? '',
    vercelProjectName: vercel.projectName ?? '',
    target,
    previewEvidence,
    migrationFilesChanged: changedFiles.some((path) => path === '<unable-to-determine>' || migrationPattern.test(path.replaceAll('\\', '/'))),
  };
}

function printResult(facts, result) {
  if (!result.pass) {
    console.error('PRODUCTION PREFLIGHT: FAIL');
    result.blockers.forEach((message, index) => console.error(`${index + 1}. ${message}`));
    console.error('没有执行部署。修复以上问题后重新运行；通过后仍需用户单独授权 Production。');
    return;
  }
  console.log('PRODUCTION PREFLIGHT: PASS');
  console.log(`Repository: ${APPROVED.remoteUrl}`);
  console.log(`Worktree: ${facts.worktreePath}`);
  console.log(`Branch: ${facts.branch}`);
  console.log(`Commit SHA: ${facts.headSha}`);
  console.log('Git status: clean');
  console.log('origin/main: synchronized');
  console.log(`Vercel project: ${facts.vercelProjectName} (${facts.vercelProjectId})`);
  console.log('Target: Production');
  console.log(`Preview evidence: ${facts.previewEvidence.previewUrl}`);
  console.log('Database migration included: no');
  console.log('Environment variable change: no');
  console.log('Production authorization: still required');
}

const isMainModule = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  const target = process.argv.find((value) => value.startsWith('--target='))?.split('=')[1] ?? '';
  const facts = collectRuntimeFacts({ target });
  const result = evaluateProductionPreflight(facts);
  printResult(facts, result);
  if (!result.pass) process.exitCode = 1;
}
