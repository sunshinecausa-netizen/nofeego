# 四角色 Rental Case 三版本差异审计

| Date | Status | Scope |
| --- | --- | --- |
| 2026-08-16 | Candidate / Deployment Paused | `80f9adf`、`a794c9e`、`bae32a2e` |

## 结论

以 `integration/restore-content-and-performance@80f9adf` 为唯一基线，保留其最新网站、性能结构和独立 `rental_cases` 架构；旧四角色候选只作为权限规则和状态机证据，不整体 cherry-pick；UX Agent 只迁移三个明确授权的文档能力。

## 逐能力分类

| Capability / files | 80f9adf status | Decision |
| --- | --- | --- |
| 最新公开网站、地图、搜索、内容与性能代码 | 已具备 | 保留，不从旧分支覆盖 |
| `20260815100000_create_rental_cases.sql` | 已具备独立表，但仅 tenant/admin、4 个显示状态 | 以增量 migration 扩展 |
| Inquiry intake API | 已具备，整租 Inquiry 同时创建 Rental Case | 保留转换关系；改用 `submitted` |
| Tenant Rental Case read | 已具备基础读取 | 扩展为快照、历史、登记的参与者范围读取 |
| Admin Rental Case 页面 | 已具备，但浏览器可直接 UPDATE | 与安全契约冲突；状态写入改为 RPC/API，旧直接更新页面不作为批准入口 |
| Profile privilege hotfix (`a794c9e`) | 基线未完整具备 | 迁移安全原则，适配四角色字段和独立表 |
| 四角色枚举与状态机 (`a794c9e`) | 缺失 | 选择性重新实现 |
| Agent assignment / snapshot | 缺失 | 选择性重新实现；快照不可变 |
| Property Organization / Building Access | 缺失 | 选择性重新实现 |
| Property Registration / hashed invitation | 缺失 | 选择性重新实现；交付 webhook 为外部阻断 |
| 状态历史和审计 | 缺失 | 选择性重新实现 |
| 旧候选扩展 `inquiries` 为完整 Case | 与批准架构冲突 | 不迁移，已被独立 `rental_cases` 替代 |
| 旧候选 Migration 目录归档、Reconciliation、Bootstrap | 不属于本次业务整合 | 不迁移、不重放、不修改 ledger |
| 旧候选页面、组件、配置 | 基于落后 174 commits 的网站 | 不迁移；最小入口在最新基线上重新实现 |
| UX Agent (`bae32a2e`) | 缺失 | 仅迁移 Agent 文件、Catalog、Changelog |
| temporary-site-protection 的其他文件 | 与目标无关 | 不迁移 |

## 状态口径

“11 状态闭环”指主成功路径：`submitted → reviewed → agent_assigned → options_sent → interested → registered_with_property → property_acknowledged → tour_scheduled → application_started → application_submitted → lease_signed`。

数据库完整集合为 13 个状态，另含两个终止分支：`closed_lost`、`cancelled`。测试必须分别证明成功路径、失败路径和非法跳转拒绝。

## 冲突处理

- 产品已批准 Inquiry 与 Rental Case 分责，因此没有采用旧分支“复用 inquiries 作为唯一 Case”的结论。
- 80f9adf 的旧 `rental_case_options` 保留兼容读取，不作为新推荐事实源；新发送使用不可变快照表。
- 已有 Admin 页面直接从浏览器更新状态违反新契约；候选的授权写入只通过服务器 bearer token 调用受保护 RPC。
- 没有执行整体 cherry-pick、旧页面复制、DROP TABLE/COLUMN、Seed、数据回填或生产操作。
