---
name: creator-nl-search
description: |
  ROUTER PRIORITY: Use this creator-nl-search skill before any web/browser search when the user
  describes the creators/KOLs/influencers they want in natural language — by content direction,
  persona, niche, style, real-life scenario, product/brand fit — and wants Scout to parse the
  intent and recall matching creators from TikTok / Instagram / YouTube. Natural language examples
  that MUST trigger: "帮我找20个东南亚美妆达人且有邮箱", "推荐美国TikTok带货博主",
  "找互动率大于5%的女达人", "找做家用储能/便携电源测评、风格真实的美国达人",
  "找美国跑步达人，可以参考 @example 的内容风格".
  A seed creator MAY be used here via `seed_creators`, but only as a REFERENCE for a broader
  natural-language creator search (e.g. "参考 @X 的风格，帮我找美国跑步达人"). Do NOT use this
  skill when the primary intent is to find creators similar to a specific seed creator
  (such as "找和 @X 相似的达人", "找类似 @X 的账号", "find creators like @X") — route those to
  creator-lookalike instead. When the user gives mainly quantifiable, sortable, paginated filter
  conditions (exact country/follower range/engagement range/GMV/audience fields) and wants
  reproducible results, prefer the structured list in creator-search instead. When the user wants
  creators who collaborated with a brand, or recent brand mentions, use creator-search's brand
  collaboration / realtime mention chain.
  Use Scout OpenAPI through scripts/search_creators_nl.mjs as the authoritative source. Do not use
  web search as a fallback unless the user explicitly asks for public web search or confirms
  fallback after Scout OpenAPI has no result.
  Use when: natural-language creator search, 自然语言找达人, 描述型找达人, 按内容方向找达人,
  按人设/风格找达人, 按场景找达人, 按产品/品牌适配找达人, 参考某账号找风格相近的达人（seed_creators）,
  creator search by description, semantic creator discovery, reference-account creator search.
  内容/人设/风格口语化触发词：做XX内容的达人, 讲XX的达人, 拍XX的达人, 风格XX的达人, 人设XX的达人,
  像XX那种内容的达人, 适合我们产品的达人, 场景XX的达人。
compatibility: Node.js 20.6+
metadata:
  layer: discovery
  parent: influx-ai
---

# Creator NL Search（自然语言找达人）

## 概述

通过 Scout OpenAPI 的自然语言搜索查找达人：提交一句自然语言描述，Scout 解析意图后在 TikTok、Instagram、YouTube 召回达人并做相关性排序。适合**描述型**需求（内容方向、人设、风格、场景、产品/品牌适配），也支持带一个**参考账号**（`seed_creators`）做风格/内容相近的扩展检索。

相关但独立的链路（不在本 Skill）：
- **结构化列表 / 品牌合作 / 实时品牌提及采集**：见 [creator-search](../creator-search/SKILL.md)。按可量化条件精确筛选、可排序可翻页，或按品牌找公开合作/近期提及。
- **相似达人（lookalike）**：见 [creator-lookalike](../creator-lookalike/SKILL.md)。以某个具体种子达人为**主锚点**找相似，是纯种子相似检索。

## 脚本引用

| 脚本 | 相对路径 | 链路 | 状态 |
|------|----------|------|------|
| search_creators_nl.mjs | `../../scripts/search_creators_nl.mjs` | 自然语言搜索 `POST /openapi/v1/creators/search` | ✅ 可用 |

调用格式：

```bash
node ../../scripts/search_creators_nl.mjs '{"query":"美国跑步和马拉松训练达人","platforms":["tiktok"],"hard_filters":{"countries":["US"],"follower_min":10000},"limit":20}'
```

## 什么时候用本 Skill（与相邻 Skill 的边界）

- 用户用**内容方向、达人画像、内容风格、真实场景、品牌或产品适配**等开放描述表达需求 → 本 Skill（自然语言搜索）。接受一句话 `query`，会对结果做相关性排序。
- 用户主要给出**可量化、可排序、可翻页的结构化条件**（国家代码、粉丝/互动区间、带货 GMV/GPM、受众国家/语言/年龄、是否认证），要结果可复现 → 用 [creator-search](../creator-search/SKILL.md) 的**结构化列表**。
- 用户要找**和某品牌合作过的达人**或**近期提及的潜在候选** → 用 [creator-search](../creator-search/SKILL.md) 的**品牌合作 / 实时提及采集**。
- 用户主要意图是**“找和某个具体达人相似/同类型”**（种子是主锚点）→ 用 [creator-lookalike](../creator-lookalike/SKILL.md)。
- 同一需求描述型与结构化都能做时：更看重“贴合语义、宁可模糊” → 本 Skill；更看重“条件严格、可复现、要翻页” → 结构化列表。

