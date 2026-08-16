# Four-Role Sign In + Rental Case Source of Truth

| Field | Value |
| --- | --- |
| Base | `integration/restore-content-and-performance@80f9adfc258c4c41f0fd4a8905478049dbf3dbe3` |
| Integration branch | `codex/four-role-rental-case` |
| Worktree | `C:\Users\Work-AI\Documents\纽约租赁网站\integration-four-role-rental-case` |
| Candidate commit | 本文件所在的最终本地 commit；使用 `git rev-parse HEAD` 获取不可自引用的 SHA |
| Release state | `DEPLOYMENT PAUSED` / not deployed |

## 选择性来源

- `a794c9e`：Profile 权限提升防护原则、四角色范围、完整状态机规则、隔离测试经验。
- `bae32a2e`：仅 `UX_Flow_Designer_Agent.md`、Agent Catalog 登记和 AI OS Changelog 记录。
- 未整体 cherry-pick 任一旧提交。

## 数据职责决定

- `inquiries`：Ask a Question、轻量咨询和初步 Lead；不承载正式成交状态机。
- `rental_cases`：正式租房业务流程。可通过唯一 `inquiry_id` 关联来源 Inquiry，但拥有独立状态、分配、快照、Property handoff、历史与审计。
- 同一客户输入不在两套表中继续双向编辑；Inquiry 转换后，Rental Case 是正式流程事实源。

## 四角色

| Role | Server/database scope |
| --- | --- |
| tenant | 创建并读取自己的 Case；读取自己的推荐与历史；表达 interest 或取消 |
| agent | 只读取被分配 Case；发送不可变快照；登记授权 Property；推进允许阶段 |
| property | 只读取组织获授权 Building 的登记；确认库存、带看与申请入口 |
| admin | 审核、分配、授权和异常处理；不能通过注册或客户端字段产生 |

Property 第一阶段没有子角色，Leasing Team 不是第五个数据库角色。Profile mutation 已从浏览器撤销；普通用户只能调用白名单 self-profile RPC；Admin 不能修改自身授权，也不能移除最后一个 Admin。

## 正式状态机

主成功路径 11 状态：`submitted`、`reviewed`、`agent_assigned`、`options_sent`、`interested`、`registered_with_property`、`property_acknowledged`、`tour_scheduled`、`application_started`、`application_submitted`、`lease_signed`。

终止状态：`closed_lost`、`cancelled`。完整数据库集合共 13 个。浏览器不能任意 UPDATE；状态通过受保护 RPC 变更并写入 append-only history/audit。

## 当前候选已实现

- Google OAuth、password 和 Email Magic Link 入口；安全站内 `next` 与 `/auth/callback`。
- 四角色 profile/status 契约和 Profile Security Hotfix 适配。
- Case Assignment、不可变 Unit Recommendation Snapshot、Property Organization/Building Access。
- Property Registration、SHA-256 token hash、过期/撤销/已使用/错误邮箱检查。
- participant-scoped RLS、服务端 bearer-token API、状态 history 和 audit log。
- Tenant、Agent、Property、Admin 最小直接入口及 `/access-pending`、`/unauthorized`。
- 隔离 SQL 测试脚本、三版本差异审计和 UX Agent 定义。

## 尚未完成或外部阻断

- 所有 migration 均未部署；生产 schema 和运行状态没有验证。
- 本机缺少 Supabase CLI，Docker Desktop 未运行，空库 replay 和 SQL 测试尚未执行。
- Property invitation delivery 需要批准并配置 `PROPERTY_INVITE_DELIVERY_WEBHOOK`，可选 `PROPERTY_INVITE_DELIVERY_TOKEN`。
- 最小页面不是完整 Dashboard/CRM；Property response UI、Admin assignment form 和 Agent recommendation form 仍需下一实施阶段完善。
- SSR HttpOnly cookie session 尚未取代当前 bearer-token browser session；需 Engineering 独立评审。
- 需要刷新真实部署环境生成的数据库类型；当前类型为候选契约手工同步。

## Pending migration 顺序

1. 在禁用 Seed 的隔离数据库回放当前基线 migrations。
2. 确认 `20260815100000_create_rental_cases.sql` 已成功建立独立 Rental Case 基座。
3. 应用 `20260816160000_four_role_rental_case_candidate.sql`。
4. 执行 `supabase/tests/four_role_rental_case_candidate.sql` 并回滚测试事务。
5. 只有 Product、Security 和数据库发布审批后，才制定生产 ledger 对齐与发布窗口；本候选不授权部署。

不得重新执行 Reconciliation DDL、使用 `--include-all`、执行 Seed/回填、repair ledger 或生产写入。

## UX Agent 唯一审查目标

使用本文件顶部 Worktree 和分支，在最终本地 commit 上只读审查。若 `git status --short` 非空或 HEAD 与交付摘要不一致，停止并要求重新确认。
