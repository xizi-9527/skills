---
name: creator-search
description: |
  ROUTER PRIORITY: Use this creator-search skill before any web/browser search when the user
  wants to find/filter/rank creators/KOLs/influencers by **quantifiable, sortable, paginated
  structured conditions** (platform, country/region, follower/engagement/views ranges, GMV/GPM,
  audience gender/country/language/age, verified, email/contact), or wants creators who
  **collaborated with a brand**, or wants to **collect recent brand mentions**. Natural language
  examples that MUST trigger: "列美国TikTok粉丝10万以上的达人并按均播排序", "筛德国有邮箱的手机配件达人",
  "看他们的受众画像（国家/性别/年龄）", "找和某品牌合作过的达人", "采集最近提到某品牌的达人".
  Do NOT use this skill when the user describes the creators in free-form natural language
  (content direction / persona / style / scenario / product fit) and wants Scout to parse the
  intent — route those to creator-nl-search. Do NOT use this skill when the primary intent is to
  find creators similar to a specific seed creator ("找和 @X 相似的达人") — route those to
  creator-lookalike.
  Use Scout OpenAPI through scripts/list_creators.mjs (structured per-platform list),
  scripts/find_brand_collaboration_creators.mjs (brand collaboration creators), and the realtime
  mention scripts (submit/poll/status/results) as the authoritative source. Do not use web search
  as a fallback unless the user explicitly asks for public web search or confirms fallback after
  OpenAPI has no result.
  Use when: structured creator list, per-platform filtering, 结构化筛选, 达人列表, 按国家找达人,
  按粉丝量找达人, 按邮箱找达人, 按互动率找达人, 按受众画像找达人, 带货/GMV 筛达人, 品牌合作达人,
  合作过的达人, 实时品牌提及采集, structured filters, brand collaboration creators,
  realtime brand mentions.
  电商/带货意图触发词：带货达人, 卖货达人, 带货博主, 带货, 卖产品, 卖XX的达人, 品类达人,
  某类目达人, 某品类达人, 商品达人, 选品达人。
  区域口语化触发词：美区达人, 美国达人, 英国达人, UK达人, 东南亚达人, 欧洲达人, 日本达人, 韩国达人,
  中东达人, 拉美达人, 台湾达人, 港澳达人, 北美达人, 本地达人, 海外达人。
  偏好/筛选口语化触发词：最好有邮箱, 要邮箱, 有联系方式, 粉丝多的, 互动高的, 有受众画像的, 高人气的,
  头部达人, 腰部达人, 素人达人。
compatibility: Node.js 20.6+
metadata:
  layer: discovery
  parent: influx-ai
---

# Creator Search（结构化列表 / 品牌合作 / 实时提及）

## 概述

通过 Scout OpenAPI 查找达人，本 Skill 覆盖三条**非自然语言**链路：

1. **结构化列表**：把可量化条件（国家、粉丝数、互动率、带货 GMV、受众画像等）直接下发给 Scout 原生列表服务，支持 TikTok、Instagram、YouTube、Twitter，可排序、可翻页。
2. **品牌合作达人**：按品牌名查找已沉淀的公开合作/合拍关系及视频证据。
3. **实时品牌提及采集**：发起实时关键词采集，找近期提及的潜在候选（异步任务）。

相关但独立的链路（不在本 Skill）：
- **自然语言搜索**：见 [creator-nl-search](../creator-nl-search/SKILL.md)。用一句自然语言描述内容方向/人设/风格/场景/产品适配找达人（含 `seed_creators` 参考账号）。
- **相似达人（lookalike）**：见 [creator-lookalike](../creator-lookalike/SKILL.md)。以某个具体种子达人为主锚点找相似。

## 脚本引用

| 脚本 | 相对路径 | 链路 | 状态 |
|------|----------|------|------|
| list_creators.mjs | `../../scripts/list_creators.mjs` | 结构化列表 `GET /openapi/v1/creators/{platform}/list` | ✅ 可用 |
| find_brand_collaboration_creators.mjs | `../../scripts/find_brand_collaboration_creators.mjs` | 品牌合作 `POST /openapi/v1/brand-discovery/collaboration-creators` | ✅ 可用（TikTok / Instagram） |
| submit_brand_realtime_mentions.mjs | `../../scripts/submit_brand_realtime_mentions.mjs` | 实时提及采集·提交 `POST /openapi/v1/brand-discovery/realtime-mentions` | 异步，见下 |
| poll_brand_realtime_mentions.mjs | `../../scripts/poll_brand_realtime_mentions.mjs` | 实时提及采集·自动轮询至完成（首选等待方式） | 异步，见下 |
| get_brand_realtime_mention_status.mjs | `../../scripts/get_brand_realtime_mention_status.mjs` | 实时提及采集·单次查状态 `POST .../realtime-mentions/status` | 异步，见下 |
| get_brand_realtime_mention_results.mjs | `../../scripts/get_brand_realtime_mention_results.mjs` | 实时提及采集·结果 `POST .../realtime-mentions/results` | 异步，见下 |

结构化列表调用格式：

```bash
node ../../scripts/list_creators.mjs '{"platform":"tiktok","country_code":"US","followers_cnt_gte":10000,"followers_cnt_lte":500000,"page":1,"size":20,"sort_field":"followers_cnt","sort_order":"desc"}'
```

> 用户用自然语言描述内容方向/人设/风格来找达人时，不要在本 Skill 用 `keyword` 词面匹配硬凑，改用 [creator-nl-search](../creator-nl-search/SKILL.md)。

## 竞品品牌找达人

当用户要找“某个竞品/品牌合作过的达人”“Fenty Beauty 合作达人”“某品牌种草达人”时，优先使用品牌合作链路，不要先走公开网页搜索。

```bash
node ../../scripts/find_brand_collaboration_creators.mjs '{"brand_name":"fentybeauty","platforms":["instagram"],"limit":20,"evidence_per_creator":2}'
```

