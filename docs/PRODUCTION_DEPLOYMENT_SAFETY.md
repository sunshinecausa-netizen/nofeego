# Production 部署安全规则

## 唯一正式版本

GitHub 远程 `origin/main` 是唯一 Production source of truth。文件夹名、worktree 名、`.vercel` 链接和 Vercel deployment 都不能替代 Git commit。未 commit 的修改不是正式产品版本；未合并到 `main` 的功能不得描述为“已经上线”。

Production 只能从干净的本地 `main` 发布，且 HEAD 必须与最新 `origin/main` 完全一致。即使是 `release/*`、已批准的 integration 或 feature 分支，也不能直接发布 Production。`temporary`、`temp`、`deploy-*`、`.codex-*`、detached HEAD 和 dirty worktree 均为硬阻塞。

## 标准生命周期

1. 只读同步并检查 `origin/main`。
2. 从最新 `origin/main` 创建一个短期 `feature/*`、`fix/*` 或 `perf/*` 分支；一个分支只承担一个业务目标。
3. 记录业务目标、scope、success criteria，以及是否需要 migration。
4. 完成 TypeScript、ESLint、tests、production build 和 `git diff --check`。
5. commit 并 push 确定版本。
6. 获得 Preview 单独授权后部署受保护 Preview。
7. 在 `docs/deployment/preview-acceptance.json` 记录验收，不包含 secret。
8. 用户验收后合并到 `main`。
9. 确认本地 `main` clean 且与 `origin/main` 一致。
10. 运行 `pnpm deploy:preflight`。
11. 再获取 Production 单独授权，只从检查过的 `main` SHA 发布。
12. 发布后回归并写入 `production-deployments.json`。
13. 确认功能分支/worktree 没有独有修改后，另行申请清理授权。

Preflight 通过只说明来源满足技术条件，不代表用户已授权 Production。

## Worktree 规则

Worktree 只是隔离开发目录，不是独立正式版本。默认最多保留一个干净主工作区、一个当前功能 worktree、一个必要 hotfix/integration worktree。超过三个活跃 worktree 时，Agent 必须停止创建新的 worktree，列出现有清单并建议合并、归档或清理顺序；未经授权不得删除。

新功能必须从最新 `origin/main` 创建，不能从另一个未合并功能分支继续分叉。产品和 UX 分析默认只输出方案，不创建 worktree。切换任务前报告 dirty 状态。禁止用 `git reset --hard`、`git clean` 或整目录覆盖解决差异。重要成果不得长期只存在于未提交文件。

## 自动 Preflight

运行 `pnpm deploy:preflight`。脚本只读执行 Git、Vercel 身份和 Preview 证据检查；不会 commit、push、切换分支或部署。它会 fetch `origin/main`，并在任何无法确定的条件下失败。批准的仓库、Vercel project ID 与 org ID固定在脚本中，不能通过普通参数绕过。

候选 SHA 必须存在 machine-readable Preview 验收记录。记录中的 `baseSha` 用于检查候选变更范围；出现 Supabase/数据库 migration 时阻止普通网站部署。记录还必须明确 `databaseMigrationIncluded=false` 和 `environmentVariableChangeRequired=false`，否则默认失败。

## 权限必须分离

| 操作 | 所需授权 |
| --- | --- |
| 本地代码修改 | 当前开发任务授权 |
| 创建本地 migration 文件 | 当前数据库开发任务授权 |
| 受保护 Preview | Preview 单独授权 |
| 上传或修改 Vercel 敏感变量 | 敏感凭据单独授权 |
| 云端 Supabase migration / db push | 数据库单独授权 |
| contract、DROP、删除或不可逆转换 | 高风险数据库单独授权 |
| Production 部署 | Production 单独授权 |
| Rollback 或 Promote | Production 变更单独授权 |
| 删除 worktree、branch、stash | 清理单独授权 |

“部署网站”不能扩大解释为数据库、环境变量、Promote、Rollback 或清理授权。

## Agent 职责

- 产品 Agent：批准功能时写明业务目标、scope、success criteria、migration 需求。
- UX Agent：只设计当前产品体验，不建立独立产品版本。
- 工程 Agent：开始任务前报告 branch、worktree 和 dirty 状态。
- 部署 Agent：只能在 `main` 运行 Production preflight；来源不明确或 dirty 时立即停止。
- 任何 Agent：不得因为路径含 `deploy` 就把它视为发布源。

验收和发布记录格式见 [deployment/README.md](./deployment/README.md)。
