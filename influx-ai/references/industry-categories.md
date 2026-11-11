# 行业类目参考

结构化列表（`list_creators.mjs`）的 `industry` 字段用于按行业类目筛选达人，多选逗号分隔。

> ⚠️ **口径未核对，务必注意**：下表的类目**名称层级**可供把用户的中文品类映射到类目名参考；但 Scout 的 `industry` 字段**具体接受"类目名称"还是"数字 ID"、以及 ID 体系是否与本表一致，尚未在 influx-ai 侧核对**。因此：
> - 传 `industry` 前以 Scout 实际接口为准；不确定时先用类目名称或少量值试调，根据返回判断是否生效。
> - **不要照搬本表末尾的 CV 三级数字 ID 当作 Scout 的 ID**——那套 ID 来自源项目 creator-scraper-cv，未确认与 Scout 相同。
> - 若按某 `industry` 值返回为空或明显不符，先怀疑口径不一致，向用户说明并调整，而非当作"没有达人"。

## 一级类目总览（名称映射参考）

| 英文 | 中文 |
|------|------|
| Games | 游戏 |
| Beauty & Personal Care | 美妆与个人护理 |
| Clothing & Fashion | 服装与时尚 |
| Healthcare | 医疗保健 |
| Outdoor & Sports | 户外与运动 |
| Food & Beverages | 美食与饮品 |
| Technology & Electronics | 科技数码 |
| Travel & Lifestyle | 旅行与生活方式 |
| Art | 艺术 |
| Entertainment | 娱乐 |
| Pets | 宠物 |
| Parenting & Family | 亲子与家庭 |
| Automotive & Transportation | 汽车与交通 |
| Home & Living | 家居 |
| Toys | 玩具 |
| Software | 软件 |
| Finance | 财经 |
| Books | 图书 |
| Learning & Education | 学习与教育 |
| Career Development | 职业发展 |
| Architecture | 建筑 |
| Science | 科学 |
| Culture & Customs | 文化与习俗 |
| Religion & Beliefs | 宗教与信仰 |
| Social Welfare | 社会公益 |
| Environmental Protection | 环保 |
| Agriculture & Rural Areas | 农业与乡村 |
| Safety & Emergency | 安全与应急 |
| Politics | 政治 |
| Rule of Law | 法治 |

## 常用品类 → 类目名

供把用户口语品类对到类目名（具体传名称还是 ID 见顶部警示）：

| 用户说法 | 类目名（英文） |
|------|------|
| 护肤 | Skincare |
| 彩妆 | Facial Makeup / Eye Makeup / Lip Makeup |
| 美甲 | Nail Art & Tools |
| 女装 / 男装 / 童装 | Women's / Men's / Kids' Clothing |
| 鞋履 | Footwear |
| 手机 | Mobile Phones |
| 电脑 | Computers |
| 耳机 | Headphones |
| 手机配件 | Mobile Phone Accessories |
| 健身 | Aerobic Training / Strength Training |
| 跑步 | Running |
| 篮球 / 足球 | Basketball / Football |
| 美食 | Food |
| 咖啡 | Coffee |
| 旅行 | Travel Guides |
| 搞笑 | Comedy & Humor |
| 宠物 | Pet Supplies |
| 游戏 | （按具体品类取 Games 下二/三级） |

## 主要二级 / 三级类目名（按一级）

- **Beauty & Personal Care**：Makeup（Facial/Eye/Lip）、Skincare、Hair Care、Oral Care、Body Care、Perfume、Nail Art & Tools、Beauty Devices、Men's Care、Feminine Care、Wigs、Tattoo。
- **Clothing & Fashion**：Women's/Men's/Kids' Clothing、Footwear、Bags & Luggage、Jewelry、Accessories（Watches/Sunglasses/Belts/Hats…）、Occasion Wear。
- **Technology & Electronics**：Electronics（Mobile Phones/Computers/Photography/VR & AR/Smart Watches/Headphones）、Digital Accessories（Mobile Phone Accessories/Computer Accessories）、Technology News。
- **Outdoor & Sports**：Fitness（Aerobic/Strength/Yoga…）、Ball Sports（Basketball/Football/Tennis…）、Running、Water Sports、Ice & Snow、Cycling、Camping & Gear、Hiking、Extreme Sports。
- **Food & Beverages**：Food、Beverages（Coffee/Tea/Alcoholic）、Cooking、Food Exploration & Reviews、Food Live Streaming。
- **Travel & Lifestyle**：Travel（Guides/Hotel/Scenery/Cultural）、Lifestyle。
- **Entertainment**：Film & TV Editing & Commentary、Variety & Reality、Celebrity News、Comics & Animation、Comedy & Humor、Cosplay。
- **Home & Living**：Furniture、Home Decoration、Home Appliances、Bedding、Kitchen & Tableware、Home Cleaning、Storage & Organization、Gardening & Plants。
- **Pets**：Pet Supplies（Food/Lifestyle/Toys）、Pet Entertainment。
- **Parenting & Family**：Family Daily Life、Maternity & Baby Products。
- **Automotive & Transportation**：Automobiles、Motorcycles、Car Maintenance、Auto Parts、Car Modification、Self-Driving Travel。
- **Toys**：Children's Toys、Adult Art Toys、Building Block、Educational、Model Toys。
- **Software**：AI、Mobile Apps（Social/Music/Video/Learning/Tools/Shopping…）、Web3（NFT/Crypto/DeFi）。
- **Games**：Shooter、MOBA、Strategy、Sports & Racing、Action、RPG、Simulation、Casual & Social、Rhythm、Sandbox、Gaming Equipment 等。

## 附：CV 三级 ID 示例（仅参考，未确认适用于 Scout）

> 下列 ID 来自源项目 creator-scraper-cv，**未在 influx-ai 侧确认 Scout 使用同一套 ID**。仅在确认 Scout 口径一致后才可按此传值。

| 中文 | 英文 | CV 三级 ID |
|------|------|---------|
| 护肤 | Skincare | 25009001 |
| 手机 | Mobile Phones | 24001001 |
| 耳机 | Headphones | 24006001 |
| 跑步 | Running | 12003001 |
| 健身 | Aerobic Training | 12001001 |
| 美食 | Food | 26001001 |
| 咖啡 | Coffee | 26002001 |
| 旅行 | Travel Guides | 15001001 |