- 返回的是达人与品牌的**公开合作/合拍关系及视频证据**，`data.recall_type` 为 `offline_collaboration`。这些公开关系**不等于本平台已确认的付费合作**，展示时据实说明是“公开合作/合拍证据”。
- 当前契约支持 TikTok 和 Instagram，两个平台均可正常检索（TikTok 早前因 Scout 原生仓储的 GROUP BY 问题被阻断，现已修复）。
- `data.items[].creator` 是合作达人，`data.items[].brand_account` 是匹配到的品牌账号，`data.items[].evidence_videos` 是合作证据视频。
- `collaboration_count > 0` 是合作达人命中依据；`evidence_videos` 只是解释字段。若 `evidence_available=false`，仍可展示该合作达人，但要说明当前未取到可展示的视频证据。
- 多平台查询**可能整体失败，不提供部分成功**；若其中一个平台出错，整个请求可能失败，遇到失败时据实告知。
- 离线查询没有结果时，停止并说明“当前未找到已沉淀的品牌合作记录”，再询问是否启动实时品牌提及采集（见下），不要静默切换到网页搜索或普通达人搜索。

### 实时品牌提及采集（异步，离线合作的补充）

品牌合作（上）查的是**已沉淀的公开合作关系**；当用户要找**近期提及、潜在种草候选**，或离线合作无结果后确认继续时，可用实时品牌提及采集。这是**异步任务**：提交 → 轮询状态 → 完成后取结果。

1）提交采集任务（`brand_name` 或 `keywords` 二选一；平台 tiktok/instagram/youtube）：

```bash
node ../../scripts/submit_brand_realtime_mentions.mjs '{"platform":"tiktok","brand_name":"fentybeauty"}'
# 或用关键词（1~10 个）：
node ../../scripts/submit_brand_realtime_mentions.mjs '{"platform":"instagram","keywords":["fentybeauty","fenty beauty"]}'
```

成功后从 `data.task_id` 取任务 ID（32 位十六进制）。

- **用户提到“最近/近期/最近 N 天/某时间段”时，必须在提交时传 `start_time`/`end_time`（秒级 unix 时间戳，`start_time ≤ end_time`）从源头限定采集窗口**，不要只提交品牌名后再在结果端补救。例如“最近 30 天”= `start_time` 取当前时间往前 30 天、`end_time` 取当前时间。采集窗口由提交参数决定；不传时间就不要声称结果只含近期内容。
- 兜底：若未限定时间、或 `completed` 后结果里视频 `published_at` 跨度仍大（实时采集可能混入窗口外的旧视频），可在结果端按 `videos[].published_at` 过滤到目标区间，并**明确说明筛了哪个时间段**。采集窗口外的旧视频提及不等于“近期提及”。

2）等待任务完成——**首选自动轮询脚本**（内置循环等待，用户无需反复追问）：

```bash
node ../../scripts/poll_brand_realtime_mentions.mjs '{"task_id":"<上一步的 task_id>"}'
# 可调间隔与次数：{"task_id":"...","interval":30,"max_attempts":60}
```

- `poll_brand_realtime_mentions.mjs` 每 `interval` 秒（默认 60）查一次，直到 `completed` / `failed` 或达到 `max_attempts`（默认 45 次）才返回。轮询进度打到 stderr，最终状态 JSON 打到 stdout。
- `completed` 退出码 0、`failed` 退出码 1；达到最大次数仍未完成则返回超时错误（stdout 带 `data.status:"processing"` 与 task_id），此时**把 task_id 交回用户/稍后再轮询**，不要卡死或谎称已完成。
- 以 `data.status` 为准：**即使 `progress` 显示 100%，只要 `status` 仍是 `processing` 就继续等待**（poll 脚本已按此逻辑处理）。
- 只需单次查当前状态（不等待）时，用 `get_brand_realtime_mention_status.mjs '{"task_id":"..."}'`。
- 新提交的任务可能数分钟才完成；用 poll 自动等待即可，不要让用户反复手动查。

3）任务 `completed` 后取结果（按达人分页，每人带视频明细）：

```bash
node ../../scripts/get_brand_realtime_mention_results.mjs '{"task_id":"<task_id>","page":1,"size":20}'
```

- `data.items` 按达人分页，每位达人含 `videos`（关键词、视频链接、播放/点赞/评论、hashtags 等）；`data.total` 是**达人总数**（用于翻页）。
- 口径区分：实时采集结果是**品牌提及/潜在候选达人**，**不等同于品牌合作（离线）里已沉淀确认的合作记录**；展示时说明这是实时关键词采集的候选，需进一步核实。
- **task_id 仅 7 天有效**（Scout 侧 Redis 暂存），过期后无法再查状态或结果；需要时重新提交采集任务。
- 未知任务返回 404、参数错误返回 422。

## 搜索前 Brief 规则

每次搜索必须先确认需求是否足够执行。最小 brief 包含：平台、目标市场/国家地区、品类/行业/关键词或内容方向、需要数量。缺少平台或关键业务条件时，先澄清，再搜索。

1. 用户未指定平台时，必须先问平台。结构化列表支持 TikTok / Instagram / YouTube / Twitter（一次只查单一平台）；品牌合作支持 TikTok / Instagram；实时提及支持 TikTok / Instagram / YouTube。不要默认选一个平台替用户决定。
2. 用户未指定目标市场/地区时，必须先问目标地区；“东南亚”“欧美”“美国”等明确范围可以直接使用。
3. 用户未指定品类、行业、关键词、产品、品牌或内容方向时，必须先问业务方向。
4. 用户未指定数量时，结构化列表默认 `size=50`、品牌合作默认 `limit=50`。用户表达“合作名单/建联名单/批量达人”时，优先追问数量。
5. 用户已给出平台、地区、品类和数量时，不要继续追问内部参数，直接按当前条件严格搜索。
6. 澄清问题必须短，一次最多 3 个，只问当前真正缺失的信息。

不要用“基于规则”“参数如下”“召回类型”等内部表达作为过程内容。内部规则只用于指导执行，不展示给用户。

## 搜索方式选择

每次用户请求只选择一条链路，不要同时调用多个脚本。按用户意图选择：

