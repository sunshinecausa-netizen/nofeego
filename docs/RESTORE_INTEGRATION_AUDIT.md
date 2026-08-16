# 内容恢复与性能集成审计

## 基线与来源

集成分支 `integration/restore-content-and-performance` 从 `5cc4d0a` 创建。该 SHA 的路由集合与旧 Production `dpl_FZADVwHJaVFk3Jm4aBjFPRrx1FMm` 一致，包含 Rental Case、Roommate、Privacy、Terms 和完整 Admin；错误发布基线 `ac7e7a4` 相对该主线落后 259 个提交。

| 来源 | 状态 | 用途 |
| --- | --- | --- |
| `5cc4d0a` / `perf/loading-optimization` | 完整基线；来源 worktree dirty，保持冻结 | 全站内容、AI Search、Rental Case、Roommate、价格 Marker |
| `995b48a` | 干净 | 完整主线交叉核对 |
| `2117e38` | 干净 | AI Search、Rental Case 路由交叉核对；功能已存在于基线 |
| `a98271e` | 2 modified + 2 untracked | 地图卡片匹配交叉核对；基线已包含后续实现 |
| `ac7e7a4` dirty worktree | 错误发布源 | 仅提取 bounds、渐进卡片和安全响应头，不作为基线 |
| 旧 Vercel deployment | 96 个构建产物路径 | 内容完整性基准 |

## 功能矩阵

“事实”来自 Git、路由或代码；“推断”表示仍需受保护 Preview 视觉/交互验收。

| 功能 | 最完整/最新来源 | 目标实现 | 冲突与风险 | 证据 |
| --- | --- | --- | --- | --- |
| 首页 | `5cc4d0a` | 保留 | 无 | 事实 |
| 楼盘目录 | 基线内容 + 快速版查询 | 语义合并 | 公开旧视图与 server-only catalog 冲突，已隔离 | 事实 |
| 楼盘详情 | `5cc4d0a` | 原样保留 | 快速版缺少详情导出，不覆盖 | 事实 |
| 楼盘卡片 | `5cc4d0a` + 性能 worktree | 保留完整卡片，首批 12 | Street View 自动加载仅前 2 张 | 事实 |
| 地图 | `5cc4d0a`、`a98271e` | 保留价格 Marker、cluster、卡片匹配 | 视觉需 Preview | 事实/推断 |
| 价格与库存 | `5cc4d0a`、server catalog | 列表 bounds 查询 server-only | 实际云数据需 Preview | 事实/推断 |
| AI Search | `2117e38` 后续主线 | 基线已有，保留 | 无需重复恢复 | 事实 |
| Sign-in | `5cc4d0a` | 保留 | 需真实 Auth 回归 | 事实/推断 |
| Tenant Account | `5cc4d0a` | 保留 | 需登录回归 | 事实/推断 |
| Agent Inventory | `5cc4d0a` | 保留 Admin/Account 入口 | 角色授权需 Preview | 事实/推断 |
| Property Console | `5cc4d0a` | 保留 | 角色授权需 Preview | 事实/推断 |
| Admin | `5cc4d0a` | 保留完整路由 | 旧基线警告未扩大 | 事实 |
| Rental Case | `5cc4d0a` / `2117e38` | 保留页面、详情和 API | 需真实 RLS 回归 | 事实/推断 |
| 收藏/比较/咨询 | `5cc4d0a` | 保留 | bounds 换页时比较项仅显示当前结果 | 事实 |
| 筛选器 | `5cc4d0a` | 传入 bounds API | API 当前每类采用首个 price/bed/bath 值，复杂多选需 Preview | 事实 |
| SEO/metadata/landing | `5cc4d0a` | 保留 Privacy/Terms/Sitemap | 无 | 事实 |
| API routes | `5cc4d0a` + 快速版 | 原路由全保留，新增 `/api/v1/buildings` | 无删除 | 事实 |
| Supabase server client | 快速版 | 独立 `viewport-buildings` 模块 | 不进入浏览器 import graph | 事实 |
| RLS 调用 | `5cc4d0a` | 原租户调用保留 | service role 仅 API server 使用 | 事实 |
| 图片加载 | 性能 worktree | Street View 480×310，前 2 张自动请求 | 普通图片仍有基线 lint warning | 事实 |
| 学校/地铁/Street View | `5cc4d0a` | 详情内容保留，Street View 延迟 | 实图需 Preview | 事实/推断 |
| 站点保护 | `5cc4d0a` | proxy + server route 保留 | 不修改凭据 | 事实 |
| 安全响应头 | 快速版 | nosniff、Referrer、Permissions、COOP | 无 | 事实 |
| 分页与 bounds | 快速版改进 | 当前视口服务端查询，60 条响应，12 条渐进渲染 | zoom-out 通过 total 表达更多结果 | 事实 |
| 响应式 | `5cc4d0a` | 移动端默认 List，Map 按需加载 | 需设备 Preview | 事实/推断 |

## 300 条风险结论

错误版“固定前 300 条后浏览器内筛选”会导致 LIC、Downtown Brooklyn、Upper West Side 等区域误判为空。集成版不再以全局 300 条样本作为地图真相：地图 `idle` 事件提交 north/south/east/west，API 在 Supabase 查询中应用经纬度条件、筛选和稳定排序；客户端 300ms 防抖、取消旧请求并用序列号拒绝过期响应。Marker 与清单使用同一响应。

当前 API 对单次响应限制 60 条，服务端为了“有库存优先”会在当前 bounds 内分批读取候选后排序；不会一次把全部约 1,600 条完整记录发送给浏览器。后续可用 SQL RPC 优化服务端排序，但本轮不需要且未执行 migration。
