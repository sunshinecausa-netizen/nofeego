# 开发治理说明

## AI 开发者启动规则

1. 每次任务必须先阅读仓库根目录的 `AGENTS.md`。
2. 编码、修改 schema 或引入服务前，必须阅读 `docs/README.md` 及其指向的相关规范。
3. `docs/` 是产品、架构、数据和 AI 决策的单一事实来源（Single Source of Truth）；实现与文档冲突时先停止并修正文档或记录决策。
4. 未同步更新 `docs/02_Database_Architecture.md`、`docs/12_Data_Dictionary.md` 和相关迁移说明，不得重新设计数据库。
5. 不得捏造数据库记录、来源、验证状态、开发商、楼宇、单元或 AI 证据；无法验证的数据保持空值或显式标记未知。
6. 导入、清洗、迁移和关联数据时必须保留既有稳定 ID；需要合并或替换 ID 时，先建立可审计映射并获得批准。

本仓库的代码、数据库字段、API 和 commit 信息使用英文；产品、架构和运营文档使用中文。

## 每项开发任务开始前的必检清单

在编写代码、修改 schema 或引入服务前，任务说明必须逐项回答：

1. **前期收入：** 它如何支持当前或未来 6 个月的可收费产品、续费或交付成本下降？若不直接支持，为什么仍应优先？
2. **未来扩展：** 它是否可复用于多组织、多城市、Web/未来 Mobile API、SaaS 或平台化？
3. **复杂度：** 是否引入了尚未被验证需求的服务、抽象、依赖或运维负担？是否存在更小的模块化实现？
4. **合规：** 是否仍符合 Technology Platform 边界、隐私、安全、Fair Housing、广告披露和 AI 治理要求？
5. **质量：** 验收标准、授权测试、关键失败路径、可观测事件、回滚/降级路径分别是什么？

未能明确回答时，停止实施并更新 `docs/` 后再继续。

## 强制工程边界

- 公共目录数据、租户私有数据和付费 entitlement 必须分层；不得以付费状态改变公开事实或自然排序。
- 每个组织私有读写操作必须校验 `organization_id`、成员角色和 entitlement；前端隐藏不是授权。
- 所有高价值写操作、订阅变更、资料发布、AI 工具调用和数据审核必须有审计记录或可追溯事件。
- API 使用版本化契约；Web UI 不得成为唯一业务入口，以支持未来 Mobile App 和合作 API。
- 新 AI 功能必须采用 grounded retrieval、来源引用、成本上限、敏感内容/提示注入防护及人工升级路径。
- 不实现经纪谈判、佣金分配、申请资格/信用判断、租约签署、租金或保证金收付，除非先完成法律与产品边界审查。

## 验收最低标准

每个合并请求至少说明：用户/客户价值、受影响的租户与权限、测试范围、监控事件、失败时的用户体验，以及对 `docs/` 的影响。数据库变更遵循 expand → migrate → switch → contract；不得以破坏性迁移换取速度。


- GitHub `origin/main` 是唯一 Production source of truth；`release/*`、integration、feature 和 hotfix 分支一律不得直接发布 Production。任何未 commit 或未合并到 `main` 的功能都不能称为已上线。
- 工程任务开始前必须报告 repository、worktree、branch、HEAD 和 dirty 状态。产品 Agent 必须记录业务目标、scope、success criteria 和 migration 需求；UX Agent 不得建立独立产品版本。
- 默认最多保留 3 个活跃 worktree（主工作区、当前功能、必要 hotfix/integration）。超过限制时停止创建，列出清单并请求合并、归档或清理决策；删除 worktree、branch 或 stash 必须单独授权。
- Production 只能在 clean `main` 且 HEAD 与 fetch 后的 `origin/main` 完全一致时运行 `pnpm deploy:preflight`。通过仍不构成 Production 授权。
- Preview、Production、Vercel 敏感变量、Supabase migration、contract/删除、Promote/Rollback 和 worktree 清理分别授权；普通部署授权不得扩大解释。
- 完整流程、Preview 证据与部署记录规范以 `docs/PRODUCTION_DEPLOYMENT_SAFETY.md` 和 `docs/deployment/` 为准。发现来源不明确、dirty、detached HEAD 或错误 Vercel project 时立即停止 Production 流程。

## 产品审核后执行工作流（永久规则）

本节适用于负责人以简单中文提出的所有新产品需求。AI 必须先完成产品审核和风险定界，再决定是否能够执行；不得要求负责人重复编写长篇实施指令。

### 1. 每次新需求的启动门禁

收到每个新需求后，在分析、设计、修改或部署前，必须依次只读确认：

1. 完整阅读仓库根目录 `AGENTS.md`。
2. 完整阅读 `docs/ACCEPTED_PRODUCT_BASELINE.md`。
3. 报告当前 repository、worktree 的绝对路径、branch、HEAD 和 `git status --short`。
4. 验证当前工作树唯一、branch 正确，并确认 HEAD 继承完整基线 `a5649b2b58f79e9dc4dfb3f98465f8d17435b893` 或其明确批准的后继 Commit。
5. 验证工作树 clean，且不存在来源不明的未跟踪、未提交或已暂存文件。

如果 worktree dirty、Source of Truth 不唯一、基线文档缺失、HEAD 不继承规定基线，或任何文件来源不明确，必须立即停止并报告准确差异。不得覆盖、清理、stash、移动、暂存或提交现有修改，也不得开始实施。

### 2. 审核后的任务合同

门禁通过后，先将负责人的自然语言需求转换为简洁、可审计的“审核后的任务合同”。合同至少必须明确：

