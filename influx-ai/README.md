# Influx AI 达人发现与邮件建联 Skill

> **当前版本**：0.3.0 · **运行环境**：Node.js 20.6+ · **发布渠道**：preview

`influx-ai` 通过 Scout OpenAPI 提供达人发现与邮件建联。支持自然语言/结构化检索、相似达人、品牌合作与实时提及，以及首封发送、已有会话回复、发送台账和内容准备。

## v0.3.0 更新

- 新增邮件首封、批量发送、Smart Send 预约、已有会话回复，以及台账、会话和内容准备。
- 支持用户文案、Agent 起草和 Scout 模板三种内容来源；发送前展示目标和完整内容，经用户确认后提交。
- 完善独立仓库安装说明与脚本定位方式，保留 preview 状态。
- 同步六个达人检索接口的认证、积分状态及错误提示；保留计费回执，不因待结算或登记失败重复搜索。

完整更新记录请查看 [CHANGELOG](CHANGELOG.md)。

## 主要能力

达人发现位于 `discovery/`，邮件建联位于 `outreach/`：

| 子 Skill | 能力 | 入口脚本 |
|----------|------|----------|
| creator-nl-search | 自然语言找达人：按内容方向/人设/风格/场景/产品适配描述搜索，含 `seed_creators` 参考账号 | `scripts/search_creators_nl.mjs` |
| creator-search | 结构化分平台筛选列表 / 按品牌找公开合作达人 / 实时品牌提及采集 | `scripts/list_creators.mjs`、`scripts/find_brand_collaboration_creators.mjs`、实时提及脚本（submit/poll/status/results） |
| creator-lookalike | 根据种子达人查找同平台相似达人 | `scripts/find_lookalike.mjs` |
| creator-outreach | 首封/批量/Smart Send、回复、台账/会话、模板/预览/生成 | `scripts/outreach_*.mjs` 七个入口 |

## 平台支持

| 能力 | TikTok | Instagram | YouTube | Twitter (X) |
|------|:------:|:---------:|:-------:|:-----------:|
| 自然语言搜索（creator-nl-search） | ✅ | ✅ | ✅ | — |
| 结构化列表（creator-search） | ✅ | ✅ | ✅ | ✅ |
| 相似达人（creator-lookalike） | ✅ | ✅ | ✅ | — |
| 品牌合作达人（creator-search） | ✅ | ✅ | — | — |
| 实时品牌提及采集（creator-search） | ✅ | ✅ | ✅ | — |

品牌合作达人支持 TikTok 和 Instagram（TikTok 早前因 Scout 原生仓储的 GROUP BY 问题被阻断，现已修复、可正常检索）。

## 快速开始

### 1. 安装

通过以下命令安装完整 influx-ai：

```bash
npx skills add xizi-9527/skills --skill influx-ai
```

安装时选择父 Skill influx-ai，子 Skill 和共享脚本作为完整包使用，不单独安装 creator-outreach。

查看仓库可用 Skill 和当前项目已安装内容：

```bash
npx skills add xizi-9527/skills --list
npx skills list
```

安装工具与脚本运行要求分别计算：本次核对的 skills@1.7.6 要求 Node.js >=22.20.0；本 Skill 脚本要求 Node.js >=20.6，使用 Node 内置模块，无需额外安装运行依赖。使用后续 CLI 版本时，以其实际要求为准。

### 2. 配置

influx-ai 调用 Scout OpenAPI，需配置服务地址与用户自己的 API Key。正式服务根地址及 Key 申请方式由服务管理员提供，尚未确定的地址使用 `<SCOUT_SERVICE_ORIGIN>` 待替换项；不要直接执行占位配置。脚本不自动读取开发电脑上的凭据文件或 .env：

```powershell
# Windows PowerShell
$env:SCOUT_API_BASE_URL = "<SCOUT_SERVICE_ORIGIN>"
$env:SCOUT_API_KEY = "<your-scout-api-key>"
```

```bash
# Linux / macOS
export SCOUT_API_BASE_URL='<SCOUT_SERVICE_ORIGIN>'
export SCOUT_API_KEY='<your-scout-api-key>'
```

统一使用服务宿主根地址，不附加 `/openapi`；脚本会自动拼接 `/openapi/v1/...` 路径（OpenAPI 子应用挂载在 `/openapi`），并对每次请求附加 `X-API-Key: <SCOUT_API_KEY>`。身份由后端根据 Key 解析，无需传用户 ID；缺少 `SCOUT_API_KEY` 时脚本会在本地直接报错、不发请求。Key 属于机密，仅放环境变量，勿写入代码、命令参数或日志；多用户场景各自使用自己的 Key。

### 3. 在 AI Agent 中使用

安装到支持 `SKILL.md` 的 AI Agent 环境后，用自然语言描述任务即可，例如：

