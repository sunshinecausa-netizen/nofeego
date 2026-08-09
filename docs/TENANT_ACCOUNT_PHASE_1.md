# Tenant Account Phase 1

| Version | Date | Status |
| --- | --- | --- |
| 1.0.0 | 2026-08-09 | Draft |

**Owner:** Product & Engineering
**Last Updated:** 2026-08-09

## Purpose

记录第一阶段租客账户的认证、收藏、比较、咨询和权限边界。

## Scope

本阶段仅覆盖租客 Google OAuth、Email Magic Link、楼盘收藏、最多十栋楼盘比较、两类租房咨询和租客 Dashboard。不包含房东、经纪人或管理员工作流。

## Current Status

- `profiles` 继续以 `auth.users.id` 为主键，并增加默认 `tenant` 的 `account_role`。
- `favorites` 兼容既有 listing 收藏，并允许 building 收藏；楼盘收藏按用户和楼盘去重。
- `building_comparisons` 保存账户级比较清单，数据库触发器将每位用户限制为十栋。
- `inquiries` 保存整租与合租请求、联系方式、入住时间、预算、留言、状态和时间。
- 租客数据使用 `auth.uid()` owner-scoped RLS。租客可读取自己的咨询并提交 `Submitted` 记录，但没有 UPDATE/DELETE policy，不能修改后台状态。
- Web 写入先由服务端验证 Supabase access token，再以该用户令牌访问数据库；不使用 service-role key。

## Security And Failure Behavior

- 未登录收藏、比较和咨询草稿仅保存在当前设备，登录后恢复并去重。
- API 输入使用 Zod 校验；未知字段不会写入数据库。
- 缺少 Supabase 配置或 migration 未应用时，公开楼盘页面继续可用，账户操作显示安全错误。
- 回滚方式是回退 Web 代码；数据库为增量结构，生产回滚不得删除已有租客数据。

## Future Plans

- 增加后台咨询状态处理和通知。
- 增加服务端审计事件、速率限制和自动化 RLS 集成测试。
- 评估将浏览器令牌模式迁移至 Supabase SSR HttpOnly cookie 会话。

## Related Documents

- [Product Specification](01_Product_Specification.md)
- [Technical Architecture](04_Technical_Architecture.md)
- [Database Architecture](02_Database_Architecture.md)
- [Data Dictionary](12_Data_Dictionary.md)
