# API 参考（influx-ai → Scout OpenAPI）

本文汇总达人发现与邮件建联的接口契约。达人发现说明见下文；邮件七项操作及响应见「[邮件建联接口](#邮件建联接口)」，使用流程与参数见 [邮件子 Skill](../outreach/creator-outreach/SKILL.md)，错误与重试见 [错误码参考](error-codes.md#邮件建联错误与重试)。

## 协议

| 项 | 说明 |
|------|------|
| Base URL | `{SCOUT_API_BASE_URL}`，OpenAPI 子应用挂载在 `/openapi`；脚本自动拼接 `/openapi/v1/...` |
| 协议 | HTTP/HTTPS |
| 格式 | JSON（`Content-Type: application/json`） |
| 鉴权 | **必填**：每次请求带 `X-API-Key: <SCOUT_API_KEY>`；身份由后端按 Key 解析，不传用户 ID、不使用 `X-User-Identity` |
| Scope | 达人发现 10 个操作要求 `creator:search`；邮件分别要求 `creator:outreach:read` / `creator:outreach:send`，见下方邮件操作表 |
| 分页 | `page`（从 1 起）、`size` |

## 端点总览

| 链路 | 方法 / 路径 | 脚本 |
|------|------------|------|
| 自然语言搜索 | `POST /openapi/v1/creators/search` | `search_creators_nl.mjs` |
| 结构化列表（分平台） | `GET /openapi/v1/creators/{platform}/list` | `list_creators.mjs` |
| 相似达人 | `POST /openapi/v1/creators/lookalike` | `find_lookalike.mjs` |
| 品牌合作达人 | `POST /openapi/v1/brand-discovery/collaboration-creators` | `find_brand_collaboration_creators.mjs` |
| 实时提及采集·提交 | `POST /openapi/v1/brand-discovery/realtime-mentions` | `submit_brand_realtime_mentions.mjs` |
| 实时提及采集·状态 | `POST /openapi/v1/brand-discovery/realtime-mentions/status` | `get_brand_realtime_mention_status.mjs` |
| 实时提及采集·结果 | `POST /openapi/v1/brand-discovery/realtime-mentions/results` | `get_brand_realtime_mention_results.mjs` |

- 结构化列表 `{platform}` 取 `tiktok` / `instagram` / `youtube` / `twitter`。
- 实时提及采集是**异步**三步（提交→轮询状态→取结果）；平台 tiktok/instagram/youtube；`task_id` 为 32 位十六进制、7 天有效；详见 `discovery/creator-search/SKILL.md`。
- 自然语言搜索平台用 `platforms` 复数数组（1~3 个，tiktok/instagram/youtube）。
- 品牌合作仅 `tiktok` / `instagram`，两个平台均可用（TikTok 早前受限，现已修复）。

## 认证（X-API-Key）

- 所有请求（HTTP 脚本与 MCP 连接）都必须带 `X-API-Key: <SCOUT_API_KEY>`。
- 达人发现 MCP 连接在 HTTP Header 中配置 `X-API-Key`；初始化（initialize）、工具列表（tools/list）、工具调用（tools/call）均受认证保护。邮件仅提供 HTTP 操作，没有 MCP 入口。
- 用户身份由后端根据 Key 解析，**不传用户 ID、不使用 `X-User-Identity`**；仅带 JWT、不带 Key 无法通过认证。
- 本 Skill 覆盖的 10 个操作（`/openapi/v1/creators/**`、`/openapi/v1/brand-discovery/**`）统一要求 `creator:search` scope。
- 自然语言搜索、相似达人及四平台结构化列表共六个接口要求 `creator:search`。后端分别检查 Key 有效性、Key scope、服务端 scope 策略和用户 `Scout Discover` 权限；有 scope 不等于有业务权限。不需要 JWT、用户 ID、自报角色或额外 scope 请求头，普通搜索无需 `billing:read`，Skill 不自动创建 Key。
- 认证失败见 [错误码参考](error-codes.md)：`401`（`40101`）凭据缺失/无效/过期/撤销；上述六接口 `403`（`40301`）可能是 Key scope、服务端 scope 策略、用户权限或资源归属被拒绝，不统一解释成缺套餐，不自动重试。
- 异步任务（实时提及）归创建它的用户所有；用别的用户的 Key 查询会返回 `404`，同一用户换 Key 仍可查询。
- Key 为机密，仅放环境变量，勿写入文档、源码、命令参数或日志；多用户各用各自的 Key。

## 响应结构

以下为自然语言 / 相似达人响应的简化示例；结构化列表使用 `data.items`。计费字段仅按下述六接口口径解释。

```json
{
  "success": true,
  "data": { "status": "success", "candidates": [{ "platform": "tiktok", "uid": "example" }], "total": 1, "errors": [] },
  "error": null,
  "meta": {
    "request_id": "request_example",
    "total": 1,
    "billing_operation_id": "openapi:example:operation",
    "billing_status": "pending_settlement",
    "credits_consumed": null,
    "credits_remaining": -1,
    "billable_units": 1
  }
}
```

- `success`：协议调用是否完成；**不代表检索业务成功**。
- `data`：各链路结果（候选 `candidates` / 列表 `items` / 品牌合作 `items` 等），自然语言搜索与相似达人另含 `status`、`errors` 等。
- `error`：失败时的 `code`/`message`（`code` 约定为 `HTTP*100+1`，见 error-codes.md）。
- `meta.request_id`：协议请求排查号；`meta.total` 是业务展示总量，具体语义取决于接口，不能用作计费数量。
- 脚本保留完整响应，包括新增或未知 `meta` 字段；计费和错误提示写入标准错误，不重写 JSON。

以下计费说明仅适用于 `POST /openapi/v1/creators/search`、`POST /openapi/v1/creators/lookalike` 及四平台 `GET /openapi/v1/creators/{platform}/list`，不套用于品牌合作、实时提及或邮件接口。

| 能力 | 执行前准入 | 实际用量登记 |
|------|------|------|
| 自然语言搜索、相似达人 | 按请求 `limit` 检查最高可能用量 | 按成功或部分成功时实际交付的候选数 |
| 四平台结构化列表 | 按请求 `size` 检查最高可能用量 | 按当前响应实际返回的 `items` 数 |

不能以匹配总数 `total` 计算费用，也不能以 `limit` / `size` 作为最终扣费数量。价格与扣费由后端 Billing 负责，Skill 不自行计算或扣费。

| 字段 / 状态 | 含义与处理 |
|------|------|
| `meta.billing_operation_id` | 本次独立计费操作号，不是 `request_id`；核对本次用量时保留 |
| `meta.billing_status=pending_settlement` | 业务结果已交付，积分仍待结算；不代表业务失败 |
| `meta.credits_consumed=null` | 尚未取得已结算积分数，不是扣了 0；不将空值转换为 0 |
| `meta.credits_remaining` | 待结算时是准入检查余额，不是扣款后的余额；`-1` 表示未提供，不表示无限 |
| `meta.billable_units` | 本次实际交付的计费项数，不是价格或已扣积分 |
| `meta.billing_status=recording_failed` | 用量登记失败，需要核对；不代表业务查询失败或免费 |

`pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。缺失计费字段也不能据此推断免费。

`429` 只按有效 `Retry-After` 提示等待；未提供有效值时不编造时间，不自动重试或更换 Key。服务端已具备策略限流链路，是否启用及阈值以目标环境配置为准。

## total 语义（结构化列表）

`data.total` / `data.pages` / `meta.total` 仅在激活 2 个以上原生筛选条件时返回数值，否则 `null`（不代表 0 条）。

## 响应解析顺序

1. 看顶层 `success`；为 false 看 `error.code`/`message`。
2. 自然语言搜索 / 相似达人：看 `data.status` 与 `data.errors`（见 error-codes.md 的状态表）。
3. 结构化列表 / 品牌合作：看 `data.items` 是否非空。
4. 上述六接口保留并解释计费 `meta`；结算状态与业务状态分别判断，不因待结算或用量登记失败重跑。
5. 只用接口实际返回的字段展示，不编造。

> 完整字段与各链路参数见 `discovery/creator-search/SKILL.md` 与 `discovery/creator-lookalike/SKILL.md`；本文件只做端点与协议索引。

## 邮件建联接口

邮件操作均为 POST JSON，前缀 `/openapi/v1/outreach`，请求头带 `Content-Type: application/json` 与 `X-API-Key`。地址通过 `SCOUT_API_BASE_URL` 配置为宿主根地址或 `/openapi` 挂载地址；Key 从受保护的 `SCOUT_API_KEY` 配置读取，不写入文档、源码、命令参数或日志。

| 脚本 | 路径后缀 | scope | 成功 HTTP |
| --- | --- | --- | --- |
| outreach_send.mjs | /first-emails/send | creator:outreach:send | 201 |
| outreach_reply.mjs | /replies/send | creator:outreach:send | 201 |
| outreach_status.mjs | /sends/status | creator:outreach:read | 200 |
| outreach_thread.mjs | /threads/get | creator:outreach:read | 200 |
| outreach_template.mjs | /first-emails/template | creator:outreach:read | 200 |
| outreach_preview.mjs | /first-emails/preview | creator:outreach:read | 200 |
| outreach_generate.mjs | /first-emails/generate | creator:outreach:send | 200 |

send 不隐含 read，完整使用需要两项 scope。API Key 和操作 scope 始终校验；只有 `billing.backend=influxai` 模式额外检查 `creator.outreach` 产品权益，`legacy` 模式不检查该新权益。身份由 Key 解析，不传 user_id、邮箱身份或渠道配置。没有邮件 MCP 入口。

使用流程、请求字段与示例见 [邮件子 Skill](../outreach/creator-outreach/SKILL.md#参数说明)；错误与重试见 [错误码参考](error-codes.md#邮件建联错误与重试)。

### 邮件响应外壳与结果

所有可解析结果保持 `{"success":true,"data":{},"error":null,"meta":{}}` OpenAPIResponse 外壳，不包 CommonResult。失败 error 含 integer code 与安全 message，meta.request_id 仅供诊断，可能为空；允许通用 meta 增加字段。meta credits/quota 默认值不是邮件余额、可发配额或结算。

首封 data 必有 campaign_id、requested_count≥1、sent_count≥0、failed_count≥0；scheduled_count/pending_count 默认 0，successful_campaign_creator_ids / pending_campaign_creator_ids / failed_campaign_creator_ids 默认 []，items 默认 []，error_message 默认 null。计数来自服务端，不能从 items 重算：items 只含本轮新增成功，历史恢复可能 sent_count>0 且 items=[]。

首封 items 每项含 campaign_creator_id、send_record_id、ledger_record_id（三者 string）、platform_thread_id、delivery_status，idempotent_hit 默认 false。回复 data 有相同三种业务 ID，加 platform_send_id、platform_thread_id、platform_message_id、delivery_status 与 idempotent_hit。不同引用不得互换。

`201 / success=true / error=null` 可以同时有部分或全部未完成、pending；不能只看外壳或 items。CLI 成功 stdout 保留原外壳，stderr 给状态提示；退出 0 是可解析业务结果（含预约和空态），1 是本地/HTTP/协议错误，2 是首封含失败或待处理项、或回复状态未确认 sent/delivered。退出码都不表示送达。

| delivery_status | 解释 |
| --- | --- |
| sending | 处理中 |
| scheduled | 已预约，尚未发送 |
| cancelled | 该记录已取消，不承诺其他动作一起撤回 |
| sent | 已发送，不等于已送达 |
| delivered | 已送达，不等于已打开或回复 |
| bounced / complained | 退信 / 投诉，不自动继续发送 |
| failed | 底层标记失败，不能据此保证未提交或安全重发 |

pending 是批次分类。未知状态保留原值，不当作成功。模拟 transport 的结果会在 stderr 标注“模拟发送／模拟预约”或“模拟结果”；模拟回执不构成真实发送记录。
