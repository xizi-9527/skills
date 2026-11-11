# 语言代码映射表

用户说中文语言名时，agent 需要转换为 ISO 639-1 代码再传给 Scout。

传入位置：
- 结构化列表（`list_creators.mjs`）：
  - 达人内容语言写入 `language_code`（多选逗号分隔，不区分大小写，如 `en,zh`）。
  - 受众语言字段按平台不同：TikTok/Twitter 用 `audience_language_code_list`，Instagram 用 `audience_language_list`，YouTube 用 `audience_language_code_list`。
- 自然语言搜索 / 相似达人：语言不是独立入参，只能用返回达人的 `language` / `language_code` 字段在结果端判断。

## 常用语言

| 代码 | 中文 | English |
|------|------|---------|
| en | 英语 | English |
| zh | 中文 | Chinese |
| es | 西班牙语 | Spanish |
| fr | 法语 | French |
| de | 德语 | German |
| ja | 日语 | Japanese |
| ko | 韩语 | Korean |
| pt | 葡萄牙语 | Portuguese |
| ru | 俄语 | Russian |
| ar | 阿拉伯语 | Arabic |
| hi | 印地语 | Hindi |
| it | 意大利语 | Italian |
| nl | 荷兰语 | Dutch |
| sv | 瑞典语 | Swedish |
| no | 挪威语 | Norwegian |
| da | 丹麦语 | Danish |
| fi | 芬兰语 | Finnish |
| pl | 波兰语 | Polish |
| tr | 土耳其语 | Turkish |
| th | 泰语 | Thai |
| vi | 越南语 | Vietnamese |
| id | 印度尼西亚语 | Indonesian |
| ms | 马来语 | Malay |
| tl | 他加禄语 | Tagalog |
| uk | 乌克兰语 | Ukrainian |
| el | 希腊语 | Greek |
| cs | 捷克语 | Czech |
| ro | 罗马尼亚语 | Romanian |
| hu | 匈牙利语 | Hungarian |
| he | 希伯来语 | Hebrew |
| bn | 孟加拉语 | Bengali |
| ur | 乌尔都语 | Urdu |
| sw | 斯瓦希里语 | Swahili |
| km | 高棉语 | Khmer |
| my | 缅甸语 | Burmese |
| lo | 老挝语 | Lao |

> 多语言用逗号分隔传入（结构化列表），如 `en,zh`。
