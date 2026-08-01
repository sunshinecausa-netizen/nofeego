# 数据字典

## 文档元数据

- 版本：1.0
- 日期：2026-07-31
- 状态：当前实现基线
- 负责人：NoFeeGo Engineering
- 事实来源：`supabase/migrations/*.sql`

## 使用规则

本字典记录当前迁移创建的全部主表。示例只说明格式，并非真实数据库记录。每次迁移必须同步本文件并遵循 expand → migrate → switch → contract。未来实体在末节单列，迁移落地前不得视为可查询表。

## `profiles`

| Field Name | Description | Data Type | Example | Nullable | Future AI Usage |
| --- | --- | --- | --- | --- | --- |
| `id` | 用户主键，引用 `auth.users` | `uuid` | `user-uuid` | No | 记忆/推荐授权边界 |
| `display_name` | 显示名称 | `text` | `Alex` | Yes | 经同意的称呼 |
| `email` | 账户邮箱 | `text` | `user@example.com` | Yes | 不进入 embedding/排序 |
| `is_admin` | 管理员标记 | `boolean` | `false` | No | AI 工具授权 |
| `created_at`, `updated_at` | 创建/更新时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 审计、新鲜度 |

## `neighborhoods`

| Field Name | Description | Data Type | Example | Nullable | Future AI Usage |
| --- | --- | --- | --- | --- | --- |
| `id` | 社区主键 | `uuid` | `neighborhood-uuid` | No | 实体关联 |
| `slug` | 唯一 SEO 标识 | `text` | `upper-west-side` | No | 引用 URL |
| `name` | 社区名称 | `text` | `Upper West Side` | No | 检索/回答 |
| `borough` | 行政区 | `text` | `Manhattan` | No | 地理过滤 |
| `description` | 已审核描述 | `text` | `...` | Yes | RAG/embedding |
| `avg_rent` | 聚合平均租金 | `integer` | `4800` | Yes | 预算过滤，需来源/时效 |
| `latitude`, `longitude` | 中心点坐标 | `numeric(9,6)` | `40.787000` | Yes | 距离计算 |
| `hero_image` | 主图 URL | `text` | `https://...` | Yes | 展示 |
| `highlights` | 亮点数组 | `text[]` | `{parks,transit}` | Yes | 检索特征 |
| `seo_title`, `seo_description` | SEO 文案 | `text` | `UWS Rentals` | Yes | 搜索展示 |
| `faqs` | FAQ 结构 | `jsonb` | `[{"q":"...","a":"..."}]` | Yes | 已审核 RAG |
| `restaurants`, `coffee_shops`, `parks`, `schools` | 旧版附近地点数组 | `text[]` | `{Riverside Park}` | Yes | 临时检索，未来迁移 `pois` |
| `lifestyle`, `transportation` | 旧版摘要数组 | `text[]` | `{subway access}` | Yes | 临时 RAG，不生成主观评分 |
| `created_at`, `updated_at` | 创建/更新时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 新鲜度/审计 |

## `buildings`

| Field Name | Description | Data Type | Example | Nullable | Future AI Usage |
| --- | --- | --- | --- | --- | --- |
| `id` | 楼宇主键 | `uuid` | `building-uuid` | No | 楼宇知识关联 |
| `slug`, `name` | 唯一路由标识/名称 | `text` | `example-tower` | No | 检索/引用 |
| `neighborhood_id` | 社区 FK | `uuid` | `neighborhood-uuid` | Yes | 图谱/过滤 |
| `address`, `city`, `state` | 地址、城市、州 | `text` | `123 W 42nd St` | No | 地理检索 |
| `zip_code` | 邮编 | `text` | `10036` | Yes | 地理过滤 |
| `latitude`, `longitude` | 坐标 | `numeric(9,6)` | `40.755000` | Yes | POI/交通距离 |
| `description` | 已审核描述 | `text` | `...` | Yes | RAG/embedding |
| `building_type` | 楼宇类型 | `text` | `high-rise` | Yes | 结构化过滤 |
| `amenities` | 旧版设施数组 | `text[]` | `{Doorman,Gym}` | Yes | 过滤，未来规范化 |
| `year_built`, `floors` | 建成年份/层数 | `integer` | `2018` | Yes | 客观因子 |
| `hero_image`, `gallery` | 主图/图库 | `text`, `text[]` | `https://...` | Yes | 展示 |
| `seo_title`, `seo_description` | SEO 文案 | `text` | `Example Tower Rentals` | Yes | 搜索展示 |
| `faqs` | 楼宇 FAQ | `jsonb` | `[{"q":"...","a":"..."}]` | Yes | Grounded FAQ |
| `nearby_subway`, `nearby_grocery`, `nearby_restaurants` | 旧版附近地点 | `text[]` | `{Line 7}` | Yes | 临时 RAG，未来关系表 |
| `transportation` | 交通摘要 | `text[]` | `{10 min walk}` | Yes | 需来源/计算时间 |
| `neighborhood_summary` | 楼宇语境的社区摘要 | `text` | `...` | Yes | RAG/embedding |
| `contact_email`, `contact_phone` | 公开联系方式 | `text` | `leasing@example.com` | Yes | 工具返回，不进入 embedding |
| `created_at`, `updated_at` | 创建/更新时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 新鲜度/审计 |

