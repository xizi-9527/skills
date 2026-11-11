---
name: creator-lookalike
description: |
  根据 Scout 已收录的种子达人查找相似达人。用于用户的主要意图是基于某个具体达人查找相似、类似、
  同类型或 lookalike creators，例如"找和 @X 相似的达人"、"找几个像这个账号的 TikTok 达人"、
  "找与 @X 内容题材类似的达人"、"找像 @X 这样的美国美妆达人（要有邮箱）"。
  种子可以通过用户名、达人主页链接、Scout 达人标识提供，也可以由当前对话中已明确引用的达人确定
  （如"我刚才发的那个达人，再找几个类似的"）。国家、粉丝量、邮箱、内容方向等额外要求作为相似检索的
  收敛条件（hard_filters / query / additional_requirements），不因此改走 creator-search。
  如果用户已明确表达 lookalike / 相似达人意图但尚未提供具体种子（如"找相似达人"），仍使用本 Skill，
  并在执行检索前询问用户名、主页链接或 Scout 达人标识（触发条件 ≠ 执行条件）。
  如果用户主要是在按自然语言描述寻找达人、只把某个账号作为辅助参考
  （如"参考 @X 的风格，帮我找美国跑步达人"），使用 creator-nl-search 的 seed_creators，而不是本 Skill。
  调用 scripts/find_lookalike.mjs 和 Scout Lookalike OpenAPI；不要未经用户同意改用公开网页搜索。
compatibility: Node.js 20.6+
metadata:
  layer: discovery
  parent: influx-ai
---

## 概述

根据 Scout 达人库中的种子达人查找同平台相似创作者。种子达人需已被 Scout 收录。通过 `SCOUT_API_BASE_URL` 配置 Scout API 地址，并配置 `SCOUT_API_KEY`（每次请求经 `X-API-Key` 头认证，身份由后端按 Key 解析）。

## 脚本引用

| 脚本 | 路径 | 模式 | 状态 |
|------|------|------|------|
| find_lookalike.mjs | `../../scripts/find_lookalike.mjs` | 同步等待结果，由 Scout 解析 username/URL | 可用 |

## 输入方式

以下三种种子标识必须且只能使用一种。用户名或主页链接由 Scout 解析，无需另行调用 resolve 接口。

### 方式一：username + platform（指定平台）

明确知道种子达人平台时，传入用户名和平台：

```bash
node ../../scripts/find_lookalike.mjs '{"username":"khaby.lame","platform":"tiktok","limit":10}'
```

### 方式二：profile_url（自动识别平台）

传入达人主页链接，Scout 从链接识别平台；如同时传 `platform`，必须与链接一致：

```bash
node ../../scripts/find_lookalike.mjs '{"profile_url":"https://www.tiktok.com/@khaby.lame","limit":10}'
```

支持的主页域名：
- TikTok：`tiktok.com`
- YouTube：`youtube.com`
- Instagram：`instagram.com`

### 方式三：username only（跨平台解析种子）

只传用户名时，Scout 在 TikTok、Instagram、YouTube 中解析种子身份；多个平台均匹配时返回 HTTP `409`，需补充种子平台：

```bash
node ../../scripts/find_lookalike.mjs '{"username":"khaby.lame","limit":10}'
```

还可直接传 `seed_creator_key`（`platform` 和 `creator_id`），跳过用户名解析。此时不要再单独传 `platform`。

## 参数说明

脚本接受 Scout Lookalike OpenAPI 的全部请求字段。以下字段除种子标识三选一外均可省略。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 三选一 | 种子达人用户名，最长 200 字符 |
| `profile_url` | string | 三选一 | 种子达人主页链接，最长 2000 字符 |
| `seed_creator_key` | object | 三选一 | Scout 达人标识，包含 `platform` 和 `creator_id` |
| `platform` | string | 否 | 种子平台：`tiktok` / `instagram` / `youtube`；仅与 `username` 或 `profile_url` 合用 |
| `similarity_dimension` | string | 否 | 相似维度：`overall`（默认，综合相似）/ `topic`（内容主题相似）/ `style`（风格相似） |
| `limit` | integer | 否 | 返回数量，默认 40，范围 1~100 |
| `hard_filters` | object | 否 | 候选达人的硬筛选条件，支持下表字段 |
| `exclude_creator_keys` | object[] | 否 | 要排除的达人标识数组，每项包含 `platform` 和 `creator_id`，最多 10000 项 |
| `query` | string | 否 | 自然语言检索要求，最长 2000 字符 |
| `additional_requirements` | string | 否 | 补充检索要求，最长 2000 字符；与 `query` 非空内容以换行拼接后不能超过 2000 字符 |
| `retrieval_strategy` | string | 否 | 检索策略：`seed_vector`（默认，紧贴种子本身找最像的）/ `profile`（按种子画像找风格相符的，候选更宽）/ `auto`（由 Scout 自动选择）。无特殊要求时用默认即可 |
| `profile_only` | boolean | 否 | 只生成种子画像，不执行候选检索 |
| `debug` | boolean | 否 | 是否启用检索诊断 |
| `weight_control` | object | 否 | 检索路线权重控制，含 `weights` 和 `locked_routes` |
| `execution_plan` | object | 否 | 回传此前结果中的执行计划，用于按计划执行 |
| `lang` | string | 否 | `cn` / `en`，可选；不传保留原始码值。但公开候选通常无性别/年龄字段、国家/语言字典为空，**启用后通常无可见变化** |
| `service_level` | string | 否 | `S1`/`S2`/`S3`，**保留参数、当前不生效**（不改变检索或返回字段） |
| `request_version` | string | 否 | 请求契约版本，默认 `creator-lookalike-request/v1` |

