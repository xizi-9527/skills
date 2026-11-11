---
name: influx-ai
description: |
  达人发现 Skill。支持自然语言查找 TikTok、Instagram、YouTube 达人，按结构化筛选条件分平台浏览
  TikTok/Instagram/YouTube/Twitter 达人库，按品牌查找公开合作达人，以及根据种子达人查找相似达人。
  支持达人邮件建联：首封、回复、Smart Send 预约、台账/会话查询及首封内容准备，调用 Scout OpenAPI。
compatibility: Node.js 20.6+
metadata:
  version: "0.3.0"
---

# Influx AI

## 强制执行边界

根据用户的达人发现或邮件建联请求，选择对应子 Skill 和脚本。邮件发送、回复和预约须展示目标、主题、完整正文及模式，经用户确认后提交。接口无结果或不可用时，不未经用户同意改用公开网页搜索。

## 意图路由

- 发合作邮件、回复已有达人会话、查询邮件台账/沟通历史、读取/准备首封内容：加载 `outreach/creator-outreach/SKILL.md`。支持本地 Agent 起草、用户文案及 Scout 模板；需要已有活动/活动达人关系，搜索 uid 或邮箱不能直接发送。
- 用**自然语言描述**内容方向/人设/风格/场景/产品适配找达人：加载 `discovery/creator-nl-search/SKILL.md`，调用 `scripts/search_creators_nl.mjs`。
- 按**结构化条件**（国家/粉丝/互动/受众画像等，可排序可翻页）找达人，或找**品牌合作达人**、做**实时品牌提及采集**：加载 `discovery/creator-search/SKILL.md`，按意图调用 `scripts/list_creators.mjs`、`scripts/find_brand_collaboration_creators.mjs` 或实时提及脚本。
- 找**相似达人**：加载 `discovery/creator-lookalike/SKILL.md`，调用 `scripts/find_lookalike.mjs`。

种子达人在场时的细分（关键：看种子是"检索主锚点"还是"辅助参考"）：
- 用户主要意图是"与某个种子达人相似/类似/同类型/lookalike"：路由 `creator-lookalike`；额外的国家、粉丝、邮箱、内容要求作为其收敛条件，不因带筛选条件而改走别的 skill。
- 用户主要按自然语言描述找达人、仅把某个账号作为风格或内容参考：路由 `creator-nl-search`，并使用 `seed_creators`。
- 用户明确要找相似达人但尚未提供种子：仍路由 `creator-lookalike`，并先询问种子达人（触发条件 ≠ 执行条件）。
- "这种/刚才那个达人"等指代：若指代可解析为前文某个具体达人 → `creator-lookalike`；若"这种"仅指品类/画像 → `creator-nl-search`。

描述型 vs 结构化型的取舍：用户用内容方向或人设描述目标达人 → `creator-nl-search`（自然语言搜索）；用户给出可直接映射字段的结构化区间条件、需要可排序可翻页结果 → `creator-search`（结构化列表）；用户要找和某品牌合作过的达人 / 近期提及 → `creator-search`（品牌合作 / 实时提及）。

## Brief 澄清与过程输出质量

- 自然语言搜索（creator-nl-search）需明确平台和内容方向描述；缺少平台时先询问。支持 TikTok/Instagram/YouTube。
- 结构化列表 / 品牌合作 / 实时提及（creator-search）需明确平台和筛选条件或品牌名；缺少平台时先询问。结构化列表额外支持 Twitter 且一次只查单一平台，品牌合作支持 TikTok / Instagram、需明确品牌名。
- 相似达人（creator-lookalike）至少需要用户名、主页链接或 Scout 达人标识之一。

输出只使用接口实际返回的达人信息，不补造字段。

## 搜索预算与静默查询边界

达人发现每次用户请求默认只调用一次对应接口。不自动扩大数量、放宽条件、翻页或切换平台/链路；再次查询前先告知用户。