每次用户请求只走一条链路，不要同时调用多个脚本。

## 搜索前 Brief 规则

每次搜索必须先确认需求是否足够执行。最小 brief 包含：平台、目标市场/国家地区、品类/行业/关键词或内容方向、需要数量。缺少平台或关键业务条件时，先澄清，再搜索。

1. 用户未指定平台时，必须先问平台。自然语言搜索可选 TikTok / Instagram / YouTube（一次 1~3 个）。不要默认选一个平台替用户决定。
2. 用户未指定目标市场/地区时，必须先问目标地区；“东南亚”“欧美”“美国”等明确范围可以直接使用。
3. 用户未指定品类、行业、关键词、产品、品牌或内容方向时，必须先问业务方向。
4. 用户未指定数量时，自然语言搜索默认 20。用户表达“合作名单/建联名单/批量达人”时，优先追问数量。
5. 用户已给出平台、地区、品类和数量时，不要继续追问内部参数，直接按当前条件严格搜索。
6. 澄清问题必须短，一次最多 3 个，只问当前真正缺失的信息。

不要用“基于规则”“参数如下”“召回类型”等内部表达作为过程内容。内部规则只用于指导执行，不展示给用户。

## 自然语言搜索协议

- Endpoint：`POST /openapi/v1/creators/search`。
- 自然语言查询使用 `query` 和 `platforms`（复数数组），**不能传单数 `platform`**。
- 脚本传递 Scout `CreatorSearchInput` 的请求字段；`history_context` 不接受（只能为 null），`original_query` 由 Scout 根据 `query` 生成。
- 一次请求可指定 1~3 个平台，`limit` 默认 20、范围 1~500。
- 使用个人 `SCOUT_API_KEY` / `X-API-Key` 和 `creator:search`；Key、scope、服务端策略和用户 `Scout Discover` 权限分别校验，不需要 `billing:read`、JWT、用户 ID 或额外 scope 头。
- 执行前按 `limit` 检查最高可能用量，实际按成功或部分成功交付的候选数登记；`limit`、`total` 不是最终扣费数量，Skill 不计算价格或执行扣费。
- `mode` 默认 `auto`，可设 `nl_search` 或 `hashtag_search`。`auto` 让 Scout 自行选择检索方式；只有当用户明确要求某种检索方式时才指定 `mode`。
- `data.requested_mode` 是你请求的模式，`data.resolved_mode` 是 Scout 本次实际采用的模式。两者不同是正常现象（`auto` 下尤其常见），无需向用户解释，正常展示结果即可；仅当 `data.status` 为 `router_degraded` 时才说明“本次结果可能不是最优检索方式”。
- 接口返回 `success / data / error / meta`。`success: true` 只表示调用完成，每次都要检查 `data.status` 和 `data.errors`。
- 结果不足或为 0 时遵守本 Skill 的静默查询边界，不自动换平台、不自动改用结构化列表、不自动放宽条件。

### 显式参考达人 seed_creators

用户希望“参考某个账号找风格/内容相近的达人”时，自然语言搜索支持传 `seed_creators` 作为显式参考：

- `seed_creators` 是数组，最多 10 个。每项用 `platform` + `uid` / `url` / `name` 之一标识参考达人；**优先给 `platform` 和稳定的 `uid` 或主页 `url`**，`name` 最不稳定。Scout 在服务内部解析种子并参与检索。
- **不能只传 `seed_creators`**：必须同时给非空 `query` 或 Scout 支持的显式筛选（`hard_filters` / 强标签）。只传种子会被接口拒绝。
- 种子只影响召回倾向，仍走同一条自然语言搜索链路；返回结构不变，照旧检查 `data.status` 和 `data.errors`。
- **不要传 `target_platform`，也不要承诺跨平台找相似达人**：参考检索当前只在种子所在平台进行。要“换个平台找相似”时，如实说明暂不支持跨平台。
- 与相似达人子 Skill（`find_lookalike`，见 [creator-lookalike](../creator-lookalike/SKILL.md)）的区分：`find_lookalike` 是**纯种子相似检索**（种子是主锚点）；这里的 `seed_creators` 是**“自然语言需求 + 参考账号”的组合检索**（既要描述条件、又要贴参考风格）。用户主意图是“找和 @X 相似”时走 lookalike，不走这里。