1. 用户给出**明确可量化的条件**（国家代码、粉丝数区间、互动率区间、带货 GMV/GPM、受众国家/语言/年龄、是否认证），且希望结果**可预测、可排序、可翻页**时，调用 `list_creators.mjs`（结构化列表）。按条件精确过滤，同样条件返回同样结果，适合“筛选型”需求。
2. 用户要找**和某品牌合作过的达人**时，调用 `find_brand_collaboration_creators.mjs`（品牌合作）；要找**近期提及的潜在候选**时，走实时品牌提及采集。
3. 用户用**内容方向、人设、风格、场景、产品适配**等开放描述表达需求（“描述型”）时，**不在本 Skill 处理**，转 [creator-nl-search](../creator-nl-search/SKILL.md)（自然语言搜索）。不要用结构化列表的 `keyword` 词面匹配硬凑语义需求。
4. 用户主意图是“找和某个具体达人相似”时，转 [creator-lookalike](../creator-lookalike/SKILL.md)。
5. 用户未指定平台时，先按「搜索前 Brief 规则」澄清平台，不得依赖默认平台直接搜索。
6. 结构化列表一次只能查**单一平台**。多平台结构化需求须拆成多次请求，并在调用下一个平台前告知用户。

### 结构化列表协议

- Endpoint：`GET /openapi/v1/creators/{platform}/list`，`platform` 为 `tiktok` / `instagram` / `youtube` / `twitter`。
- 脚本接受一个 JSON 对象，`platform` 决定目标平台，其余字段作为 query 参数拼接。
- 按结构化条件**精确过滤**，不解析自然语言，相同条件返回相同结果，可稳定翻页。
- `page` 默认 1、范围 1~500；`size` 默认 50、范围 1~100。
- 四平台列表使用 `creator:search`；后端分别检查 Key、scope、服务端策略和用户 `Scout Discover` 权限，不需要 `billing:read`、JWT、用户 ID 或额外 scope 请求头。
- 四平台列表执行前按 `size` 检查最高可能用量，实际按当前响应 `items` 数登记。不能按匹配总数 `total` 或请求 `size` 计算费用，Skill 不计算价格或执行扣费。此计费口径不套用于本子 Skill 的品牌合作或实时提及。
- **`data.total`、`data.pages` 与 `meta.total` 只有当本次查询激活了 2 个以上原生筛选条件时才返回具体数值，否则为 `null`**。`null` 不代表没有结果，只代表未计算精确总数；是否有下一页按 `data.items` 是否填满 `size` 判断，或增加筛选条件以获得精确总数。不要把 `null` 解释成 0 条或全部。
- **`service_level`（S1/S2/S3，默认 S2）在结构化列表里真实影响返回字段**：等级越高返回字段越多（S1 基础身份/联系方式存在性；S2 增加联系方式、地区、性别、语言、表现指标、简介、类目、近期视频；S3 增加受众性别/国家/语言/年龄分布）。不要假定各等级返回字段相同；只按本次实际返回的字段展示，未返回字段保持 null。详见下方「服务等级与 lang」。
- **结构化列表 `data.items` 的数值和布尔值是字符串**（如 `followers_count: "12000"`、`has_email: "true"`；受众分布字典里的数值也是字符串）。`null`、列表、字典结构保留原类型。**需要数值比较、排序判断或计算时，先自行 `Number(...)` 解析**；展示时按人类可读格式呈现。`data.page/size/total/pages` 与 meta 的分页数值仍是数字。

### 品牌合作协议

- Endpoint：`POST /openapi/v1/brand-discovery/collaboration-creators`。
- `brand_name` 必填（1~200 字符）；`platforms` 默认 `[tiktok, instagram]`，两个平台均可用。
- 品牌名用于匹配品牌账号；品牌名越精确（官方账号名/handle）命中越准。匹配到的品牌账号见 `data.brand_candidates`，展示前可核对是否为用户想要的品牌。
- `country_codes`、`followers_cnt_gte/_lte`、`has_email`、`engagement_rate_gte`、`industry_keywords` 是对合作达人结果的**收敛过滤**：条件越严，返回越少，甚至可能把某品牌的合作达人过滤到 0。若用户加了收敛条件后结果偏少，可提示放宽这些条件，而不是换品牌。`country_codes` 用 ISO 国家代码数组，代码对照见 [references/country-codes.md](../../references/country-codes.md)。
- `limit` 默认 50、范围 1~100。`meta.total` 是本次返回的合作达人数，不代表全部匹配的合作者数量。

## 参数提取强制规则

1. 结构化列表：平台写入单数 `platform`（可取值含 `twitter`）；品牌合作：平台写入 `platforms` 数组（`tiktok`/`instagram`）。
2. boolean 参数传 JSON boolean `true` / `false`，不要传 `"true"` / `1`。
3. 国家、语言多选使用逗号分隔的代码字符串（结构化列表，如 `country_code: "US,CA"`）；品牌合作的国家用 `country_codes` 数组。
4. 日期统一传 `YYYY-MM-DD`。
5. 只传目标平台支持的字段。四平台的播放量、互动率、受众语言等字段名并不完全相同（见下方各平台参数）。
6. **GMV/GPM 等带货区间字段仅是筛选条件**：结构化列表的 TikTok 支持 `last30day_gmv_gte/_lte`、`last30day_gpm_gte/_lte` 等用于按范围筛选达人；但响应只回 `last30day_gmv_dollar_show` 等展示字段，不保证回具体数值。展示结果时禁止编造 GMV/GPM/客单价/佣金率数值。
7. 用户提出当前字段无法表达的条件时，说明无法按该条件执行，不静默丢弃、不本地补算。
8. 用户用语义/内容方向描述（而非可量化字段）时，不要用 `keyword` 词面匹配硬凑，转 [creator-nl-search](../creator-nl-search/SKILL.md)。

## 搜索执行边界

为避免静默查询，达人搜索必须遵守以下边界：