`hard_filters` 支持：

| 字段 | 类型 | 说明 |
|------|------|------|
| `follower_min` / `follower_max` | integer | 粉丝数下限 / 上限，非负；下限不能大于上限 |
| `avg_views_min` / `avg_views_max` | number | 平均播放量下限 / 上限，非负；下限不能大于上限 |
| `countries` | string[] | 国家代码数组，Scout 会去空白、转大写并去重 |
| `has_email` | boolean | 是否要求有邮箱；`false` 也表示一个明确的筛选条件 |
| `passthrough` | object | 供检索服务使用的额外硬筛选字段；仅传入已有契约明确支持的字段 |

相似维度的选择：用户说"找内容题材像的"用 `topic`，"找风格调性像的"用 `style`，没特别说明用 `overall`。若指定的 `similarity_dimension` 对该种子缺少可用数据，接口会以失败状态返回并在 `data.errors` 说明；此时可改用 `overall` 或换一个维度重试，而不是报告为"没有相似达人"。

`hard_filters`、`query`、`additional_requirements` 是收敛/补充条件；和自然语言搜索一样，严格匹配不足时返回的候选不保证逐条满足全部条件，需结合候选的 `bio`、`match_assessment.facts.portrait` 等据实判断（收敛后候选不再返回逐条条件核验信息）。`weight_control.weights` 接受 `profile`、`topic`、`style`、`commercial` 四条路线的 0~1 权重，`locked_routes` 是其中需要固定权重的路线；只有已在 `weights` 中赋值的路线才能锁定，部分权重总和不能超过 1。这是高级微调项，无明确需求时不要主动设置。`execution_plan` 为高级参数，无明确需求时不要设置（收敛后的响应不再返回执行计划，无法从返回结果回传）。`profile_only: true` 只返回种子画像、不返回候选，用于先确认种子解析是否正确，不能同时指定 `execution_plan` 或非空权重控制。

例如按国家和粉丝数过滤：

```bash
node ../../scripts/find_lookalike.mjs '{"username":"khaby.lame","platform":"tiktok","similarity_dimension":"topic","hard_filters":{"countries":["US"],"follower_min":1000}}'
```

## 输出格式

执行前按请求 `limit` 检查最高可能用量，实际按成功或部分成功交付的候选数登记；不能用 `limit` 或 `total` 当最终扣费数量。使用 `creator:search`，Key scope 不代替服务端策略和用户 `Scout Discover` 权限；不需要 `billing:read`、JWT、用户 ID 或额外 scope 头。

脚本原样输出 Scout JSON。外层结构为 `success / data / error / meta`。Scout 已收敛此链路的返回字段（请求参数与调用方式不变）。相似达人检索结果位于 `data`，顶层只保留 `search_id`、`status`、`candidates`、`total`、`errors`，另有一个**精简的 `seed`**；`diagnostics`、`execution_plan` 等内部执行信息已移除：

```json
{
  "success": true,
  "data": {
    "search_id": "search_example",
    "status": "success",
    "seed": {"seed_creator_key": {"platform": "tiktok", "creator_id": "123"}},
    "candidates": [{"platform": "tiktok", "uid": "456", "username": "example", "nickname": "Example"}],
    "total": 1,
    "errors": []
  },
  "error": null,
  "meta": {
    "request_id": "request_example", "total": 1,
    "billing_operation_id": "openapi:example:operation",
    "billing_status": "pending_settlement",
    "credits_consumed": null, "credits_remaining": -1, "billable_units": 1
  }
}
```