示例：

```bash
node ../../scripts/search_creators_nl.mjs '{"query":"找与参考账号风格相近的美国跑步达人","platforms":["tiktok"],"limit":20,"seed_creators":[{"platform":"tiktok","uid":"参考达人的平台ID"}]}'
```

## 参数提取强制规则

1. 用户明确给出的平台写入 `platforms` 数组（`tiktok`/`instagram`/`youtube`），不使用单数 `platform`。
2. 用户描述达人画像或内容方向时写入 `query`；仅以硬筛选、强标签或结构化画像搜索时 `query` 可为空字符串。
3. boolean 参数传 JSON boolean `true` / `false`，不要传 `"true"` / `1`。
4. 国家写入 `hard_filters.countries` 数组（ISO 国家代码，如 `["US","CA"]`）；用户说中文国家名或"东南亚/欧洲"等区域时，先按 [references/country-codes.md](../../references/country-codes.md) 映射到代码再传。候选返回的 `language` 字段语言代码对照见 [references/language-codes.md](../../references/language-codes.md)。
5. 日期统一传 `YYYY-MM-DD`。
6. 用户要求排除已有候选时，用 `exclude_creator_keys` 传入各达人的 `platform` 和 `creator_id`。
7. `hard_filters` 是收敛条件，但当严格匹配结果不足时，**Scout 可能放宽部分条件以补足数量**。因此返回的候选不保证每条都严格满足全部 `hard_filters`，**不要默认全部严格满足**；收敛后的候选不再返回逐条条件核验信息，需结合候选的 `bio`、`match_assessment.facts.portrait`、`country_code`、`followers_count` 等实际字段据实判断是否符合用户条件。`hard_filters.passthrough` 仅用于 Scout 已定义的额外条件。
8. 用户提出当前字段无法表达的条件时，说明无法按该条件执行，不静默丢弃、不本地补算。
9. **意图下推口径（与后端构造口径保持一致，避免漂移）**：数量永远是 `limit`，不是筛选条件；能用字段精确过滤的（国家、粉丝数、均播、是否有邮箱）下推到 `hard_filters`；只能靠语义理解的主题/风格留在 `query`。`query` 用归一化表达，若同时传 `parsed_profile`，两者语义必须一致。默认只填 `query`+`hard_filters`、不手拼 `parsed_profile`（见参数表说明）。

## 搜索执行边界

为避免静默查询，达人搜索必须遵守以下边界：

1. 用户给出的平台和全部筛选条件必须进入同一次请求。禁止先只传少量条件拿候选、再本地过滤。
2. 默认只调用一次脚本，只取本次返回。
3. 用户未指定平台时，先澄清平台，不得自动选择或并行搜多个平台来凑结果。
4. 严格条件返回 0 条或不足时，不再发起任何补充搜索；直接说明命中情况，并询问是否放宽条件（降低互动率、扩大地区、换平台、换链路）。
5. 若出现部分候选不完全满足条件，可能是严格匹配不足时的放宽结果（见参数提取第 7 条），据候选的 `bio`/`portrait`/`country_code`/`followers_count` 等实际字段如实说明哪些条件未必严格命中，而不是当作传参错误。
6. 接口无结果或不可用时，不未经用户同意改用公开网页搜索。

## 服务等级与 lang

- `service_level`（S1/S2/S3，默认 S2）在自然语言搜索里**仅校验并写入 `meta.service_level`，不改变检索算法或返回字段**。不要把它理解为会改变搜索算法。
- `lang` 在自然语言搜索里**不支持**（接口未接入翻译），不要承诺把字段翻成中文。
- 非法等级（非 S1/S2/S3）返回 `40001`；脚本已在本地先行校验。
- 需要受众画像（受众国家/性别/语言/年龄分布）、字段中文化、精确可翻页时，改用 [creator-search](../creator-search/SKILL.md) 的结构化列表（那里 `service_level` 真实裁字段、`lang` 翻译性别/年龄）。