1. 用户给出的平台和全部筛选条件必须进入同一次请求。禁止先只传少量条件拿候选、再本地过滤。
2. 默认只调用一次脚本；结构化列表只查当前 `page`，不自动翻页。
3. 用户未指定平台时，先澄清平台，不得自动选择或并行搜多个平台来凑结果。
4. 严格条件返回 0 条或不足时，不再发起任何补充搜索；直接说明命中情况，并询问是否放宽条件（降低互动率、扩大地区、换平台、换链路）。
5. 结构化列表结果数量少于用户要求时，只展示实际命中；继续翻页须先让用户确认。
6. 结构化列表返回与用户条件明显不一致时，不展示不合格结果凑数；停止并说明可能是字段口径或传参问题。
7. 接口无结果或不可用时，不未经用户同意改用公开网页搜索。

## 服务等级与 lang

Scout 的检索链路都接受 `service_level`（S1/S2/S3，默认 S2）和 `lang`（cn/en），但**各链路实际作用不同**：

| 链路 | service_level | lang |
|------|---------------|------|
| 结构化列表 | **真实裁剪返回字段**（等级越高字段越多，见下表） | 翻译性别/年龄字段（国家/语言/类目字典当前为空，保留原始码值）；默认 en |
| 品牌合作 | 仅校验并写入 meta，**不触发字段投影** | 仅写入 meta，**不触发翻译** |

> 自然语言搜索/相似达人的 service_level/lang 行为见各自 Skill。

结构化列表的服务等级字段范围：

| 等级 | 返回范围（具体列因平台而异） |
|------|------|
| S1 | 账号身份、粉丝等基础数据、联系方式可用标识 |
| S2（默认） | S1 + 实际联系方式、地区、性别、语言、表现指标、简介、类目、近期视频 |
| S3 | S2 + 受众性别、国家、语言、年龄分布 |

使用口径：
- `service_level` 是**返回字段配置**，不代表任务优先级、检索质量或权限；不能据此推算积分价格，价格与扣费由后端 Billing 负责。
- 用户没有要求受众画像（性别/国家/语言/年龄分布）时，不要为“可能更准”主动升到 S3；默认 S2 即可。需要受众画像时用 S3。
- 非法等级（非 S1/S2/S3）返回 `40001`；脚本已在本地先行校验。
- **不要把 service_level 理解为会改变搜索算法、也不要承诺 lang 能把所有字段翻成中文**：lang 当前只实际翻译结构化列表的性别/年龄，其余字段保留原始码值。

## 通用请求参数

### 结构化列表（list_creators.mjs）通用筛选字段

`platform` 为路由字段，其余作为 query 参数。区间字段以 `_gte`（下限）/ `_lte`（上限）成对出现；多选字段用逗号分隔的字符串。以下字段四个平台通用（除另有说明）。

| 参数 | 类型 | 说明 |
|------|------|------|
| `platform` | string | 必填：`tiktok` / `instagram` / `youtube` / `twitter` |
| `keyword` | string | 话题/内容关键词匹配，逗号分隔多词按任一命中 |
| `username_keywords` | string | 按用户名/昵称检索，逗号分隔多关键词 |
| `must_hashtags` | string | 强话题标签，逗号分隔，全部需命中 |
| `country_code` | string | 国家代码，多选逗号分隔，如 `CA,MX,US` |
| `gender` | string | 性别 |
| `has_email` | boolean | 是否有邮箱 |
| `has_whatsapp` | boolean | 是否有 WhatsApp |
| `industry` | string | 行业三级类目，逗号分隔 |
| `language_code` | string | 语言代码，多选逗号分隔，不区分大小写 |
| `followers_cnt_gte` / `_lte` | integer | 粉丝数区间 |
| `last10_avg_video_views_cnt_gte` / `_lte` | number | 近 10 条视频平均播放量区间 |
| `last10_avg_video_interaction_rate_gte` / `_lte` | number | 近 10 条视频平均互动率区间 |
| `last_video_publish_date_gte` / `_lte` | string | 最近视频发布日期区间（YYYY-MM-DD） |
| `audience_country_code_list` | string | 受众国家，多选逗号分隔 |
| `audience_female_rate_gte` / `_lte` | number | 受众女性占比区间 |
| `audience_age_list` | string | 受众年龄区间，多选逗号分隔 |
| `is_verified` | string | 是否认证：`1`=已认证，`0`=未认证 |
| `last10_video_views_per_sub_gte` / `_lte` | number | 均播/粉丝比区间（百分比） |
| `last10_med_video_views_per_sub_gte` / `_lte` | number | 中位播放/粉丝比区间（百分比） |
| `kol_visibility_main` / `ethnicity_main` / `is_real_person` | string / bool | 出镜方式 / 人种 / 是否真人出镜 |
| `page` | integer | 页码，默认 1，范围 1~500 |
| `size` | integer | 每页数量，默认 50，范围 1~100 |
| `sort_field` | string | 排序字段，默认 `followers_cnt` |
| `sort_order` | string | `asc` / `desc`，默认 `desc` |
| `service_level` | string | `S1` / `S2` / `S3`，默认 `S2`；**真实裁剪返回字段**（见「服务等级与 lang」） |
| `lang` | string | `cn` / `en`，默认 `en`；翻译性别/年龄，其余保留码值 |

各平台常用 `sort_field`：`followers_cnt`、`last10_avg_video_views_cnt`、`last10_avg_video_interaction_rate`；YouTube 额外支持 `kol_video_cnt`、`kol_video_views_cnt` 及 `*_short`/`*_long` 变体。

> 代码对照：`country_code` / `audience_country_code_list` 的国家代码（及"东南亚/欧洲"等区域展开）见 [references/country-codes.md](../../references/country-codes.md)；`language_code` / 受众语言字段的语言代码见 [references/language-codes.md](../../references/language-codes.md)；本表字段速查另见 [references/platform-params.md](../../references/platform-params.md)。用户说中文国家/语言名时先映射到代码再传。

