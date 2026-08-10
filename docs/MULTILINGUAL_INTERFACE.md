# 双语界面实施说明

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| 1.0.0 | 2026-08-10 | Active |

**Owner:** NoFeeGo Product & Engineering

## Purpose

记录 English (`en`) 与简体中文 (`zh-Hans`) 界面的路由、语言选择和数据边界。

## Current Status

- English 保留无前缀 URL；中文使用 `/zh-hans` 前缀，并保留查询参数。
- 顶部导航提供明确的中英文切换入口，用户选择通过 cookie 保存。
- 不根据浏览器语言推断用户国籍、种族或住房偏好。
- 界面词典由版本控制，中文环境不展示英文 UI，English 环境不注入中文 UI。
- 语言只改变显示文案，不改变楼宇事实、官方名称、地址、价格、排序、认证或权限。

## Quality and Failure Behavior

- `/zh-hans` 路由复用同一份业务组件和 API，避免两套功能分叉。
- 语言 cookie 不参与授权、排序、搜索资格或 Fair Housing 决策。
- 词典缺失时保留原始事实值，不伪造物业数据翻译。

## Future Plans

- 将已审核的楼宇和社区内容翻译与稳定实体 ID 关联。
- 补充 locale 级 canonical、hreflang 和内容审核工作流。

## Related Documents

- [Tenant Account Phase 1](TENANT_ACCOUNT_PHASE_1.md)