```text
帮我找 20 位美国 TikTok 跑步达人，粉丝数不少于 1 万。
```

```text
按粉丝数从高到低列出粉丝 1 万到 50 万的美国 Instagram 达人，第一页 20 条。
```

```text
找和 khaby.lame 相似的 TikTok 达人，返回 10 个。
```

```text
找在 Instagram 上和 fentybeauty 有公开合作的达人，附 2 条证据视频。
```

Agent 会根据意图路由到对应子 Skill（见 [SKILL.md](SKILL.md) 的意图路由与路由索引）。

## 脚本调用示例

所有脚本位于 [`scripts`](scripts/)，通过单个 JSON 参数接收输入。以下命令从已安装的 influx-ai 根目录执行，该目录包含 SKILL.md、README.md 和 scripts/。Agent 应以实际安装的 Skill 位置定位脚本，不依赖开发仓库工作目录。子 Skill 表格与 Markdown 链接中的相对路径以对应文件目录为基准。

### 自然语言搜索

```bash
node scripts/search_creators_nl.mjs '{"query":"美国跑步和马拉松训练达人","platforms":["tiktok"],"hard_filters":{"countries":["US"],"follower_min":10000},"limit":20}'
```

### 结构化列表

```bash
node scripts/list_creators.mjs '{"platform":"tiktok","country_code":"US","followers_cnt_gte":10000,"followers_cnt_lte":500000,"page":1,"size":20,"sort_field":"followers_cnt","sort_order":"desc"}'
```

### 相似达人

```bash
node scripts/find_lookalike.mjs '{"username":"khaby.lame","platform":"tiktok","limit":10}'
```

### 品牌合作达人

```bash
node scripts/find_brand_collaboration_creators.mjs '{"brand_name":"fentybeauty","platforms":["instagram"],"limit":20,"evidence_per_creator":2}'
```

## 邮件建联