## 通用请求参数（search_creators_nl.mjs）

`history_context` 不可传，`original_query` 无需填写。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 自然语言描述，最长 2000 字符；仅以硬筛选/强标签/结构化画像搜索时可传空字符串 |
| `platforms` | string[] | 是 | 1~3 个平台：`tiktok`、`instagram`、`youtube` |
| `mode` | string | 否 | `auto`（默认）、`nl_search`、`hashtag_search` |
| `limit` | integer | 否 | 默认 20，范围 1~500 |
| `hard_filters` | object | 否 | `countries`、`follower_min/max`、`avg_views_min/max`、`has_email` 等硬筛选 |
| `strong_hashtags` | string[] | 否 | 强标签，最多 20 个 |
| `exclude_creator_keys` | object[] | 否 | 排除达人，每项含 `platform`、`creator_id` |
| `seed_creators` | object[] | 否 | 显式参考达人，最多 10 个；每项用 `platform`+`uid`/`url`/`name` 之一标识（优先 `platform`+`uid`/`url`）。须与非空 `query` 或显式筛选同用，不能单独传；不传 `target_platform`、不跨平台 |
| `debug` | boolean | 否 | 是否返回诊断信息 |
| `weight_control` | object | 否 | 路线权重与锁定路线 |
| `execution_plan` | object | 否 | 使用此前返回的完整执行计划 |
| `semantic_context` | object | 否 | Scout 结构化语义上下文 |
| `parsed_profile` | object | 否 | **高级可选，默认不传**。结构化检索意图。只传 `query`+`hard_filters` 时 Scout 会自动构造、结果可用；仅在已掌握完整结构化意图且愿按严格字段契约构造时才传（漏必填字段如 `evidence`/`parser_version`/`prompt_version` 会 422）。不确定就不传，交后端兜底 |
| `hashtag_mode` | string | 否 | `profile`（默认）或 `exact`；精确模式需配合 `hashtag_search` 和强标签 |
| `service_level` | string | 否 | `S1`/`S2`/`S3`，默认 S2；仅校验并写入 `meta.service_level`，**不改变检索或返回字段** |
| `request_version` | string | 否 | 默认 `creator-search-request/v2` |

### parsed_profile 进阶构造（高级可选，默认不用）

**默认路径**：只填 `query` + `hard_filters` + `limit`，**不传 `parsed_profile`**，Scout 后端会自动用它构造检索意图，结果可用。门槛低、不易 422，绝大多数场景走这条即可。

**进阶路径**：已掌握用户完整结构化意图、且愿意严格按字段契约构造时，可直接传 `parsed_profile`（跳过后端构造）。字段校验很严，漏必填项（如 `evidence`/`parser_version`/`prompt_version`）会直接 422。契约如下。

顶层字段：

```json
{
  "schema_version": "creator-search-parsed-intent/v1",
  "parser_version": "unified-intent-parser/v1",
  "prompt_version": "creator-search-intent/v1",
  "summary": "一句话总结用户要找什么",
  "product_context": "",
  "profile_conditions": [],
  "content_conditions": [],
  "audience_conditions": [],
  "hard_filter_conditions": [],
  "exclusion_conditions": [],
  "groups": [],
  "warnings": [],
  "llm_calls": 1
}
```

- `parser_version`、`prompt_version` 必填（字符串，照上面填即可）。
- 条件按语义分到 5 个数组：`profile_`（达人画像）/ `content_`（内容主题）/ `audience_`（受众）/ `hard_filter_`（可下推为硬过滤）/ `exclusion_`（排除）。

每个 condition 的字段与约束（**全部必填，除非标注**）：

| 字段 | 取值 |
|------|------|
| `id` | 组内唯一，小写字母开头，`^[a-z][a-z0-9_.-]*$`，如 `text.1` |
| `category` | `creator_profile` / `content` / `audience` / `hard_filter` / `creator_exclusion` |
| `dimension` | 领域维度，小写，如 `content.topic`、`creator.followers_count`、`creator.country` |
| `operator` | `equals` / `range` / `in` / `all` / `any` / `semantic` / `excludes` |
| `value` | 任意 JSON 值（字符串/数字/数组，看 operator） |
| `unit` | 可选 |
| `strength` | `required` / `preferred` / `excluded` / `uncertain` |
| `source` | `explicit_parameter` / `explicit_text` / `inferred_text` / `system_default` |
| `evidence` | **必填，1~8 条**（漏了直接 422），填法按 `source` 配套（见下） |
| `confidence` | 0~1；**仅 `inferred_text` 必填**，`explicit_*` 必须为 `null` |
| `status` | 默认 `active` |