`keyword` / `username_keywords` / `must_hashtags` 是**词面匹配**，不是语义理解：传“美妆”只匹配含该词的内容/话题/用户名，不会自动扩展到“护肤”“彩妆”等近义词。需要按语义或内容方向找达人时，改用自然语言搜索（[creator-nl-search](../creator-nl-search/SKILL.md)）。`sort_field` 只接受上述受支持字段，传入不支持的字段会回落到默认排序。

### 品牌合作（find_brand_collaboration_creators.mjs）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `brand_name` | string | 是 | 品牌名，1~200 字符 |
| `platforms` | string[] | 否 | `tiktok` / `instagram`，默认两者 |
| `brand_candidate_limit` | integer | 否 | 每平台解析的品牌账号候选上限，默认 3，范围 1~10 |
| `limit` | integer | 否 | 返回合作达人总数上限，默认 50，范围 1~100 |
| `evidence_per_creator` | integer | 否 | 每个达人附带的证据视频数，默认 2，范围 0~5 |
| `country_codes` | string[] | 否 | 按国家代码收敛合作达人 |
| `followers_cnt_gte` / `_lte` | integer | 否 | 合作达人粉丝数区间，非负 |
| `engagement_rate_gte` | number | 否 | 合作达人互动率下限，非负 |
| `has_email` | boolean | 否 | 是否要求有邮箱 |
| `industry_keywords` | string[] | 否 | 行业关键词收敛，最多 20 个 |
| `service_level` | string | 否 | `S1`/`S2`/`S3`，默认 S2；仅写入 meta，**不触发字段投影** |
| `lang` | string | 否 | `cn`/`en`，默认 en；仅写入 meta，**不触发翻译** |

### 实时品牌提及采集（submit / poll / status / results）

| 脚本 / 参数 | 说明 |
|------|------|
| submit · `platform` | 必填，`tiktok` / `instagram` / `youtube` |
| submit · `brand_name` / `keywords` | 二选一；`keywords` 为 1~10 个字符串 |
| submit · `start_time` / `end_time` | 秒级时间戳，`start_time ≤ end_time`；**用户要“近期/最近 N 天/某时间段”时必传**，从源头限定采集窗口 |
| poll / status / results · `task_id` | 32 位十六进制，7 天内有效 |
| poll · `interval` / `max_attempts` | 轮询间隔秒数（默认 60）/ 最大次数（默认 45） |
| results · `page` / `size` | 默认 page 1、size 20（1~100） |

## 结构化列表平台特有字段

### TikTok

| 字段 | 类型 | 说明 |
|------|------|------|
| `has_mcn` / `has_line` / `has_zalo` | boolean | 是否绑定 MCN / Line / Zalo |
| `product_category_id_array` | string | 带货类目 ID，逗号分隔 |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |
| `last30day_gmv_gte` / `_lte` | number | 近 30 天带货 GMV 区间（仅筛选，不返回数值） |
| `last30day_gpm_gte` / `_lte` | number | 近 30 天 GPM 区间（仅筛选） |
| `last30day_gmv_per_buyer_gte` / `_lte` | number | 近 30 天客单价区间（仅筛选） |
| `last30day_commission_rate_gte` / `_lte` | number | 近 30 天佣金率区间（仅筛选） |

### Instagram

| 字段 | 类型 | 说明 |
|------|------|------|
| `is_top_creator` | boolean | 是否 Amazon 头部带货达人 |
| `is_ai_creator` | boolean | 是否 AI 达人 |
| `audience_language_list` | string | 受众语言，多选逗号分隔 |
| `last10_avg_video_likes_cnt_gte` / `_lte` | number | 近 10 条视频平均点赞数区间 |
| `last_video_views_cnt_gte` / `_lte` | integer | 最近 1 条视频观看数区间 |
| `kol_style_list` | string | 达人风格标签，多选逗号分隔 |

### YouTube

| 字段 | 类型 | 说明 |
|------|------|------|
| `is_ai_creator` | boolean | 是否 AI 达人 |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |
| `last10_avg_video_views_cnt_short_gte` / `_lte` | number | 近 10 条短视频平均播放量区间 |
| `last10_avg_video_interaction_rate_short_gte` / `_lte` | number | 近 10 条短视频平均互动率区间 |
| `last10_video_views_per_sub_short_gte` / `_lte` | number | 短视频均播/粉丝比区间 |
| `last10_med_video_views_per_sub_short_gte` / `_lte` | number | 短视频中位播放/粉丝比区间 |

### Twitter

| 字段 | 类型 | 说明 |
|------|------|------|
| `has_mcn` | boolean | 是否绑定 MCN |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |

## Category Input（industry 参数说明）

结构化列表的 `industry` 字段用于按行业类目筛选，多选逗号分隔。用户说中文/英文类目名时，先映射到类目名再传。详见 [references/industry-categories.md](../../references/industry-categories.md)。

> 注意：Scout 的 `industry` 具体接受“类目名称”还是“数字 ID”、以及 ID 体系，未在 influx-ai 侧核对；不确定时先用类目名或少量值试调，根据返回判断是否生效，不要照搬来源项目的三级数字 ID。行业搜索结果为空时，不要自动用同义词降级为 `keyword` 重搜；应停止并告知“当前严格行业筛选无结果”，提供 2-3 个可选放宽方向，等用户确认后再搜。

## 示例

结构化列表：

```json
{"platform":"tiktok","country_code":"US","followers_cnt_gte":100000,"service_level":"S3","size":10,"sort_field":"last10_avg_video_views_cnt","sort_order":"desc"}
```

品牌合作：

```json
{"brand_name":"fentybeauty","platforms":["instagram"],"limit":20,"evidence_per_creator":2}
```

## 输出格式

### 响应结构（各链路 data 形态）

脚本原样输出 Scout 的 `success / data / error / meta` 包装。`success: true` 只表示调用完成，业务结果看 `data`。

