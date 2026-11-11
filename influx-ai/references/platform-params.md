# 平台参数速查（结构化列表）

本文件速查结构化列表（`GET /openapi/v1/creators/{platform}/list`，脚本 `list_creators.mjs`）的**筛选字段**与**返回字段（按服务等级）**。字段名以 Scout OpenAPI 实际契约为准（与旧 CreatiVault 后端字段名不同，不要混用）。完整说明与自然语言搜索/品牌合作参数见 `discovery/creator-search/SKILL.md`。

## 取值规则

- boolean：请求入参用 JSON `true` / `false`，不要用 `"true"` / `1`。
- 区间：以 `_gte`（下限）/ `_lte`（上限）成对出现。
- 多选：逗号分隔的字符串，如 `country_code:"US,CA"`、`language_code:"en,zh"`。国家代码见 [country-codes.md](country-codes.md)，语言代码见 [language-codes.md](language-codes.md)。
- 日期：`YYYY-MM-DD`。
- 分页：`page`（1~500，默认 1）、`size`（1~100，默认 50）。
- 排序：`sort_field` + `sort_order`（`asc`/`desc`，默认 `desc`）。
- `keyword` / `username_keywords` / `must_hashtags` 是**词面匹配**，非语义；要按语义找用自然语言搜索（`discovery/creator-nl-search/SKILL.md`）。
- `is_verified`：`1`=已认证，`0`=未认证。
- `service_level`（S1/S2/S3，默认 S2）：**结构化列表里真实裁剪返回字段**（等级越高字段越多，S3 含受众分布）。只按本次实际返回字段展示，未返回字段为 null。逐字段等级见下方「搜索结果返回字段（按服务等级）」。
- `lang`（cn/en，默认 en）：翻译性别/年龄字段；国家/语言/类目字典当前为空，保留原始码值。

## 响应 item 数值/布尔值字符串化（结构化列表专有）

**结构化列表 `data.items` 里的数值和布尔值返回为字符串**，例如 `followers_count:"12000"`、`has_email:"true"`、`engagement_rate:"0.0925"`；受众分布字典内的数值也是字符串。`null`、列表、字典结构保留原类型。`data.page/size/total/pages` 与 meta 分页数值仍是数字。
→ 任何数值比较、排序判断、粉丝星级分档、互动率 ×100 等计算前，必须先 `Number(...)` 解析。其它三条链路（自然语言/相似/品牌合作）不做这个字符串化。

> `data.total` / `data.pages` / `meta.total` 只有当本次查询激活了 2 个以上原生筛选条件时才返回具体数值，否则为 `null`（不代表 0 条，只代表未计算精确总数）。

---

# 一、筛选字段（请求参数）

## 四平台通用筛选字段

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 话题/内容关键词，逗号分隔多词按任一命中（词面匹配） |
| `username_keywords` | string | 用户名/昵称检索，逗号分隔多关键词 |
| `must_hashtags` | string | 强话题标签，逗号分隔，全部需命中 |
| `country_code` | string | 国家代码，多选逗号分隔，如 `CA,MX,US` |
| `gender` | string | 性别 |
| `has_email` | boolean | 是否有邮箱 |
| `has_whatsapp` | boolean | 是否有 WhatsApp |
| `industry` | string | 行业三级类目，逗号分隔（见 industry-categories.md） |
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
| `service_level` | string | `S1`/`S2`/`S3`，默认 `S2`；真实裁剪返回字段 |
| `lang` | string | `cn`/`en`，默认 `en`；翻译性别/年龄 |

常用 `sort_field`：`followers_cnt`、`last10_avg_video_views_cnt`、`last10_avg_video_interaction_rate`。YouTube 额外支持 `kol_video_cnt`、`kol_video_views_cnt` 及 `*_short`/`*_long` 变体。`sort_field` 传入不支持字段会回落到默认排序。

## TikTok 特有筛选字段

| 参数 | 类型 | 说明 |
|------|------|------|
| `has_mcn` / `has_line` / `has_zalo` | boolean | 是否绑定 MCN / Line / Zalo |
| `product_category_id_array` | string | 带货类目 ID，逗号分隔 |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |
| `last30day_gmv_gte` / `_lte` | number | 近 30 天带货 GMV 区间（仅筛选，不返回数值） |
| `last30day_gpm_gte` / `_lte` | number | 近 30 天 GPM 区间（仅筛选） |
| `last30day_gmv_per_buyer_gte` / `_lte` | number | 近 30 天客单价区间（仅筛选） |
| `last30day_commission_rate_gte` / `_lte` | number | 近 30 天佣金率区间（仅筛选） |

> 近 30 天 GMV/GPM/客单价/佣金率等是**筛选条件**；响应只回 `last30day_gmv_dollar_show` 等展示字段，不保证回具体数值。展示时禁止编造金额。

## Instagram 特有筛选字段