`evidence` 按 `source` 配套（否则 422）：

- `source = explicit_text`（用户原话）：给 `source_quote` + `start` + `end`（`end > start`），如 `{"start":0,"end":2,"source_quote":"健身"}`。
- `source = explicit_parameter`（来自结构化参数）：给 `parameter_path`，不能同时给 `source_quote`，且 `confidence` 必须 `null`，如 `{"parameter_path":"hard_filters.follower_min"}`。
- `source = inferred_text`（模型推断）：给 `rationale`，且 condition 的 `confidence` 必填，如 `{"rationale":"用户说面向年轻人，推断受众年龄偏低"}`。

`groups`（可选，表达条件间 AND/OR）：`{"id":"g1","operator":"any","condition_ids":["text.1","text.2"]}`。`operator` 只能 `all`/`any`；`condition_ids` 必须引用已存在条件；**同一组内所有条件的 `strength` 必须相同**。

构造口径（与后端保持一致，避免漂移）：

1. “要 N 个达人” → `limit`，不是条件。
2. 能用字段精确过滤 → `hard_filters`（国家/粉丝/均播/是否有邮箱）；对应可在 `hard_filter_conditions` 登记，`source=explicit_text`/`explicit_parameter`。
3. 只能靠语义理解的主题/风格 → `content_conditions`，`operator=semantic`、`dimension=content.topic`。
4. 强度分清：必须满足 `required`；加分项 `preferred`；明确不要 `excluded`（放 `exclusion_conditions`）。
5. `query` 与 `parsed_profile` 语义一致；`query` 用归一化表达（如“必须满足：充电/数码配件测评”）。
6. `evidence.start/end` 是相对**完整原文**的字符位置；填不准不致命（主要用于回放/诊断），但 `source_quote` 必须是原文里**连续出现**的片段。

完整最小示例（"找美国健身达人，粉丝1万以上，10个"）：

```json
{
  "query": "必须满足：健身内容",
  "platforms": ["instagram"],
  "limit": 10,
  "mode": "nl_search",
  "hard_filters": { "countries": ["US"], "follower_min": 10000 },
  "parsed_profile": {
    "parser_version": "unified-intent-parser/v1",
    "prompt_version": "creator-search-intent/v1",
    "summary": "寻找美国地区、粉丝1万以上的健身达人",
    "content_conditions": [
      {
        "id": "text.1", "category": "content", "dimension": "content.topic",
        "operator": "semantic", "value": "健身", "strength": "required",
        "source": "explicit_text",
        "evidence": [{ "start": 0, "end": 2, "source_quote": "健身" }]
      }
    ],
    "hard_filter_conditions": [
      {
        "id": "hf.country", "category": "hard_filter", "dimension": "creator.country",
        "operator": "in", "value": ["US"], "strength": "required",
        "source": "explicit_text",
        "evidence": [{ "start": 0, "end": 2, "source_quote": "美国" }]
      },
      {
        "id": "hf.followers", "category": "hard_filter", "dimension": "creator.followers_count",
        "operator": "range", "value": { "min": 10000 }, "strength": "required",
        "source": "explicit_text",
        "evidence": [{ "start": 0, "end": 5, "source_quote": "粉丝1万以上" }]
      }
    ]
  }
}
```

## 示例

```json
{"query":"美国跑步和马拉松训练达人，内容专业真实","platforms":["tiktok"],"hard_filters":{"countries":["US"],"follower_min":10000},"limit":20}
```

## 输出格式

### 响应结构

脚本原样输出 Scout 的 `success / data / error / meta` 包装。`success: true` 只表示调用完成，业务结果看 `data`。

