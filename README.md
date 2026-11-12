# Influx AI Skills

Influx AI 的 AI Agent Skills 仓库，当前提供达人发现与邮件建联能力。每个一级 Skill 目录都是一个可独立安装的完整 Skill。当前版本为 **0.3.0 / preview**。

## Skills 目录

| Skill | 版本 | 主要能力 | 文档 |
|-------|------|----------|------|
| influx-ai | 0.3.0 · preview | 自然语言/结构化达人检索、相似达人、品牌合作与实时提及、邮件建联 | [查看说明](influx-ai/README.md) |

## 安装

安装 influx-ai：

```bash
npx skills add xizi-9527/skills --skill influx-ai
```

安装前可查看仓库中可发现的 Skills：

```bash
npx skills add xizi-9527/skills --list
```

当前仓库只公开一个完整 Skill，也可以运行：

```bash
npx skills add xizi-9527/skills
```

也可以告诉支持 GitHub Skill 安装的 Agent：

> 请从 GitHub 仓库 xizi-9527/skills 安装 influx-ai Skill。

检查及更新已安装内容：

```bash
npx skills check
npx skills update
```

这些命令可能涵盖其他已安装 Skill。只更新本包时，可重新运行本页的安装命令并按提示确认。

## 运行要求

- Skill 脚本要求 Node.js 20.6+，使用内置模块，无需额外运行依赖。本机验证使用 Node.js 24.19.0。
- 安装工具有独立要求：本次核对的 skills@1.7.6 要求 Node.js >=22.20.0；后续版本以工具自身要求为准。
- 可访问目标 Scout OpenAPI 的网络环境。
- 用户自己的有效 SCOUT_API_KEY，以及由服务管理员提供的正式服务根地址。

在受保护的运行环境配置 SCOUT_API_BASE_URL 与 SCOUT_API_KEY，详见 [配置说明](influx-ai/README.md#2-配置)。服务根地址不附加 /openapi。脚本经 X-API-Key 请求头认证，缺少 Key 时在本地报错。正式服务地址与 Key 申请入口尚未确定，不提供虚构地址。

安装后直接在 Agent 中描述需求，例如“找 20 位美国 TikTok 跑步达人”或“找和指定账号相似的达人”。邮件操作需提供实际业务引用并遵守发送确认流程。

## 仓库结构

```text
skills/
├── README.md
├── LICENSE
└── influx-ai/
    ├── SKILL.md
    ├── LICENSE
    ├── README.md
    ├── CHANGELOG.md
    ├── skill.json
    ├── skill-manifest.json
    ├── discovery/
    ├── outreach/
    ├── scripts/
    └── references/
```

一级 Skill 目录中的 SKILL.md 是安装与发现入口；内部其他 SKILL.md 用于能力路由，不单独安装。安装完整 influx-ai 包以保留共享脚本和相对引用。

维护者可对 scripts/*.mjs 执行 node --check，检查本地链接、文件清单与 SHA-256。skill-manifest.json 用于本项目完整性校验，不是 skills CLI 的复制过滤规则。内部测试和联调记录不随安装包发布。

## 安全说明

- 不要将真实 SCOUT_API_KEY、环境配置或业务执行记录提交到仓库或公开日志；使用环境变量或平台密钥管理。
- Key、操作 scope 与服务端业务授权分别校验，具体可用性以目标服务实现为准。积分结算和限流由服务端负责。
- 用户文案、Agent 起草和 Scout 模板均需在提交发送前展示目标、主题、完整正文和发送模式，并取得用户确认。prepare 不发送；confirm 才可能发送或预约。
- 超时或结果未知时不自动换幂等键重发；sent 不代表 delivered。
- preview 表示当前仍需按目标环境验证。Skill 文件发布不代表服务已部署、实际扣费或邮件送达已验收。

## 许可

本仓库的 Skill 脚本及文档采用 [MIT No Attribution（MIT-0）](LICENSE) 协议，允许使用、修改及再分发，无需保留署名。安装包内附带同一协议。

Scout API 服务的访问权限、积分及计费由服务端独立管理，使用 API 仍需有效授权。