**结构化列表计费回执**：保留 `meta.billing_operation_id`（独立计费操作号，不是 `request_id`）、`billable_units`（当前响应实际交付项数）。`pending_settlement` 表示业务结果已交付、积分待结算；`credits_consumed=null` 不是 0。待结算时 `credits_remaining` 是准入余额，`-1` 表示未提供；`recording_failed` 是用量登记失败需核对，不代表列表查询失败。`pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。空 `items` 如实说明，不自动翻页。

四平台列表 `401` 检查 Key；`402/40201` 且 `insufficient_credits` 提示积分不足；`403` 检查 scope、服务端策略、用户权限或资源归属；`429` 仅按有效 `Retry-After` 提示等待，不编造时间、不换 Key；`503` 提示服务或依赖不可用，不认定 Key 无效。详见 [错误码参考](../../references/error-codes.md)。

**结构化列表**：达人列表位于 `data.items`，含 `page`/`size`/`total`/`pages`。每个达人含 `uid`、`username`、`nickname`、`avatar_url`、`profile_url`（YouTube 为 `channel_url`）、`country_code`、`followers_count`、`avg_views`、`engagement_rate`、`video_count`、`has_email`、`industry_categories`、`hashtags`、`recent_videos` 等，以及各平台特有字段。返回字段随 `service_level` 不同（S1<S2<S3），只按实际返回展示。`total`/`pages`/`meta.total` 为 `null` 时不要宣称总匹配数。
**注意：结构化列表 item 的数值/布尔值是字符串**（`followers_count:"12000"`、`has_email:"true"`、受众分布字典内数值也是字符串；null/列表/字典保留原类型）。排序判断、粉丝星级分档、互动率 ×100 等任何数值比较/计算前，先 `Number(...)` 解析；分页字段（page/size/total/pages）仍是数字。

**品牌合作 / 实时采集**：品牌合作 `data` 含 `brand_name`、`recall_type`、`brand_candidates`（按平台列品牌账号候选，含 `candidate_score`）、`items`（每项 `platform`、`brand_account`、`creator`、`collaboration_count`、`evidence_count`、`evidence_available`、`evidence_videos`、`source`）。实时采集结果 `data.items` 按达人分页、每人带 `videos`，`data.total` 是达人总数。

只用接口实际返回的字段展示，不编造。

### 表格设计原则（展示层优化）

达人名单表格必须遵循以下原则，提升可读性与交互效率：

**Markdown 表格安全清洗（防止展示错位）**：
- 输出任何 Markdown 表格前，必须先清洗所有单元格文本，尤其是昵称、bio、标签、行业、内容方向、受众国家/语言等开放文本字段。
- 单元格内禁止出现原始竖线 `|`，也不要用 `\|` 转义；统一替换为 `／` 或 `/`。例如 `Gabe | Tech & Lifestyle` 展示为 `Gabe／Tech & Lifestyle`。
- 单元格内禁止出现换行、`\r`、`\n`、`<br>`；统一压成一个空格。
- 单元格内不要放会破坏表格结构的 Markdown 片段；长 URL 不进表格，链接只放在达人名或单独短入口里。
- 每一行的列数必须和表头完全一致；输出前检查每行 `|` 分隔数量一致。多个值用 `、` 或 `/` 连接，不要用 `|`。

1. **动态展示返回字段，不要固定表头**：表格列必须基于本次接口实际返回字段动态生成，必须覆盖所有可读字段。禁止只展示固定的少数列（如粉丝数、平均播放、互动率、国家、粉丝层级、认证、邮箱、带货），也禁止因为表格变宽就省略受众画像字段。

   **固定语义列只保留这些：**
   - `#`：序号
   - `头像`：由 `avatar_url` 渲染
   - `用户名`：由 `username` 渲染为主页链接
   - `昵称` / `频道名`：由 `nickname` 渲染为主页链接

   **其余列必须按实际返回字段展开**：
   - 字段在接口响应里存在且至少一条结果有有效值，就展示为独立列
   - 字段在所有结果中都为空、`null`、空数组或空字符串时，可以省略该列
   - Boolean 字段不要只放空白图标；展示为 `是/否` 或带文字的 `✅ 是`、`—`
   - `avatar_url` 已通过头像承载，无需重复放原始 URL
   - `uid` 属于可追踪字段，如果返回必须展示，或至少在每行详情中展示，便于后续采集、建联、排障

   **受众画像字段强制覆盖**：以下字段**只要本次响应返回就必须展示**，不得因表宽省略。这些 `audience_*` 字段由**结构化列表**（`list_creators.mjs`，通常 `service_level` S2/S3）返回；实时采集/品牌合作结果里没有则不展示、不编造。字段清单：
   - 受众女性比例：`audience_female_rate`
   - 受众国家分布：`audience_country_code_list`
   - 受众语言分布：TikTok/Instagram 用 `audience_language_code_list`，YouTube 用 `audience_language_list`
   - 受众年龄分布：TikTok/Instagram 用 `audience_age_id_list`，YouTube 用 `audience_age_list`
   - 核心指标也必须保留：粉丝/订阅数、视频/帖子数、平均播放、互动率、播放粉丝比、中位播放、行业、hashtags、bio、email/WhatsApp/Line/Zalo/MCN 等实际返回字段

   响应中出现任何 `audience_*` 字段时，必须默认输出**一张动态宽表**：
   - 同一张表内同时展示头像、用户名、昵称/频道名、uid、粉丝/订阅、视频数、点赞/总观看、均播、互动率、播放粉丝比、中位播放、国家、语言、性别、认证、联系方式、带货/类目、bio/hashtags，以及受众女性比例、受众国家、受众语言、受众年龄等受众字段。
   - 表格可以横向滚动，列名可以适当压缩，但不得因此省略实际返回且有值的字段。
   - 如果某个字段在所有结果里都是空、`null`、空数组或空字符串，可以省略该列；但不得把“字段过多”作为省略原因。