自然语言搜索、相似达人及四平台结构化列表已接入积分：按请求 `limit` / `size` 做最高可能用量准入，按实际交付候选 / 当前页 `items` 数登记用量，不能用 `total` 或请求数量推算最终费用。`pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。计费字段解释见 [API 参考](references/api-reference.md)。

## 生态总览

| 领域 | 子 Skill | 能力描述 |
|------|----------|----------|
| discovery | creator-nl-search | 自然语言找达人：按内容方向/人设/风格/场景/产品适配描述搜索（TikTok/Instagram/YouTube），含 `seed_creators` 参考账号 |
| discovery | creator-search | 结构化分平台筛选列表（TikTok/Instagram/YouTube/Twitter）、按品牌找公开合作达人、实时品牌提及采集 |
| discovery | creator-lookalike | 根据 Scout 已收录的种子达人查找同平台相似达人 |
| outreach | creator-outreach | 首封/批量/Smart Send、回复、台账/会话及首封模板/预览/生成 |

## 路由索引

| 子 Skill | 中文关键词 | 英文关键词 | 路径 |
|----------|-----------|-----------|------|
| creator-nl-search | 自然语言找达人、描述型找达人、按内容方向/人设/风格/场景找达人、参考某账号找相近达人 | natural-language creator search, semantic creator discovery, reference-account search | `discovery/creator-nl-search/SKILL.md` |
| creator-search | 结构化筛达人、达人列表、按国家/粉丝/互动/受众画像筛、品牌合作达人、合作过的达人、实时品牌提及 | structured filters, per-platform list, brand collaboration creators, realtime brand mentions | `discovery/creator-search/SKILL.md` |
| creator-lookalike | 相似达人、类似达人、找同类型达人 | similar creators, lookalike | `discovery/creator-lookalike/SKILL.md` |
| creator-outreach | 发合作邮件、回复达人、邮件状态、沟通历史、首封模板、Agent 起草 | creator email outreach, reply, Smart Send, email template | `outreach/creator-outreach/SKILL.md` |

## Prerequisites

- Node.js 20.6 或更高版本。
- 可访问 Scout OpenAPI 服务；通过 `SCOUT_API_BASE_URL` 配置地址（OpenAPI 挂载在 `/openapi`，脚本已拼接 `/openapi/v1/...` 路径）。
- 配置 `SCOUT_API_KEY`：每次请求都会通过 `X-API-Key` 头认证。用户身份由后端根据 Key 解析，无需传用户 ID。缺少该变量时脚本会在本地直接报错、不发请求。Key 属于机密，仅放在环境变量里，勿写入代码、命令参数或日志；多用户场景各自使用自己的 Key。

自然语言搜索、相似达人及四平台结构化列表共六个接口要求 `creator:search`。后端分别检查 Key 有效性、Key scope、服务端 scope 策略和用户 `Scout Discover` 权限；有 scope 不等于有业务权限。不需要 JWT、用户 ID、自报角色或额外 scope 请求头，普通搜索无需 `billing:read`，Skill 不自动创建 Key。

邮件需分别授权 `creator:outreach:read` 和 `creator:outreach:send`，send 不隐含 read。API Key 与操作 scope 始终校验；只有 `influxai` Billing 模式额外校验 `creator.outreach` 产品权益，`legacy` 模式不检查该新权益。邮件参数见 [邮件子 Skill](outreach/creator-outreach/SKILL.md)，响应见 [API 参考](references/api-reference.md#邮件建联接口)，错误处理见 [错误码参考](references/error-codes.md#邮件建联错误与重试)。

## Error Handling

脚本在 HTTP 错误、网络错误、参数错误或检索失败时以非零状态退出。达人发现外层 `error.code` 约定为 `状态码*100+1`（如 HTTP 422 → `42201`）。上述六个接口：`401` 检查 Key 缺失、无效、过期或撤销；`402` 且 `error.code=40201`、`error.message=insufficient_credits` 表示积分不足；`403` 检查 scope、服务端策略、用户权限或资源归属，不统一解释成缺套餐；`429` 只按有效 `Retry-After` 提示等待，没有就不编造时间，不更换 Key 绕过限流；`503` 表示服务或依赖暂不可用，不表示 Key 一定无效。HTTP 200 / `success:true` 仍需检查 `data.status`、`data.errors` 及实际结果，区分空结果、部分成功和业务失败。详见 [错误码参考](references/error-codes.md)；邮件沿用 [错误码参考中的邮件说明](references/error-codes.md#邮件建联错误与重试)。

## References

子 Skill：
- [自然语言找达人子 Skill（NL 搜索 / seed_creators）](discovery/creator-nl-search/SKILL.md)
- [达人搜索子 Skill（结构化列表 / 品牌合作 / 实时提及）](discovery/creator-search/SKILL.md)
- [相似达人子 Skill](discovery/creator-lookalike/SKILL.md)
- [邮件建联子 Skill](outreach/creator-outreach/SKILL.md)

参考资料（`references/`）：
- [API 参考（端点 / 协议 / 响应结构）](references/api-reference.md)
- [平台参数速查（结构化列表字段）](references/platform-params.md)
- [错误码与状态参考](references/error-codes.md)
- [国家代码映射表](references/country-codes.md)
- [语言代码映射表](references/language-codes.md)
- [行业类目参考](references/industry-categories.md)
