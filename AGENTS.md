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