2. **达人属性列只在有真实字段时展示**：不要输出单个「状态」列；如需摘要属性，可拆成「粉丝层级」「认证」「邮箱」「带货」等独立列，但这些列必须满足“字段存在且至少一条结果有有效值”才出现。图标后必须带文字说明：

   **粉丝星级**（按粉丝量绝对值分 5 档，粉丝越多星越多）：
   - ⭐⭐⭐⭐⭐ 超头部（粉丝 > 200 万）
   - ⭐⭐⭐⭐ 头部（粉丝 50 万 - 200 万）
   - ⭐⭐⭐ 腰部（粉丝 10 万 - 50 万）
   - ⭐⭐ 初级（粉丝 1 万 - 10 万）
   - ⭐ 素人/起步（粉丝 < 1 万）

   **属性列**（图标+文字组合，根据返回字段显示，缺失则留空，不要凭空补）：
   - ✅ 已认证（`is_verified=true`）
   - ✉ 有邮箱（`has_email=true` 或 `email` 非空）
   - 🛒 带货（`product_categories` 非空，或 `has_showcase=true`）
   - 🤖 AI 达人（`is_ai_creator=true`，平台返回该字段时）

   **列值格式**：
   - 粉丝层级列必须输出完整文字，例如 `⭐⭐⭐⭐⭐ 超头部`，不要只放星星
   - 认证列输出 `✅ 已认证`，邮箱列输出 `✉ 有邮箱`，带货列输出 `🛒 带货`，AI 列输出 `🤖 AI达人`
   - 字段缺失或全量为空的属性列不要输出整列；粉丝数为 0 或缺失时粉丝层级列留空或省略
   - **不要把 `AI` 作为固定末列**。只有平台支持并实际返回 `is_ai_creator=true` 等有效值时才展示 AI 列；TikTok 结果通常不返回 `is_ai_creator`，不得凭空加 AI 列
3. **用户名与昵称保持两列**：不合并，保留独立列。
4. **核心指标列保留**：平均播放（avg_views）、互动率（engagement_rate）、粉丝数必须展示，见「通用格式规则」。

### TikTok

- **头像列**：用固定方形外框承载头像，避免表格列压缩竖图。推荐格式：`<span style="display:inline-flex;width:40px;height:40px;overflow:hidden;border-radius:4px;vertical-align:middle;"><img src="{avatar_url}" width="40" height="40" style="width:40px;height:40px;max-width:40px;min-width:40px;object-fit:cover;object-position:center;display:block;"></span>`；`avatar_url` 缺失时该格留空，禁止放占位图或编造 URL。不要用 Markdown `![]()`，也不要只裸写 `<img src="{avatar_url}" width="36" height="36">`
- TikTok 动态列应覆盖实际返回的这些字段：`uid`、`followers_count`、`likes_count`、`video_count`、`has_showcase`、`has_email`、`has_mcn`、`has_line`、`has_zalo`、`last_video_publish_date`、`country_code`、`gender`、`avg_views`、`engagement_rate`、`views_per_follower`、`is_verified`、`last10_video_views_per_sub`、`last10_med_video_views_cnt`、`last10_med_video_views_per_sub`、`product_categories`、`industry_categories`、`bio`、`hashtags`、`language`、`email`、`link_whatsapp`、`link_line`、`link_zalo`、`mcn`、`audience_female_rate`、`audience_country_code_list`、`audience_language_code_list`、`audience_age_id_list`
- TikTok 不要固定输出 `AI` 列；除非响应里真实存在 AI 相关字段且有有效值

### YouTube

- **头像列**：同上固定方形外框格式；`avatar_url` 缺失时留空，禁止占位图或编造 URL。
- YouTube 动态列应覆盖实际返回的这些字段：`uid`、`has_email`、`has_whatsapp`、`last_video_publish_time`、`country_code`、`language`、`gender`、`bio`、`followers_count`、`video_count`、`view_count`、`avg_views`、`avg_views_short`、`avg_views_long`、`engagement_rate`、`engagement_rate_short`、`engagement_rate_long`、`is_verified`、`last10_video_views_per_sub`、`last10_video_views_per_sub_short`、`last10_video_views_per_sub_long`、`last10_med_video_views_cnt`、`last10_med_video_views_cnt_short`、`last10_med_video_views_cnt_long`、`last10_med_video_views_per_sub`、`last10_med_video_views_per_sub_short`、`last10_med_video_views_per_sub_long`、`industry_categories`、`hashtags`、`email`、`whatsapp`、`audience_female_rate`、`audience_country_code_list`、`audience_language_list`、`audience_age_list`
- YouTube 主页字段为 `channel_url`，非 `profile_url`。
- `is_ai_creator` 只在响应真实返回且有有效值时展示，不要固定输出空白 AI 列

### Instagram

- **头像列**：同上固定方形外框格式；`avatar_url` 缺失时留空，禁止占位图或编造 URL。
- Instagram 动态列应覆盖实际返回的这些字段：`uid`、`has_email`、`has_whatsapp`、`last_video_publish_time`、`country_code`、`language`、`gender`、`bio`、`followers_count`、`video_count`、`avg_views`、`engagement_rate`、`is_verified`、`last10_video_views_per_sub`、`last10_med_video_views_cnt`、`last10_med_video_views_per_sub`、`industry_categories`、`hashtags`、`email`、`link_whatsapp`、`audience_female_rate`、`audience_country_code_list`、`audience_language_code_list`、`audience_age_id_list`
- `is_ai_creator` / `is_top_creator` 只在响应真实返回且有有效值时展示，不要固定输出空白带货或 AI 列

### Fuzzy Industry Guidance

- High confidence terms can be searched directly. Examples: `skincare`, `skin care`, `funny`, `home cleaning`, `pet supplies`, `kids toys`, `phone accessories`.
- If the user gives a broad business phrase, map it to the closest supported category and briefly state the interpretation before searching. Example: "cleaning creators" -> `Home Cleaning`; "funny creators" -> `Comedy & Humor`.
- If the phrase is ambiguous, do not silently guess. Show 2-3 likely categories and ask the user to confirm. Examples: "toy" may mean `Children's Toys`, `Pet Toys`, `Model Toys`, or `Adult Art Toys`; "home" may mean `Home Cleaning`, `Home Decoration`, `Home Appliances`, or `Kitchen & Tableware`.

### 通用格式规则