| 参数 | 类型 | 说明 |
|------|------|------|
| `is_top_creator` | boolean | 是否 Amazon 头部带货达人 |
| `is_ai_creator` | boolean | 是否 AI 达人 |
| `audience_language_list` | string | 受众语言，多选逗号分隔 |
| `last10_avg_video_likes_cnt_gte` / `_lte` | number | 近 10 条视频平均点赞数区间 |
| `last_video_views_cnt_gte` / `_lte` | integer | 最近 1 条视频观看数区间 |
| `kol_style_list` | string | 达人风格标签，多选逗号分隔 |

## YouTube 特有筛选字段

| 参数 | 类型 | 说明 |
|------|------|------|
| `is_ai_creator` | boolean | 是否 AI 达人 |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |
| `last10_avg_video_views_cnt_short_gte` / `_lte` | number | 近 10 条短视频平均播放量区间 |
| `last10_avg_video_interaction_rate_short_gte` / `_lte` | number | 近 10 条短视频平均互动率区间 |
| `last10_video_views_per_sub_short_gte` / `_lte` | number | 短视频均播/粉丝比区间 |
| `last10_med_video_views_per_sub_short_gte` / `_lte` | number | 短视频中位播放/粉丝比区间 |

## Twitter 特有筛选字段

| 参数 | 类型 | 说明 |
|------|------|------|
| `has_mcn` | boolean | 是否绑定 MCN |
| `audience_language_code_list` | string | 受众语言，多选逗号分隔 |

> 只传目标平台支持的字段；传入不支持的字段会被接口以 `42201` 拒绝。各平台字段名不完全相同，不要跨平台套用。

---

# 二、搜索结果返回字段（按服务等级）

> 服务等级 `service_level`（S1/S2/S3，默认 S2）**真实裁剪返回字段**：等级越高字段越多。下表「等级」列表示该字段**从哪一级开始返回**（S1 字段在 S2/S3 也返回，依此类推）。只展示本次实际返回的字段，未返回字段为 null。
> **提醒：返回 item 的数值/布尔值是字符串**（见上），比较/计算前先 `Number(...)`。

## S1 / S2 / S3 范围概览

| 等级 | 返回范围（具体列因平台而异） |
|------|------|
| S1 | 账号身份（uid/用户名/昵称/头像/主页）、粉丝等基础计数、联系方式**存在性标识**（has_*）、最近发布时间 |
| S2（默认） | S1 + 国家、性别、语言、表现指标（均播/互动率/播放粉丝比/中位播放）、简介、行业类目、实际联系方式（email/whatsapp/line/zalo/mcn）、带货类目 |
| S3 | S2 + 受众画像（受众女性比例、受众国家、受众语言、受众年龄分布） |

## TikTok 返回字段

| 字段 | 等级 | 说明 |
|------|------|------|
| `uid` | S1 | 达人唯一标识 |
| `username` | S1 | 用户名 |
| `nickname` | S1 | 昵称 |
| `avatar_url` | S1 | 头像链接 |
| `profile_url` | S1 | 主页链接 |
| `followers_count` | S1 | 粉丝数 |
| `likes_count` | S1 | 点赞数 |
| `video_count` | S1 | 视频总数 |
| `has_showcase` | S1 | 是否开通橱窗带货 |
| `has_email` | S1 | 是否有邮箱 |
| `has_mcn` / `has_line` / `has_zalo` | S1 | 是否绑定 MCN / Line / Zalo |
| `last_video_publish_date` | S1 | 最近视频发布日期 |
| `country_code` | S2 | 国家/地区代码 |
| `gender` | S2 | 性别（传 `lang` 时翻译） |
| `avg_views` | S2 | 近 10 条视频平均播放量 |
| `engagement_rate` | S2 | 近 10 条视频平均互动率 |
| `views_per_follower` | S2 | 均播/粉丝比 |
| `is_verified` | S2 | 是否已认证 |
| `last10_video_views_per_sub` | S2 | 近 10 条视频播放量/粉丝比 |
| `last10_med_video_views_cnt` | S2 | 近 10 条视频播放量中位数 |
| `last10_med_video_views_per_sub` | S2 | 近 10 条视频播放量中位数/粉丝比 |
| `product_categories` | S2 | 带货类目列表 |
| `industry_categories` | S2 | 达人领域（三级类目） |
| `bio` | S2 | 个人介绍 |
| `hashtags` | S2 | Hashtag 标签列表 |
| `language` | S2 | 语言 |
| `email` | S2 | 邮箱 |
| `link_whatsapp` / `link_line` / `link_zalo` | S2 | WhatsApp / Line / Zalo |
| `mcn` | S2 | MCN 机构 |
| `audience_female_rate` | S3 | 受众女性比例（百分比，如 "78.65"） |
| `audience_country_code_list` | S3 | 受众国家分布 |
| `audience_language_code_list` | S3 | 受众语言分布 |
| `audience_age_id_list` | S3 | 受众年龄分布（传 `lang` 时翻译为可读标签） |