保留 `meta.billing_operation_id`（独立计费操作号，不是 `request_id`）和 `billable_units`（实际交付项数）。`pending_settlement` 表示业务结果已交付、积分待结算；`credits_consumed=null` 不是 0。待结算时 `credits_remaining` 是准入余额，`-1` 表示未提供。`recording_failed` 是用量登记失败需核对，不代表搜索失败。`pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。字段与错误说明见 [API 参考](../../references/api-reference.md) 和 [错误码参考](../../references/error-codes.md)。

`401` 检查 Key；`402/40201` 且 `insufficient_credits` 提示积分不足；`403` 检查 scope、服务端策略、用户权限或资源归属；`429` 仅按有效 `Retry-After` 提示等待，不编造时间、不换 Key 绕过限流；`503` 提示服务或依赖不可用，不认定 Key 无效。

Scout 已收敛此链路的返回字段（请求参数与调用方式不变）。候选位于 `data.candidates`，检索状态位于 `data.status`，错误位于 `data.errors`；`data` 顶层只保留 `search_id`、`status`、`candidates`、`total`、`errors`（`diagnostics`、`execution_plan`、`scope_results`、`execution_receipts`、`attempt_id`、`requested_mode`、`resolved_mode` 等内部执行信息已移除，不要再读取）。每个候选字段：基础达人字段 `uid`、`username`、`nickname`、`avatar_url`、`profile_url`、`country_code`、`followers_count`、`avg_views`、`engagement_rate`，以及 Scout 字段 `platform`、`median_views`、`language`、`bio`、`match_assessment`。**用 `platform` + `uid` 识别达人，用 `nickname` 展示名称**。候选中 `key`、`display_name`、`match_score`、`evidence`、`condition_verifications` 均已移除，不要再引用。`match_assessment` 的关键子字段：
  - `match_assessment.percent`（0–100）：**推荐排序分**，可能为 `null`。只用于本次结果内的排序参考，**不是“条件满足度”也不是“匹配概率”**，不要这样解释，也不要跨请求/跨平台比较。
  - `match_assessment.facts.portrait.zh`/`.en`：**达人画像概述**，按使用语言取 zh 或 en，可能为 `null`。它只**描述账号内容**，**不是推荐理由、不解释“为何满足本次需求”**；`null` 时留空、**不要编造**。
  - `match_assessment` 下其余字段（`reasons`、`rrf_score`，以及 `facts` 中除 `portrait` 外的字段）已移除；候选的 `match_score` 也已移除——都不要再读取。推荐分只看 `percent`。
  - **纪律**：即使 `percent` 高或有 `portrait`，也不能仅凭此声称某候选“符合用户的具体要求”——同一次检索可能含明显不贴合的候选，需结合 bio/内容线索据实判断。
  `data.status: empty` 表示无候选；`partial` / `router_degraded` 表示不完整；`failed` / `routing_failed` / `condition_unsupported` 等表示失败。先检查外层 `success`，再检查 `data.status` 与 `data.errors`。

> 注意：自然语言搜索的候选**不含** `audience_*` 受众画像字段（那是结构化列表 S2/S3 才返回的）。需要受众画像时改用 [creator-search](../creator-search/SKILL.md) 结构化列表。

只用接口实际返回的字段展示，不编造。

### 表格设计原则（展示层优化）

达人名单表格必须遵循以下原则，提升可读性与交互效率：

**Markdown 表格安全清洗（防止展示错位）**：
- 输出任何 Markdown 表格前，必须先清洗所有单元格文本，尤其是昵称、bio、画像、内容方向等开放文本字段。
- 单元格内禁止出现原始竖线 `|`，也不要用 `\|` 转义；统一替换为 `／` 或 `/`。例如 `Gabe | Tech & Lifestyle` 展示为 `Gabe／Tech & Lifestyle`。
- 单元格内禁止出现换行、`\r`、`\n`、`<br>`；统一压成一个空格。
- 单元格内不要放会破坏表格结构的 Markdown 片段；长 URL 不进表格，链接只放在达人名或单独短入口里。
- 每一行的列数必须和表头完全一致；输出前检查每行 `|` 分隔数量一致。多个值用 `、` 或 `/` 连接，不要用 `|`。

1. **动态展示返回字段，不要固定表头**：表格列必须基于本次接口实际返回字段动态生成，必须覆盖所有可读字段。禁止只展示固定的少数列（如只放粉丝数、均播、互动率），也**禁止因为表格变宽就省略实际返回且有值的字段**。

   **固定语义列只保留这些：**
   - `#`：序号
   - `头像`：由 `avatar_url` 渲染
   - `用户名`：由 `username` 渲染为主页链接
   - `昵称` / `频道名`：由 `nickname` 渲染为主页链接
   - `推荐分`：由 `match_assessment.percent` 渲染（标注为“推荐排序分 0–100”，非满足度/概率）；本次有值即作为固定列展示，整批均为 `null` 时省略该列、不编造
   - `达人画像`：由 `match_assessment.facts.portrait.zh/en` 渲染（按使用语言取 zh 或 en，作“画像概述”、非推荐理由）；本次有值即作为固定列展示，整批均为 `null` 时省略该列、不编造

   **其余列必须按实际返回字段展开**：
   - 字段在接口响应里存在且至少一条结果有有效值，就展示为独立列
   - 字段在所有结果中都为空、`null`、空数组或空字符串时，可以省略该列
   - Boolean 字段不要只放空白图标；展示为 `是/否` 或带文字的 `✅ 是`、`—`
   - `avatar_url` 已通过头像承载，无需重复放原始 URL
   - `uid` 属于可追踪字段，如果返回必须展示，或至少在每行详情中展示，便于后续采集、建联、排障
   - 核心指标保留：`followers_count`、`avg_views`、`engagement_rate`、`median_views`、`bio`、`language` 等实际返回字段