## `listings`

| Field Name | Description | Data Type | Example | Nullable | Future AI Usage |
| --- | --- | --- | --- | --- | --- |
| `id` | Listing 主键 | `uuid` | `listing-uuid` | No | 候选身份 |
| `slug`, `title` | 唯一路由标识/标题 | `text` | `example-12a` | No | 检索/引用 |
| `building_id`, `neighborhood_id` | 楼宇/社区 FK | `uuid` | `building-uuid` | Yes | 图谱/过滤 |
| `unit_number` | 单元号 | `text` | `12A` | Yes | 单元关联 |
| `price` | 月租整数金额 | `integer` | `4200` | No | 预算硬过滤 |
| `bedrooms`, `bathrooms` | 卧室/浴室数 | `numeric(2,1)` | `1.0` | No | 硬过滤 |
| `sqft` | 面积 | `integer` | `720` | Yes | 比较 |
| `furnished` | 是否带家具 | `boolean` | `false` | No | 硬过滤 |
| `pet_policy` | 宠物政策 | `text` | `pets_allowed` | No | 偏好过滤 |
| `move_in_date` | 可入住日 | `date` | `2026-09-01` | Yes | 时效过滤 |
| `lease_term_months` | 租期月数 | `integer` | `12` | Yes | 过滤 |
| `listing_type` | 租赁类型 | `text` | `rental` | No | 类型过滤 |
| `status` | 发布状态 | `text` | `active` | No | 发布过滤 |
| `description` | 已审核描述 | `text` | `...` | Yes | RAG/embedding |
| `images`, `amenities` | 旧版图片/设施数组 | `text[]` | `{Doorman}` | Yes | 展示/检索 |
| `latitude`, `longitude` | 坐标 | `numeric(9,6)` | `40.755000` | Yes | 距离计算 |
| `seo_title`, `seo_description` | SEO 文案 | `text` | `1BR at Example Tower` | Yes | 搜索展示 |
| `created_at`, `updated_at` | 创建/更新时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 新鲜度 |

## `amenities`、`listing_images`、`favorites`、`property_submissions`

| Table.Field | Description | Data Type | Example | Nullable | Future AI Usage |
| --- | --- | --- | --- | --- | --- |
| `amenities.id`, `name` | 主键/唯一名称 | `uuid`, `text` | `Doorman` | No | 规范标签/过滤 |
| `amenities.icon` | UI 图标名 | `text` | `user` | Yes | 无 |
| `amenities.category` | 设施类别 | `text` | `building` | No | 过滤分组 |
| `amenities.created_at` | 创建时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 审计 |
| `listing_images.id` | 图片主键 | `uuid` | `image-uuid` | No | 无 |
| `listing_images.listing_id` | Listing FK | `uuid` | `listing-uuid` | Yes | 关联展示 |
| `listing_images.url` | 图片 URL | `text` | `https://...` | No | 多模态能力另审 |
| `listing_images.caption` | 图片说明 | `text` | `Living room` | Yes | 已审核图像语义 |
| `listing_images.sort_order` | 排序 | `integer` | `0` | No | 无 |
| `listing_images.created_at` | 创建时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 审计 |
| `favorites.id` | 收藏主键 | `uuid` | `favorite-uuid` | No | 私有行为信号 |
| `favorites.user_id`, `listing_id` | 用户/Listing FK | `uuid` | `user-uuid` | No | 经同意的个性化 |
| `favorites.created_at` | 收藏时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 时序偏好 |
| `property_submissions.id` | 提交主键 | `uuid` | `submission-uuid` | No | 审核工作流 |
| `property_submissions.user_id` | 提交人 FK | `uuid` | `user-uuid` | Yes | 授权/审计 |
| `property_submissions.submission_data` | 原始表单 | `jsonb` | `{"address":"..."}` | No | 审核后才可转事实 |
| `property_submissions.status` | 审核状态 | `text` | `pending` | No | 工作流路由 |
| `property_submissions.listing_id` | 转换后的 Listing FK | `uuid` | `listing-uuid` | Yes | 来源追溯 |
| `property_submissions.created_at`, `updated_at` | 创建/更新时间 | `timestamptz` | `2026-07-31T12:00:00Z` | Yes | 审计 |

## 待迁移的规范主表

V2 migration `20260731000100_database_v2.sql` 已定义待部署的 `units`、`building_amenities`、`photos`、`transit` 及 future placeholder tables，并扩展 `buildings`。部署前其状态仍为 migration-defined，而非 production-applied；字段和索引以 [V2 implementation specification](database-architecture.md) 为准。

`developers`、`building_developers`、`pois`、`source_records`、`availability_snapshots`、`organizations`、`organization_members`、`entitlements`、`audit_logs`、`knowledge_chunks`、`ai_recommendations` 和 `ai_recommendation_items` 仍只属于目标架构。
