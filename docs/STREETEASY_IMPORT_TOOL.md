# StreetEasy URL 半自动导入工具

| 版本 | 日期 | 状态 | Owner |
| --- | --- | --- | --- |
| 0.1.0 | 2026-08-10 | Draft / Local preview only | Data & Engineering |

## Purpose

将单个 StreetEasy 楼盘公开事实页面转换为 NoFeeGo 标准化 Excel 审核预览。第一阶段不连接或写入 Supabase。

## Scope

- 单次、人工触发的楼盘 URL 读取；不提供批量、定时或队列抓取。
- 只提取楼盘身份、地址、物理属性、已明确标注的设施和当前出租库存事实。
- 不保存整页 HTML，不下载图片、户型图，不复制 About、经纪人房源文案或其他原创描述。
- 遇到登录、验证码、访问限制、HTTP 错误或关键身份字段缺失时停止或标记审核，不猜测数据。

## 使用方法

```powershell
pnpm extract:building --url=https://streeteasy.com/building/atelier-condominium --template=Building_Master.xlsx
```

如已通过合法方式取得并获准用于解析测试的本地 HTML 快照，可避免再次请求来源网站：

```powershell
pnpm extract:building --url=https://streeteasy.com/building/atelier-condominium --html-file=path/to/authorized-snapshot.html --template=Building_Master.xlsx
```

`--html-file` 不会改变来源 URL，也不会把 HTML 复制进输出。默认输出位于 `outputs/street-easy-import/`。

## 输出

- `NoFeeGo_StreetEasy_*_Review.xlsx`：标准表、库存快照、原始/标准值、字段映射和审核报告。
- `raw-facts.json`：仅包含已匹配的事实值，不含页面正文或媒体。
- `validation-report.json`：缺失、异常和本地 Excel 重复候选。
- `extraction-metadata.json`：来源、时间、版本及请求次数。
- `extraction-error.json`：访问限制或读取失败时的明确停止记录。

## 数据模型

复用现有 `Building_Master`、`Unit_Master`、`Amenity_Master`、`building_sources` 和 `import_batches` 字段。动态租金和可租日期输出到与现有 `inventory_snapshots` 表一致的 `Inventory_Snapshots`，不写入 Unit 稳定结构，也不新增数据库模型。

## 审核规则

- `High`：身份字段主要来自有效 JSON-LD 且通过格式校验。
- `Medium`：来自稳定语义标题或标签，未发现关键冲突。
- `Low`：关键字段缺失或仅有较弱证据。
- 缺少关键身份字段、发现重复候选、任何低/中置信度或解析异常时，`requires_review=true`。
- Architect 当前没有规范数据库列，只保留在 `Raw_Facts` 和审核信息中，未来增加字段前必须先更新数据字典和 migration。

## 失败、回滚和安全

该工具不包含 Supabase 客户端，不读取 Supabase 环境变量。所有结果均为本地预览，可通过删除对应输出批次回滚。访问限制不会触发代理、浏览器自动化、重试风暴或验证码处理。

## Future Plans

人工审核流程稳定后，可增加显式 `--dry-run-supabase` 适配器：只读取本地审核通过的工作簿，复用现有 importer 的校验与重复匹配，输出拟插入/更新差异；仍不得默认写入生产。

## Related Documents

- `docs/02_Database_Architecture.md`
- `docs/12_Data_Dictionary.md`
- `docs/ai-operating-system/SOP/Building_Import_Pipeline.md`
- `scripts/import-buildings.ts`