**TikTok 排序字段**：`followers_cnt`（默认）、`last10_avg_video_views_cnt`、`last10_avg_video_interaction_rate`。

## YouTube 返回字段

| 字段 | 等级 | 说明 |
|------|------|------|
| `uid` | S1 | 达人唯一标识 |
| `username` | S1 | 用户名 |
| `nickname` | S1 | 昵称/频道名 |
| `avatar_url` | S1 | 头像链接 |
| `channel_url` | S1 | 频道链接（YouTube 主页字段，非 `profile_url`） |
| `has_email` | S1 | 是否有邮箱 |
| `has_whatsapp` | S1 | 是否有 WhatsApp |
| `last_video_publish_time` | S1 | 最近视频发布时间 |
| `country_code` | S2 | 国家/地区代码 |
| `language` | S2 | 语言 |
| `gender` | S2 | 性别（传 `lang` 时翻译） |
| `bio` | S2 | 频道简介 |
| `followers_count` | S2 | 订阅数 |
| `video_count` | S2 | 视频数量 |
| `view_count` | S2 | 总观看次数 |
| `avg_views` / `avg_views_short` / `avg_views_long` | S2 | 近 10 条视频平均播放量（全部/短/长） |
| `engagement_rate` / `engagement_rate_short` / `engagement_rate_long` | S2 | 近 10 条视频互动率（全部/短/长） |
| `is_verified` | S2 | 是否已认证 |
| `last10_video_views_per_sub` / `_short` / `_long` | S2 | 近 10 条视频播放量/粉丝比（全部/短/长） |
| `last10_med_video_views_cnt` / `_short` / `_long` | S2 | 近 10 条视频播放量中位数（全部/短/长） |
| `last10_med_video_views_per_sub` / `_short` / `_long` | S2 | 近 10 条视频播放量中位数/粉丝比（全部/短/长） |
| `industry_categories` | S2 | 达人领域（三级类目） |
| `hashtags` | S2 | Hashtag 标签列表 |
| `email` | S2 | 邮箱 |
| `whatsapp` | S2 | WhatsApp |
| `audience_female_rate` | S3 | 受众女性比例（百分比） |
| `audience_country_code_list` | S3 | 受众国家分布 |
| `audience_language_list` | S3 | 受众语言分布（YouTube 用 `audience_language_list`） |
| `audience_age_list` | S3 | 受众年龄分布（YouTube 用 `audience_age_list`；传 `lang` 时翻译） |

## Instagram 返回字段

| 字段 | 等级 | 说明 |
|------|------|------|
| `uid` | S1 | 达人唯一标识 |
| `username` | S1 | 用户名 |
| `nickname` | S1 | 昵称 |
| `avatar_url` | S1 | 头像链接 |
| `profile_url` | S1 | 主页链接 |
| `has_email` | S1 | 是否有邮箱 |
| `has_whatsapp` | S1 | 是否有 WhatsApp |
| `last_video_publish_time` | S1 | 最近视频发布时间 |
| `country_code` | S2 | 国家/地区代码 |
| `language` | S2 | 语言 |
| `gender` | S2 | 性别（传 `lang` 时翻译） |
| `bio` | S2 | 个人介绍 |
| `followers_count` | S2 | 粉丝数 |
| `video_count` | S2 | 视频/帖子数量 |
| `avg_views` | S2 | 近 10 条视频平均播放量 |
| `engagement_rate` | S2 | 近 10 条视频平均互动率 |
| `is_verified` | S2 | 是否已认证 |
| `last10_video_views_per_sub` | S2 | 近 10 条视频播放量/粉丝比 |
| `last10_med_video_views_cnt` | S2 | 近 10 条视频播放量中位数 |
| `last10_med_video_views_per_sub` | S2 | 近 10 条视频播放量中位数/粉丝比 |
| `industry_categories` | S2 | 达人领域（三级类目） |
| `hashtags` | S2 | Hashtag 标签列表 |
| `email` | S2 | 邮箱 |
| `link_whatsapp` | S2 | WhatsApp |
| `audience_female_rate` | S3 | 受众女性比例（百分比） |
| `audience_country_code_list` | S3 | 受众国家分布 |
| `audience_language_code_list` | S3 | 受众语言分布 |
| `audience_age_id_list` | S3 | 受众年龄分布（传 `lang` 时翻译） |

> 返回字段名严格以 Scout 实际响应为准（已与 `discovery/creator-search/SKILL.md`「输出格式」各平台字段清单对齐）。各平台字段名有差异：受众语言在 YouTube 是 `audience_language_list`、在 TikTok/Instagram 是 `audience_language_code_list`；受众年龄在 YouTube 是 `audience_age_list`、在 TikTok/Instagram 是 `audience_age_id_list`；主页在 YouTube 是 `channel_url`、其它是 `profile_url`。上表「等级」为据观测的字段投影归档，具体以本次实际返回为准，未返回字段按 null 处理、不编造。