保留完整计费 `meta`：`billing_operation_id` 是独立计费操作号，不是 `request_id`；`pending_settlement` 表示业务结果已交付、积分待结算；`credits_consumed=null` 不是 0，待结算时 `credits_remaining` 是准入余额，`-1` 表示未提供；`billable_units` 为实际交付项数。`recording_failed` 是用量登记失败需核对，不代表搜索失败。`pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。详见 [API 参考](../../references/api-reference.md)。

达人资料位于 `data.candidates`，与达人搜索共用收敛后的候选结构：基础达人字段 `uid`、`username`、`nickname`、`avatar_url`、`profile_url`、`country_code`、`followers_count`、`avg_views`、`engagement_rate`，以及 Scout 字段 `platform`、`median_views`、`language`、`bio`、`match_assessment`。**用 `platform` + `uid` 识别达人，用 `nickname` 展示名称**。候选中 `key`、`display_name`、`match_score`、`evidence`、`condition_verifications` 均已移除，不要再引用。面向用户展示时只使用实际返回的字段。

`match_assessment` 的关键子字段（与达人搜索一致）：
- `match_assessment.percent`（0–100）：**推荐排序分**，可能为 `null`。只作本次结果内排序参考，**不是相似度概率/条件满足度**，不要这样解释，也不要跨请求比较。
- `match_assessment.facts.portrait.zh`/`.en`：**达人画像概述**，按使用语言取 zh/en，可能为 `null`。只描述账号内容，**不是推荐理由、不解释"为何与种子相似"**；`null` 时留空、不编造。
- `match_assessment` 下其余字段（`reasons`、`rrf_score`，以及 `facts` 中除 `portrait` 外的字段）已移除；候选的 `match_score` 也已移除——都不要再读取。

## 结果展示与分析

相似达人结果的呈现与 `creator-nl-search` 的输出规范一致（候选结构相同：含 `match_assessment.percent`/`facts.portrait`、无 `audience_*`），按相似场景调整：

1. **达人表**：按实际返回字段动态生成列，遵循 `creator-nl-search`「输出格式」的表格安全清洗、头像列与**固定语义列**规范——只要返回 `avatar_url` 就加独立「头像」首列（固定方形外框 HTML，缺失留空不编造）；用户名/昵称两列、主页链接用 `profile_url`；`engagement_rate` ×100 加 `%`。同样把 `match_assessment.percent`（"推荐分"，标明是排序分 0–100、非相似概率）和 `match_assessment.facts.portrait.zh/en`（"达人画像"，按语言取 zh/en）作为固定语义列：本次有值即展示，整批均为 `null` 时省略该列、不编造。候选已不含 `match_score`，不要展示该字段。
2. **相似度点评（前 3-5 位）**：基于真实返回给简短判断——与种子在内容题材/风格/受众上的契合点、潜在差异或风险（如明显画像不符、疑似品牌官号/关联账号）、是否值得纳入候选。有 `portrait` 则引用其画像概述；**不要仅凭 `percent` 或 `portrait` 就断言"与种子高度相似"**，同一批结果常混入不贴合的候选，需据实说明"待人工复核"。
3. **诚实口径**：相似性未经确认时标为"待筛选候选"，不编造相似度数字、不补造缺失字段。

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| HTTP 401，`error.code: 40101` | Key 缺失、无效、过期或撤销 | 检查 `SCOUT_API_KEY`，不自动重试 |
| HTTP 402，`error.code: 40201` 且 `error.message: insufficient_credits` | 积分不足 | 提示检查钱包余额；其他 402 按原错误说明 |
| HTTP 403，`error.code: 40301` | scope、服务端策略、用户权限或资源归属被拒绝 | 检查授权，不统一解释成缺套餐 |
| HTTP 429，`error.code: 42901` | 限流 | 只按有效 `Retry-After` 提示等待，无有效值不编造时间，不自动重试或换 Key |
| HTTP 400，`error.code: 40001` | 主页链接不支持或平台不一致 | 核对种子链接和平台 |
| HTTP 404，`error.code: 40401` | 种子达人未被 Scout 收录 | 告知用户并请其更换种子 |
| HTTP 409，`error.code: 40901` | 用户名匹配多个平台 | 请用户指定种子平台 |
| HTTP 422，`error.code: 42201` | 请求参数校验失败 | 核对参数名、类型及范围 |
| HTTP 503，`error.code: 50301` | 服务或依赖暂时不可用 | 不认定 Key 一定无效，不自动重试 |
| HTTP 200 且 `data.status` 为失败状态 | 检索业务失败 | 查看 `data.errors`，不要报告为成功 |

接口返回 `success: false`，或 `data.status` 为 `invalid_request`、`intent_parse_failed`、`intent_conflict`、`condition_unsupported`、`routing_failed`、`failed` 时，脚本在标准输出保留完整响应，同时将错误写入标准错误并以非零状态退出。`partial`、`empty`、`router_degraded` 状态也应按实际结果和 `data.errors` 说明，不要当作完整命中。

## 决策规则

- 用户给出主页链接 → 使用 `profile_url`。
- 用户给出用户名和平台 → 使用 `username` + `platform`。
- 用户只给出用户名 → 仅传 `username`；若返回歧义错误，再询问种子平台。
- 用户给出 Scout 平台与达人 ID → 使用 `seed_creator_key`。
- 用户要求排除已看过的达人 → 把对应 `platform`、`creator_id` 放入 `exclude_creator_keys`。
- 用户说要"题材像/风格像/综合像" → 对应设 `similarity_dimension` 的 `topic` / `style` / `overall`。
- 用户希望候选更贴近种子本身，还是更宽地按画像扩展 → 分别用 `retrieval_strategy` 的 `seed_vector` 与 `profile`；无明确要求时用默认。
- 指定维度返回失败且 `data.errors` 指向该维度无数据 → 如实说明，询问是否换 `overall` 或其他维度；不要自动重试，重新搜索会产生新的独立计费操作。
- 用户提出当前接口无法表达的筛选条件 → 说明无法按该条件执行，不静默丢弃。