- 真正要实现的用户结果，以及目标用户和目标路由。
- 本次唯一功能范围。
- 明确不做的内容，尤其是相邻 Dashboard、自动化、数据库和后续阶段功能。
- 允许修改的页面、组件、API、测试、文档和文件范围。
- 必须保护的既有页面、流程、数据契约和视觉行为。
- 数据库、migration、RLS、RPC、Auth、隐私、外部通信和 Production 风险。
- 可验证的验收标准，包括正常路径、越权拒绝、失败路径和响应式表现。
- 必须运行的自动化测试、人工测试、回归比较和安全检查。
- 出现失败时的停止条件、降级方式和文件级回滚方式。

合同应采用最小充分范围，不得把模糊愿望自行扩展成新产品线、完整 Dashboard 重构、自动化系统或数据库重构。

### 3. 歧义处理

如果需求存在两种或以上明显不同、且会导致不同用户结果、路由、数据权限或实现范围的合理解释，必须先提出一个简短问题请负责人确认。不得自行选择，也不得同时实现多个解释。

如果需求明确，且不涉及 Production、破坏性数据库操作、权限扩大或本文件规定的审批门，AI 可在完成任务合同后直接继续最小范围实现，无需负责人重复整份指令。

### 4. 必须停止并等待明确批准的操作

以下操作永远不得从普通功能需求、Preview 授权或相邻任务中推断授权。执行前必须停止并取得负责人对准确目标和范围的明确批准：

- Production 部署、Promote、Rollback 或解除 Production/Preview 保护。
- Production 数据库读取范围扩大、任何写入、数据回填或生产数据导出。
- 执行任何 migration、`db push`、migration ledger 修改、`migration repair` 或 `--include-all`。
- 合并 `main`，以及任何未经单独授权的 commit、push 或 PR。
- 删除或破坏表、列、数据、路由、API、测试、文档或已验收功能。
- 扩大 RLS、RPC、数据库 grant、角色能力、组织边界或 Auth 权限。
- 创建、升级或启用可能收费的云项目、套餐、资源或第三方服务。
- 向真实外部收件人发送邮件、短信、通知或其他消息。

审批只覆盖被明确点名的操作、环境、项目和文件，不得扩大解释。

### 5. 基线与增量开发规则

1. 所有功能必须从完整基线 `a5649b2b58f79e9dc4dfb3f98465f8d17435b893` 或其明确批准的后继 Commit 增量开发。
2. `docs/ACCEPTED_PRODUCT_BASELINE.md` 是已验收产品行为的冻结合同，必须完整保护。
3. 新功能不得使已验收页面、路由、组件、数据、安全边界或响应式行为消失、被替换、被绕过或退化。
4. 每次只完成一个明确功能。不得顺便扩展 Dashboard、自动化、邮件、推荐、申请流程或数据库结构。
5. 如实现需要偏离冻结基线，先停止并说明差异、用户影响、最小替代方案和回滚路径，等待批准。

### 6. UI 与路由审核规则

1. UI 任务开始前必须明确目标路由、目标角色和已验收参考页面。
2. 必须直接复用负责人指定的已验收页面、组件和布局契约；不得用“相似设计”替代已确认页面。
3. 页面职责必须按产品定义保持清晰。例如 `/agent` 是 Agent Building Catalog，Rental Case Dashboard 不得再次取代 Agent Home。
4. 页面入口、URL 参数或前端控件只能决定体验，不能决定权限；权限必须来自数据库角色以及既有 RLS/RPC/Auth 契约。
5. 未经负责人完成视觉验收，不得声称 UI 已完成、已验收或可以发布。自动截图和浏览器测试只能作为候选证据。

### 7. 实施、测试与回滚

- 只修改任务合同允许的文件；发现需要扩大范围时立即停止。
- 保持公共数据、角色私有数据和内部字段隔离，不得依靠前端隐藏代替授权。
- 测试至少覆盖受影响的正常用户路径、角色越权拒绝、Auth 安全返回、数据隔离、桌面和手机视口，以及冻结基线回归。
- 代码任务必须按项目现有命令运行 TypeScript、ESLint、Production Build、相关单元/契约/E2E 测试和 `git diff --check`。
- 数据库候选必须保持 additive、非破坏性和可回滚；未经单独批准不得执行 migration。测试只能使用明确授权的本地隔离数据库或 Preview 项目，不得使用 Production。
- 回滚优先采用本次任务的文件级反向变更或撤销独立 Preview；不得使用会覆盖用户工作的 `reset --hard`、整体 checkout 或未授权清理。
- 任一关键测试失败时，不得把任务标记为完成；只修复本次合同范围内的问题，无法安全修复则报告唯一阻断项。

### 8. 完成交付合同

每个功能完成后必须报告：

- 实际修改文件清单和每个文件的用途。
- 当前 Commit SHA；若按授权保持未提交，必须明确说明“没有创建新 Commit”，不得伪造交付 SHA。
- TypeScript、ESLint、Build、相关测试、权限测试和 `git diff --check` 的准确结果。
- 如已单独获批创建受保护 Preview，提供 Preview URL、Deployment ID、目标环境和保护状态；未获批时明确说明未部署。
- 与 `docs/ACCEPTED_PRODUCT_BASELINE.md` 冻结行为逐项回归的结果。
- 已知限制、风险、失败项和人工必须检查的内容。
- UI 任务明确标记为“等待人工视觉验收”，直到负责人实际批准。

不得把本地完成、测试通过、Preview Ready、已验收、已合并和已上线混为一谈。未经明确授权和事实证据，不得声称已经 commit、push、合并、部署 Production 或上线。