2. **达人属性列只在有真实字段时展示**：不要输出单个「状态」列。自然语言搜索收敛后的候选通常只含基础字段 + `match_assessment`，不含带货/认证/邮箱/AI 等结构化字段；这类属性列**只有响应真实返回对应字段且有有效值时才展示**，缺失就不输出整列、不凭空补。

   **粉丝星级**（按粉丝量绝对值分 5 档，粉丝越多星越多）：
   - ⭐⭐⭐⭐⭐ 超头部（粉丝 > 200 万）
   - ⭐⭐⭐⭐ 头部（粉丝 50 万 - 200 万）
   - ⭐⭐⭐ 腰部（粉丝 10 万 - 50 万）
   - ⭐⭐ 初级（粉丝 1 万 - 10 万）
   - ⭐ 素人/起步（粉丝 < 1 万）
   - 列值必须输出完整文字，例如 `⭐⭐⭐⭐⭐ 超头部`，不要只放星星；字段缺失或 `followers_count` 为 0/缺失时该列留空或省略。
3. **用户名与昵称保持两列**：不合并，保留独立列。
4. **核心指标列保留**：平均播放（`avg_views`）、互动率（`engagement_rate`）、粉丝数必须展示。

### 头像列渲染规则

- `avatar_url` 全平台返回。表格新增独立的「头像」首列（紧随序号 # 之后），用固定方形外框承载头像：`<span style="display:inline-flex;width:40px;height:40px;overflow:hidden;border-radius:4px;vertical-align:middle;"><img src="{avatar_url}" width="40" height="40" style="width:40px;height:40px;max-width:40px;min-width:40px;object-fit:cover;object-position:center;display:block;"></span>`（外框固定、图片居中裁切，避免表格列宽把竖图压窄）。
- 禁止裸写 `<img src="{avatar_url}" width="36" height="36">` 这类未设置 `object-fit` / 外层裁切框的格式；也不要用 Markdown `![]()`。
- `avatar_url` 为空或缺失时，该格留空，**禁止编造头像 URL 或放占位图**。

### 通用格式规则

- 仅展示实际返回的字段，不能假设结果包含其不具备的字段。
- **平台主页跳转必须保留**：`profile_url`（TikTok/Instagram）/ `channel_url`（YouTube）。用户名、昵称列渲染为 `[名称][linkN]` 链接，指向该达人平台主页 URL，**不单独设置末列“主页链接”**；表格下方统一定义各 `[linkN]` 对应的完整 URL。
- `meta.total` / `data.total` 为 null 时不展示总匹配数。
- 默认展示 5~10 条，超过时询问用户。

## 面向用户的回复口径

搜索过程和最终回复必须像业务助手，而不是接口调试日志。

### 搜索前

- 信息足够时，用 1-2 句话确认业务口径，例如：“我会按 TikTok / 美国 / 跑步 / 粉丝 ≥1 万做严格匹配，不自动跨平台或放宽条件。”
- 信息不足时，只问缺失项，不展示参数、不解释规则、不输出 JSON。

### 搜索后

按以下顺序输出：