- 仅展示实际返回的字段，不能假设结果包含其不具备的字段。
- **平台主页跳转必须保留**：`profile_url`（TikTok/Instagram）/ `channel_url`（YouTube）
  - 用户名、昵称列渲染为 `[名称][linkN]` 链接，指向该达人平台主页 URL，**不单独设置末列“主页链接”**
  - 表格下方统一定义各 `[linkN]` 对应的完整 URL
  - 增加受众画像字段时同样必须保留可点击链接，不可因此挤掉或省略
- `meta.total` / `data.total` 为 null 时不展示总匹配数
- 默认展示 5~10 条，超过时询问用户
- **头像列渲染规则**：`avatar_url` 全平台返回
  - 表格新增独立的「头像」首列（紧随序号 # 之后），用固定方形外框承载头像：`<span style="display:inline-flex;width:40px;height:40px;overflow:hidden;border-radius:4px;vertical-align:middle;"><img src="{avatar_url}" width="40" height="40" style="width:40px;height:40px;max-width:40px;min-width:40px;object-fit:cover;object-position:center;display:block;"></span>`（外框固定、图片居中裁切，避免表格列宽把竖图压窄）
  - 禁止裸写 `<img src="{avatar_url}" width="36" height="36">` 这类未设置 `object-fit` / 外层裁切框的格式
  - `avatar_url` 为空或缺失时，该格留空，**禁止编造头像 URL 或放占位图**

### 达人分析润色（AI 即兴生成 + 真实数据对照）

**[必须]** 展示搜索结果表格后，不要只丢出原始数据就结束。基于返回的数据，对头部达人（前 3-5 个）给出**简短的专业分析**，帮助用户快速理解匹配价值。

润色维度参考（根据返回字段灵活组织，不必逐条罗列）：

- **推荐理由**：粉丝量/播放量/互动率等核心指标为什么值得合作
- **受众匹配**：受众国家、性别、语言分布与目标市场的契合度
- **潜在风险**：如“可能是场景号/品牌号而非个人达人”、“粉丝偏娱乐向转化弱”等
- **合作建议**：适合的内容形式（开箱/测评/植入/种草）、是否适合寄样、是否适合挂车

示例（输入数据 → 润色输出）：

```
原始数据：
  rumah.cafe | 平均播放 52,686 | MY 受众 82.4% | 女性受众 62.94% | 主语言 en 90.2% | home cafe/coffee

润色输出：
  🏆 [rumah.cafe][link1] — 最强推荐
  真实数据：粉丝 320K | 平均播放 52,686 | 互动率 6.2% | MY 受众 82.4% | 女性受众 62.94% | 主语言 en 90.2%
  推荐理由：平均播放 52,686，远高于其他账号；MY 受众 82.4%，本地转化潜力强
  受众画像：女性受众 62.94%（适合女性向产品）；主语言 en 90.2%，适合英文沟通
  内容匹配：home cafe / coffee 场景，与咖啡杯/杯具产品高度契合
  ⚠️ 风险：像 home cafe 场景号，不一定是个人达人，合作方式建议：场景植入 / 咖啡杯种草 / home cafe setup
```

注意：
- 分析必须**基于真实返回数据**，禁止编造数字或字段
- 指标缺失时不要硬编分析（如没有受众字段就说“受众数据本次未返回”）
- 语气专业简洁，不要过度营销化

### 下一步建议（搜索后主动提示）

**[必须]** 搜索结果展示完毕 + 达人分析润色后，主动给出 1-3 条下一步建议。建联建议必须按下面的确定性规则生成，不要只凭语感选择：

#### 建联建议判定规则

1. **用户表达合作/联系意图时必须给建联建议**：只要用户请求里出现或语义包含“合作 / 建联 / 联系 / 邮箱 / 发邮件 / outreach / contact / email”等意图，下一步建议里必须包含建联相关建议。
2. **邮箱数量 ≥ 2 时必须给批量建联建议**：如果搜索结果中 `email` 非空或 `has_email=true` 的达人数量大于等于 2，必须建议“批量建联这些有邮箱达人”，并说明可以先确认产品信息后生成个性化邮件。
3. **只有 1 个有邮箱时给单独建联建议**：如果只有 1 个达人 `email` 非空或 `has_email=true`，不要说“批量建联”；建议“先单独建联这个达人”，同时可建议“继续筛一批有邮箱达人后再批量建联”。
4. **没有邮箱时不要说批量建联**：如果所有结果都没有 `email` 且 `has_email` 不为 true，不要建议批量建联；改为建议“继续筛有邮箱达人 / 基于优质账号找相似达人 lookalike / 按品牌找合作达人”。
5. **产品信息不足时也不要省略建联**：如果满足建联条件但产品信息不足，不要跳过建联建议；应提示“补充产品名称、卖点、寄样/佣金、目标合作形式后，可以生成建联话术或批量邮件”。
6. **建联建议优先级高于其他建议**：当用户明确要合作/联系，或结果中有邮箱达人时，建联建议必须排在找相似、继续搜索之前。

#### 可选建议池

- “我可以基于这批达人做**更详细的匹配和数据解释**，比如分析哪个达人的受众最契合你的产品”
- “可以**搜索相似达人**（lookalike），基于表现最好的账号扩大候选池”（见 [creator-lookalike](../creator-lookalike/SKILL.md)）
- “可以用 [creator-nl-search](../creator-nl-search/SKILL.md) 的**自然语言搜索**按内容方向/风格再找一批，或**按品牌找合作达人**”

不要机械罗列所有建议——先按“建联建议判定规则”决定是否必须给建联建议，再根据用户的使用场景补充 1-2 条最相关的找相似或进一步分析建议。

## 错误处理

脚本在 HTTP 错误、`success: false`、非 JSON 响应或缺少核心数据（`data.items`）时，将错误写入标准错误并以非零状态退出；`success: false` 时同时在标准输出保留完整响应。外层 `error.code` 约定为 `状态码*100+1`（如 HTTP 422 → `42201`，内部错误 → `50001`）。HTTP 422 表示参数校验失败，核对字段名、类型与平台适用性。详见 [references/error-codes.md](../../references/error-codes.md)。