详见 [邮件 Skill](outreach/creator-outreach/SKILL.md) 与 [接口参考](references/api-reference.md#邮件建联接口)。内容可以由当前 Agent 起草、由用户提供或从 Scout 模板选择；全部作为 custom 内容，经用户确认后发送。需要已有 Campaign / Campaign Creator ID，搜索 uid 或邮箱不能替代。

邮件需分别具备 `creator:outreach:read` 和 `creator:outreach:send` scope（send 不隐含 read）。API Key 与 scope 始终校验；只有 `influxai` Billing 模式额外检查 `creator.outreach` 产品权益，`legacy` 模式不检查该新权益。发送/回复/预约必须先展示目标、主题、完整正文及模式；目标或内容改变后重新确认。

从已安装的 influx-ai 根目录先生成内容预览（不访问网络）：

```bash
node scripts/outreach_send.mjs --input-file <本地请求JSON> --prepare
```

取得用户确认后才用同一请求及返回的 confirmation_id 执行 --confirm；摘要本身不能代替用户授权。smart 会提交预约动作。超时和上游故障不自动换键重发。201/success=true 不保证全员完成或送达，应读取 sent/scheduled/pending/failed 及对应 ID 列表，不能以 items 数量重算。

邮件流程已进行隔离协议验证，使用 transport 替身，所有发送、预约、回复和 Scout 模型操作均为模拟。实际地址、Key、scope 和业务引用需另行配置；仅 influxai Billing 模式额外检查产品权益。模拟通过不表示部署或真实送达。

## 项目结构

```text
influx-ai/
├── SKILL.md                           # Skill 入口（意图路由、生态总览、路由索引）
├── skill.json                         # 版本与运行配置
├── skill-manifest.json                # 文件清单
├── README.md                          # 本文档
├── CHANGELOG.md                       # 版本更新记录
├── .gitignore                         # 本地文件排除规则
├── discovery/                         # 达人发现子 Skill
│   ├── creator-nl-search/SKILL.md     # 自然语言搜索（含 seed_creators）
│   ├── creator-search/SKILL.md        # 结构化列表 / 品牌合作 / 实时提及
│   └── creator-lookalike/SKILL.md     # 相似达人
├── outreach/creator-outreach/SKILL.md  # 邮件建联
├── references/                        # API、错误码与平台参数等通用资料
└── scripts/                           # Node.js 执行脚本
    ├── search_creators_nl.mjs
    ├── list_creators.mjs
    ├── find_brand_collaboration_creators.mjs
    ├── find_lookalike.mjs
    ├── submit_brand_realtime_mentions.mjs
    ├── poll_brand_realtime_mentions.mjs
    ├── get_brand_realtime_mention_status.mjs
    ├── get_brand_realtime_mention_results.mjs
    ├── _discovery_response.mjs          # 达人发现响应提示共享模块
    ├── _outreach_client.mjs / _outreach_cli.mjs
    └── outreach_{send,reply,status,thread,template,preview,generate}.mjs
```

## 输出口径与边界

- 所有脚本原样输出 Scout 的 `success / data / error / meta` 包装。`success: true` 只表示调用完成，业务结果需看 `data`（如 `data.status`、`data.errors`、`data.items`）。
- 只使用接口实际返回的字段展示，不补造粉丝数、邮箱、受众画像或相似度。
- 达人发现每次用户请求默认只调用一次对应接口，不自动扩大数量、放宽条件、翻页或切换平台；需要继续时先征得用户同意。
- 接口无结果或不可用时，不未经用户同意改用公开网页搜索。
- 自然语言搜索、相似达人按 `limit`、四平台结构化列表按 `size` 检查最高可能用量；实际登记候选数 / 当前页 `items` 数。不能用 `total` 或 `limit` / `size` 当最终扣费数量，价格与扣费由后端 Billing 负责。
- 上述六接口的 `meta.billing_operation_id` 是独立计费操作号，不是 `request_id`；`pending_settlement` 表示已返回业务结果但积分待结算，`credits_consumed=null` 不是 0。待结算的 `credits_remaining` 是准入余额，`-1` 表示未提供；`billable_units` 是实际交付项数。`recording_failed` 表示用量登记失败需核对，不代表业务查询失败。
- `pending_settlement` 或 `recording_failed` 不触发重复搜索。重新执行会产生新的独立计费操作，不能代替查询原回执；价格与扣费由后端 Billing 负责，Skill 不自行计算或执行扣费。本段计费口径仅适用于上述六接口，字段详见 [API 参考](references/api-reference.md)。

## 参考文档

- [API 接口参考](references/api-reference.md)
- [平台参数说明](references/platform-params.md)
- [行业类目](references/industry-categories.md)
- [国家代码](references/country-codes.md)
- [语言代码](references/language-codes.md)
- [错误码](references/error-codes.md)

## 版本更新

使用 skills CLI 检查和更新已安装内容：

```bash
npx skills check
npx skills update
```

上述命令可能涵盖其他已安装 Skill。仅更新本包时可重新运行本页安装命令并按提示确认。安装与更新只同步 Skill 文件，不会部署 Scout 服务。

## 发布维护

开发维护使用隔离协议测试阻断真实网络；本发布仓库不包含内部测试与联调记录。实际地址、Key、scope 和业务引用需由目标服务提供；模拟通过不代表已部署、已发信或已送达。

版本变化维护在 CHANGELOG.md。skill-manifest.json 仅记录本项目文件与 SHA-256，供自身完整性校验；skills CLI 不以它作为复制过滤规则。本地交流资料已放在 Skill 安装目录之外，不纳入安装包；后续联调记录也应保存在安装目录外。

本地检查可执行 `node --check scripts/outreach_send.mjs` 等语法检查，并核对包内链接和 manifest 哈希；检查过程无需调用真实业务接口。安装来源为 xizi-9527/skills；正式服务根地址和 Key 申请方式仍待确定。当前保留 0.3.0 / preview，安装验证不代表目标服务已部署或所有业务能力已验收。

## 安全说明

- 调用需配置 `SCOUT_API_KEY`，每次请求经 `X-API-Key` 头认证。Key 通过环境变量或平台密钥管理配置，不要写入代码仓库、命令参数或公开日志；多用户场景各自使用自己的 Key。
- 自然语言搜索、相似达人及四平台结构化列表共六个接口要求 `creator:search`。后端分别检查 Key 有效性、Key scope、服务端 scope 策略和用户 `Scout Discover` 权限；有 scope 不等于有业务权限。不需要 JWT、用户 ID、自报角色或额外 scope 请求头，普通搜索无需 `billing:read`，Skill 不自动创建 Key。
- 上述六接口：`401` 检查 Key；`402/40201` 且 `insufficient_credits` 提示积分不足；`403` 检查 scope、服务端策略、用户权限或资源归属，不统一解释成缺套餐；`429` 仅按有效 `Retry-After` 提示等待，无有效值不编造时间、不更换 Key 绕过限流；`503` 提示服务或依赖不可用，不认定 Key 无效。
- 目标服务是否部署、`creator:search` 策略是否启用、用户权限和钱包是否可用需由服务侧确认。限流是否启用及阈值以目标环境配置为准；preview 和本地隔离验证不代表部署或实际扣费联调通过。
- 品牌合作达人返回的是公开合作/合拍证据，不等于已确认的付费合作。

## 许可

本包的 Skill 脚本及文档采用 [MIT No Attribution（MIT-0）](LICENSE) 协议，允许使用、修改及再分发，无需保留署名。

Scout API 服务的访问权限、积分及计费由服务端独立管理，使用 API 仍需有效授权。