1. **一句话结果摘要**：本次实际返回多少个、是否满足用户数量，并说明 `data.status`。
2. **一张达人表**：按「输出格式」渲染，只展示真实返回字段。
3. **1-3 条业务判断（达人分析润色）**：对前 3-5 位，基于真实数据给简短专业点评——推荐理由、潜在风险、合作建议。禁止编造数字；指标缺失就说“该字段未返回”。
4. **下一步建议**只给最相关的 1-3 条，围绕用户原始目标（批量建联、继续放宽条件、换链路、找相似达人、按品牌找合作等）。有有邮箱达人时优先建联建议。

对于 `partial`、`router_degraded` 或 `data.errors` 非空的结果，说明结果不完整或具体错误。不要仅凭外层 `success: true` 宣称检索成功。

禁止：解释“我选了哪个接口/脚本”等内部实现（除非用户明确问技术原因）；一边说“不会自动跨平台”一边继续发起跨平台搜索；在只展示本次返回 N 条时却声称“共匹配 X 千”。

### 达人分析润色（AI 即兴生成 + 真实数据对照）

**[必须]** 展示搜索结果表格后，不要只丢出原始数据就结束。基于返回的数据，对头部达人（前 3-5 个）给出**简短的专业分析**，帮助用户快速理解匹配价值。润色维度参考（据返回字段灵活组织）：推荐理由（粉丝/播放/互动为何值得合作）、潜在风险（如“可能是场景号/品牌号而非个人达人”）、合作建议（开箱/测评/植入/种草、是否适合寄样）。

注意：
- 分析必须**基于真实返回数据**，禁止编造数字或字段。
- 指标缺失时不要硬编分析（如没有受众字段就说“本次未返回受众数据”——自然语言搜索本就不返回 `audience_*`）。
- 语气专业简洁，不要过度营销化。
- **推荐分/画像**：有 `match_assessment.percent` 时可作为“推荐排序分（0–100）”展示，但说明它是排序参考、非满足度/概率；有 `match_assessment.facts.portrait.zh/en` 时可引用作“达人画像概述”（按语言取 zh/en），`null` 则不展示、不编造。不要仅凭 percent/portrait 断言候选“符合需求”。

### 下一步建议（搜索后主动提示）

**[必须]** 搜索结果展示完毕 + 达人分析润色后，主动给出 1-3 条下一步建议。建联建议按确定性规则生成：

1. 用户请求里出现或语义包含“合作 / 建联 / 联系 / 邮箱 / 发邮件 / outreach / contact / email”等意图时，下一步建议里必须包含建联相关建议。
2. 邮箱数量 ≥ 2（`email` 非空或 `has_email=true`）时建议“批量建联这些有邮箱达人”，并说明可先确认产品信息后生成个性化邮件。
3. 只有 1 个有邮箱时建议“先单独建联这个达人”，可再建议“继续筛一批有邮箱达人后再批量建联”。
4. 没有邮箱时不要说批量建联；改为建议“继续按描述搜一批 / 基于优质账号找相似达人 lookalike / 按品牌找合作达人”。
5. 建联条件满足但产品信息不足时，不要省略建联；提示“补充产品名称、卖点、寄样/佣金、目标合作形式后可生成建联话术或批量邮件”。
6. 建联建议优先级高于找相似/继续搜索等其他建议。

可选建议池：
- “可以基于这批达人做**更详细的匹配和数据解释**，比如分析哪个达人最契合你的产品”
- “可以**搜索相似达人**（lookalike），基于表现最好的账号扩大候选池”（见 [creator-lookalike](../creator-lookalike/SKILL.md)）
- “可以用 [creator-search](../creator-search/SKILL.md) 的**结构化列表**按精确条件可排序可翻页地再筛一批，或**按品牌找合作达人**”

## 错误处理

脚本在 HTTP 错误、`success: false`、非 JSON 响应或缺少核心数据（`data.candidates`）时，将错误写入标准错误并以非零状态退出；`success: false` 时同时在标准输出保留完整响应。外层 `error.code` 约定为 `状态码*100+1`（如 HTTP 422 → `42201`，内部错误 → `50001`）。HTTP 422 表示参数校验失败，核对字段名、类型与平台适用性。失败状态（`failed` 等）也会以非零状态退出，不要报告为成功。详见 [references/error-codes.md](../../references/error-codes.md)。
