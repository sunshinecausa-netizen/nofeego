# Automation Scripts

| Version | Date | Status |
| --- | --- | --- |
| 1.0.0 | 2026-07-31 | Planned |

**Owner:** Data & Engineering  
**Last Updated:** 2026-07-31

## Purpose

定义未来数据、AI 和 Supabase 自动化脚本的职责、输入输出和安全要求。

## Scope

本目录包含可重复、可审计的数据自动化脚本。脚本必须默认安全、输出错误摘要，并使用英文文件名和参数。

## Current Status

### Building Importer

`import-buildings.ts` 导入已验证的 Excel/CSV Building Master，默认 dry-run，并在源文件旁输出 JSON summary。

```powershell
pnpm import:buildings Database/building_expansion_20260731/Developer_Master.xlsx
pnpm import:buildings Database/building_expansion_20260731/Developer_Master.xlsx --commit
```

`--commit` 需要 `SUPABASE_URL` 与仅服务端使用的 `SUPABASE_SERVICE_ROLE_KEY`。

| Planned Script | Responsibility | Required Safeguards |
| --- | --- | --- |
| `generate_embeddings.py` | 为已发布、内容哈希变化的知识文本生成 embedding | 模型/维度/成本记录、批次限额、幂等、无来源不生成 |
| `calculate_scores.py` | 运行独立、版本化的事实匹配/评分规则 | 无受保护属性、权重可审计、不得修改公共事实 |
| `sync_supabase.py` | 将已验证 master/staging 数据同步至 Supabase | dry-run、schema 验证、事务、RLS/权限检查、回滚 |
| `update_poi.py` | 更新 POI、距离和来源状态 | 合法数据源、速率限制、坐标验证、失效处理 |
| `update_transit.py` | 更新站点、线路和服务元数据 | 来源版本、时效、网络/市场隔离、差异审核 |

## Script Contract

每个脚本必须提供 `--help`、dry-run、结构化日志、非零失败码、输入 schema、输出摘要、批次 ID、幂等策略、超时/重试和敏感信息处理说明。生产写入不得使用开发者个人凭据。

## Future Plans

先实现数据验证和 Supabase dry-run，再实现 POI/Transit 更新；只有 embedding 数据合同和评测门禁完成后才实现向量生成；评分脚本最后实施。

## Related Documents

- [Database README](../Database/README.md)
- [Database Architecture](../docs/02_Database_Architecture.md)
- [AI Workflow](../docs/10_AI_Workflow.md)
- [Development Guidelines](../docs/08_Development_Guidelines.md)
