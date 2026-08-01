# NoFeeGo Documentation SSOT

| Version | Date | Status |
| --- | --- | --- |
| 1.0.0 | 2026-07-31 | Active |

**Owner:** NoFeeGo Product & Engineering  
**Last Updated:** 2026-07-31

## Purpose

定义 NoFeeGo 文档体系的权威入口、边界和维护责任，确保团队与 AI Agent 使用同一套经过审查的项目知识。

## Scope

覆盖产品、数据、AI、技术、商业、路线图、决策和工程规范。既有专题文档继续有效；本目录通过规范化编号文件建立主索引并链接详细资料。

## Current Status

| Document | Authority |
| --- | --- |
| [00 Project Vision](00_Project_Vision.md) | 北极星、产品边界、原则 |
| [01 Product Specification](01_Product_Specification.md) | 用户、范围、需求、验收 |
| [02 Database Architecture](02_Database_Architecture.md) | 数据实体、关系、键、Supabase 映射 |
| [03 AI Architecture](03_AI_Architecture.md) | RAG、Agent、向量检索和安全边界 |
| [04 Technical Architecture](04_Technical_Architecture.md) | 系统组件、API、部署和可观测性 |
| [05 Business Model](05_Business_Model.md) | 收入、客户、成本和阶段门槛 |
| [06 Roadmap](06_Roadmap.md) | 阶段、里程碑和退出条件 |
| [07 Decision Log](07_Decision_Log.md) | 架构与产品决策记录 |
| [08 Development Guidelines](08_Development_Guidelines.md) | 端到端交付流程 |
| [09 Coding Standards](09_Coding_Standards.md) | 命名、代码、数据库、Git 规范 |
| [10 AI Workflow](10_AI_Workflow.md) | AI 数据、检索、生成、评测、发布流程 |
| [11 Knowledge Graph](11_Knowledge_Graph.md) | 核心实体、键、关系类型与图谱扩展 |
| [12 Data Dictionary](12_Data_Dictionary.md) | 当前数据库主表逐字段字典与 AI 用途 |
| [13 AI Rental Advisor](13_AI_Rental_Advisor.md) | 自适应搜索、推荐、编排、记忆与个性化边界 |
| [Documentation Audit Report](DOCUMENTATION_AUDIT_REPORT.md) | 一致性审计、修订记录与剩余差距 |
| [Database Architecture V2](database-architecture.md) | V2 迁移、兼容策略、索引与部署运行手册 |

## Documentation Rules

- 产品、架构和运营文档使用中文；代码、API、schema、数据库字段和 commit 使用英文。
- 每份文档包含版本、日期、状态、Owner、Purpose、Scope、Current Status、Future Plans、Related Documents 和 Last Updated。
- 编号文档 `00`–`13` 是规范性文档；同一主题只设一个权威文件，未编号专题文档只提供实施背景或历史细节。
- 发生冲突时以编号文档为准，并在 `07_Decision_Log.md` 记录需要保留的例外；专题文档不得另行定义数据库事实、授权或 AI 安全边界。
- 功能、schema 或政策改变必须在同一合并请求更新文档。
- 数据库字段或关系变化还必须同步更新 `12_Data_Dictionary.md`；AI 检索、推荐或记忆变化必须同步更新 `03_AI_Architecture.md`、`10_AI_Workflow.md` 和 `13_AI_Rental_Advisor.md`。
- 未经批准的设计使用 `Draft`，已采用规范使用 `Active`，废弃文档使用 `Deprecated` 并指向替代项。

文件命名：新的规范文档使用 `NN_Title_Case.md`；审计、运行手册等非编号文档使用 `UPPER_SNAKE_CASE.md`。现有专题文件暂不重命名，以避免破坏引用；后续通过合并内容消除重叠，不创建同主题副本。

## Future Plans

- 增加 ADR 自动编号与文档链接检查。
- 建立 schema、API 和事件目录的自动生成流程。
- 为 AI Agent 提供机器可读文档清单和版本索引。

## Related Documents

- [Repository README](../README.md)
- [Existing project structure](PROJECT_STRUCTURE.md)
- [Compliance boundaries](COMPLIANCE_BOUNDARIES.md)
