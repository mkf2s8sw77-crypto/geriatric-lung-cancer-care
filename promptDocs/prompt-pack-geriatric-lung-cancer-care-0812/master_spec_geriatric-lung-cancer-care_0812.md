# Master Spec：geriatric-lung-cancer-care

## 0．给新 Coding Agent 的任务说明

你正在接手一个全新的代码仓库。此前没有项目背景，也不要依赖任何对话记忆。请先完整阅读：

1. `/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care/AGENTS.md`；
2. 本 Master Spec；
3. 当前 phase 对应的 `LLM_prompt_*.md`；
4. `/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care/promptDocs/prompt-pack-geriatric-lung-cancer-care-0812/test_case_geriatric-lung-cancer-care_0812.md`。

目标不是写原型说明，而是在项目根目录内完成可运行、可演示、可测试的系统。除上述 prompt 文档和最终用户手册外，不创建额外说明性 Markdown。所有长期规则维护在项目根目录 `AGENTS.md`，且不超过 200 行。

## 1．项目目标与背景

### 1.1 项目信息

- GitHub 仓库名：`geriatric-lung-cancer-care`。
- 中文名称：老年肺癌患者症状群智能评估与全病程管理系统。
- 客户：苏州市立医院。
- 项目根目录：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care`。
- 业务来源：老年肺癌患者科研课题，覆盖院内症状群评估、风险预警、院外随访、人工护理路径调整和科研数据沉淀。

### 1.2 核心业务闭环

护士建档并开设患者账号 → 患者或家属登录移动 Web App → 完成症状评估、任务及主动报告 → 系统自动评分并给出演示风险分层/建议 → 护士查看预警并人工处置 → 护士手动调整随访和护理任务 → 管理端完成配置、统计、导出和审计。

### 1.3 目标用户

- 患者/家属：使用护士分配的账号，在移动 Web App 完成评估、任务、宣教和症状报告。
- 护士：使用移动工作站管理负责患者、评估、预警、随访、干预和人工路径调整。
- 护士管理员：使用 PC 管理端维护用户、量表、护理路径、预警规则、宣教资源、科研统计和审计日志。

## 2．交付边界与成功标准

### 2.1 必须交付

- 完整 Next.js 应用、SQLite 数据库、Drizzle schema/migration、可重复 seed/reset。
- 患者/家属移动端、护士移动工作站、护士管理员 PC 端。
- 数据库会话登录、三类权限、护士创建患者账号；患者端没有注册入口。
- 症状评估、自动评分、风险预警、主动症状报告、护士干预、随访任务、护理路径人工调整、宣教、趋势。
- 可配置量表、路径、预警规则、宣教资源、人员和患者管理。
- 本地确定性 AI 演示分析、科研看板、脱敏 CSV 导出、审计日志。
- 足量虚构演示数据和固定演示账号。
- lint、typecheck、单元测试、Playwright、production build 全部通过。
- 真实浏览器逐功能验收、PC/移动端截图和图文用户手册。
- 在 10000—20000 的端口运行；本次首选端口固定为 `12168`。

### 2.2 用户可见成功标准

- 三类用户登录后只能看到本角色入口，关键操作能够真实写入并从页面复核，不得仅靠静态假数据拼 UI。
- 患者移动端在 `390×844` 下无横向滚动，字号、触控区、反馈、自动保存和语音能力符合老年友好要求。
- 护士能从患者异常提交进入预警，完成处置并手动调整后续任务；系统不会自动替护士修改护理路径。
- 管理员能配置业务字典并看到配置影响，统计和导出来自 SQLite 实际数据。
- 所有资源、链接、Cookie 和重定向在 `basePath=/geriatric-lung-cancer-care` 下正确工作。
- Logo 比例、主色和高风险红色使用正确；除 Logo 外无照片、远程图片或 Emoji。

### 2.3 非目标

- 不对接 HIS、EMR、LIS、PACS、统一身份认证、短信、微信、小程序或任何第三方业务系统。
- 不开发原生 App，不提供患者自注册，不实现支付、即时聊天、文件上传或远程消息推送。
- 不接真实 AI API，不配置真实 API Key，不训练或声称拥有临床验证模型。
- 不提供自动诊断、处方、治疗调整或自动护理路径变更。
- 不包含 ICU 知识库智能体、VR、智能眼镜等会议中的其他议题。

## 3．Phase Sizing

本项目固定拆为 4 个 phase：

1. **P1 核心底座与最小评估闭环**：完成工程、品牌、数据库、鉴权、护士开户、患者评估、评分和预警最小闭环。
2. **P2 患者/护士移动全病程闭环**：完成任务、宣教、主动报告、随访、干预和护士手动调整路径。
3. **P3 PC 管理、科研和 AI 演示**：完成配置、权限、统计、脱敏导出、审计和确定性 AI 演示分析。
4. **P4 全站验收与用户手册**：完成跨角色浏览器验收、双视口修复、稳定截图、手册和最终运行。

不能压缩为 3 个 phase 的原因：多角色业务闭环与 PC 配置/科研模块是不同权限边界和失败模式；最终手册又要求在稳定版本上进行双视口、非长图、逐图视觉核验，必须在功能冻结后独立完成，才能避免边开发边截图造成页面和引用失真。

## 4．技术栈与工程约束

### 4.1 技术选型

- Next.js App Router、React、TypeScript 严格模式。
- Tailwind CSS；组件自行实现或使用少量稳定无运行时 CDN 的本地依赖。
- Drizzle ORM、SQLite、`better-sqlite3`。
- `bcryptjs` 进行密码哈希；使用自建数据库 session 和随机不透明 token，不引入外部认证服务。
- `zod` 校验服务端输入；日期统一使用 ISO 字符串存储并以 Asia/Shanghai 展示。
- `lucide-react` 提供本地图标；禁止 Emoji、远程字体、远程图片和图标 CDN。
- Vitest 负责单元/服务测试；Playwright 负责跨角色端到端和截图。

### 4.2 依赖来源

- npm 官方源固定为 `https://registry.npmjs.org/`，安装前执行 `npm config get registry`，若不是官方源则仅对当前项目/命令显式指定官方源。
- Playwright 使用 `npx playwright install chromium`，不得使用非官方浏览器镜像。
- 不从不明脚本、压缩包或第三方 CDN 下载前端资源。

### 4.3 新仓库初始化

项目目录在开发开始前已有 `AGENTS.md` 和 `promptDocs/`，因此不要直接执行会拒绝非空目录的 `create-next-app .`。在当前目录内创建 `package.json`、Next.js 配置和源码结构，再通过官方 npm 源安装依赖。不得在父目录、临时仓库或相邻项目生成代码后遗留文件。

### 4.4 推荐目录

```text
app/                  # App Router 页面、布局、route handlers
components/           # 通用、患者端、护士端、管理员端组件
lib/                  # auth、db、权限、评分、AI mock、审计、CSV
db/                   # schema、migration、seed 数据定义
scripts/              # 安全 migrate/seed/reset
public/brand/         # 苏州市立医院 Logo
tests/                # Vitest
e2e/                  # Playwright
data/                 # 本地 SQLite，数据库文件不提交
docs/                 # 最终仅存用户手册
screenshots/          # 最终用户手册截图
promptDocs/           # 本开发包
```

### 4.5 package scripts 合同

至少提供以下命令，并保证新会话可直接执行：

```bash
npm run dev -- --hostname 127.0.0.1 --port 12168
npm run build
npm run start -- --hostname 127.0.0.1 --port 12168
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
npm run verify
```

`db:reset` 只能删除项目根目录 `data/app.db` 及其 SQLite sidecar，必须解析并验证目标真实路径后执行；不得使用 glob、递归删除或触及项目外路径。`verify` 至少包含 lint、typecheck、unit test、build 和全量 Playwright。

## 5．运行与部署约束

- `basePath` 固定为 `/geriatric-lung-cancer-care`。
- 外部目标地址：`https://sys.huli.sh.cn/geriatric-lung-cancer-care/`。
- 本地首选地址：`http://127.0.0.1:12168/geriatric-lung-cancer-care/`。
- 健康检查：`GET /geriatric-lung-cancer-care/api/health`，返回非敏感 JSON，例如 `{"status":"ok","database":"ok","aiMode":"mock"}`。
- Next.js 配置、静态资源、客户端路由、服务端 redirect、表单 action、下载地址和 Cookie Path 全部必须兼容 basePath。
- 启动前先检查 `12168`。如被其他项目占用，不得杀进程；在 10000—20000 中找空闲端口，并同步修改 `.env.local`、Playwright、`AGENTS.md` 与本 manifest。
- 最终使用 production build 启动；开发服务器不能作为最终交付状态。

### 5.1 环境变量

`.env.example` 至少包含：

```dotenv
DATABASE_URL=file:./data/app.db
SESSION_SECRET=replace-with-at-least-32-random-characters
APP_BASE_PATH=/geriatric-lung-cancer-care
PORT=12168
AI_MODE=mock
```

- 本地 `.env.local` 不提交；演示环境可复制 `.env.example` 后替换 `SESSION_SECRET`。
- 不设置真实 AI Key；若发现历史环境中存在密钥，不读取、不回显、不写日志。

## 6．品牌与 UI 设计

### 6.1 Logo

- 唯一图片素材源：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/logo.png`。
- 已核验为 `1980×486`、透明底、约 4.07∶1 横向构图，包含蓝色院徽和中英文医院名，院徽中心为红色十字。
- P1 复制到 `public/brand/suzhou-municipal-hospital-logo.png`；不得裁切、拉伸、改色或转成方形头像。
- 白色或浅灰背景最适合该蓝色横版 Logo；桌面宽度 360—520 像素，移动端 210—260 像素，保持 `height:auto`。

### 6.2 视觉语言

- 建议主色：医疗蓝 `#287FA5`；深色文字 `#17324D`；浅蓝背景 `#EEF7FA`；页面背景 `#F6F8FA`。
- Logo 红色约束为高风险/错误/关键警示色，不能用于普通按钮或大面积背景。
- 使用卡片、留白、清晰分组和简洁数据图，不追求炫技动画。
- 图表优先使用 CSS/SVG 或本地包；所有图标必须来自本地 `lucide-react`，不使用 Emoji。
- 空状态使用图标和文字，不使用插画或照片。

### 6.3 响应式

- 患者/家属端和护士移动工作站以 `390×844` 为主要验收视口；底部导航或适合单手操作的移动导航，触控目标不小于 44×44 像素。
- 患者正文默认不小于 17 像素，关键数字/标题更大；支持浏览器原生语音合成朗读评估题和宣教正文。
- 管理端以 `1280×800` 为主要验收视口；使用固定/可折叠侧栏、顶部品牌区和可横向容纳的表格，但页面本身不得无故水平滚动。
- 两种端形态共用品牌与数据模型，不做三个彼此割裂的应用。

## 7．功能规格

### 7.1 登录、账号与权限

- `/login` 只提供账号、密码登录和必要错误反馈；不展示注册、第三方登录或找回密码入口。
- 护士/管理员在后台创建患者档案时同时生成唯一患者账号和一次性初始密码；创建结果仅当次显示，之后只允许重置，不保存明文。
- 账号支持启用、停用、密码重置和最近登录时间。
- Session 存数据库，Cookie 为 HttpOnly、SameSite=Lax，生产环境 Secure；设置合理过期时间和 basePath Cookie Path。
- 角色：`PATIENT`、`NURSE`、`ADMIN`。管理员可查看护士工作区，护士不能访问系统配置和全量审计，患者只能访问自己的数据。

### 7.2 患者/家属移动 Web App

- **首页**：今日评估、待办任务、复诊/用药/康复提醒、最新风险提示和宣教入口；清楚展示待完成、已完成、逾期。
- **症状评估**：演示量表分步填写；必填校验；本地与服务端草稿自动保存；提交前确认；提交后展示易懂结果、风险说明和“不能替代医护判断”声明。
- **主动症状报告**：选择症状、0—10 严重度、发生时间、文字备注；危险程度触发护士预警和患者及时就医提示。
- **任务中心**：查看评估、随访、用药、复诊、康复和宣教任务，反馈完成/未完成/暂不适用。
- **健康教育**：分类列表、详情、语音朗读、阅读确认；只展示管理员已启用且护士分配/路径匹配的内容。
- **趋势**：近 30 天总分和主要症状趋势、任务完成率；避免让患者解读为诊断结论。
- **个人信息**：只读显示基本档案、责任护士和研究状态，不允许修改核心研究字段。

### 7.3 护士移动工作站

- **工作台**：负责患者数、今日待办、未处理高风险预警、逾期任务和快速入口。
- **患者管理**：搜索/筛选、建档、生成患者账号、查看患者时间线、量表、任务、风险、干预和依从性。
- **护士评估**：护士可代填评估，或对患者自评进行确认/补充；保留来源、操作者和时间。
- **预警处置**：按风险和状态筛选；查看触发依据；确认、忽略、升级；记录电话联系、护理指导、建议就医、复评时间和处理结果。
- **随访与干预**：创建随访，填写自然语言记录，设置后续动作；未完成任务进入逾期列表。
- **人工路径调整**：查看系统建议，由护士手动新增、修改、暂停、取消任务；记录调整前后、原因和操作者。严禁后台定时任务或 AI 自动改路径。
- **宣教分配**：从资源库选择内容分配给患者，并查看阅读/确认状态。

### 7.4 护士管理员 PC 端

- **管理驾驶舱**：患者状态、风险分布、今日评估、任务完成率、预警处理率和近 30 天趋势。
- **患者与人员**：全量患者筛选、责任护士分配、用户启停、密码重置；关键操作二次确认并审计。
- **量表配置**：量表、题目、选项、分值、必填、顺序、适用范围、启停和版本。已产生数据的版本只读，修改通过新版本生效。
- **护理路径配置**：按治疗阶段/患者组配置相对天数任务，支持复制、启停、版本；新版本不自动覆盖在组患者。
- **预警规则配置**：单项阈值、总分阈值、较上次增长、任务逾期；规则启停和版本。
- **宣教资源**：标题、分类、适用阶段、摘要、正文、排序和启停。首期不做文件上传、图片或视频；页面使用本地图标和文本卡片，正文可调用浏览器语音朗读。
- **科研统计**：纳入/完成/失访/退出、时间点完成率、症状趋势、风险分布、路径执行和预警处置统计。
- **脱敏导出**：CSV 使用 UTF-8 BOM，默认仅研究编号、人口学分组、评估/任务/干预/风险字段；排除姓名、电话、账号、session、密码哈希。
- **审计日志**：记录登录、建档、账号变更、患者字段修改、规则/路径版本、预警处理和导出；展示操作者、时间、对象和摘要，不记录密码及 session token。

### 7.5 演示评分与 AI

- 客户尚未提供正式量表和模型，系统必须把以下内容标记为“演示配置，可由正式课题方案替换”。
- 演示量表包含 10 个 0—10 分症状：疲乏、疼痛、食欲下降、咳嗽、呼吸困难、睡眠问题、焦虑、恶心呕吐、便秘、活动耐力下降，总分 0—100。
- 确定性演示风险规则：任一症状 ≥8、总分 ≥60 或较上次总分增加 ≥15 为高风险；任一症状 ≥5 或总分 ≥30 为中风险；其余为低风险。优先级高风险覆盖中风险。
- `AI_MODE=mock` 时，基于最高症状、总分、变化值、依从性和治疗阶段，从本地模板生成：摘要、主要风险因素、建议复核项、建议随访时间和患者易懂提示。
- 同一输入必须产生同一输出；记录 `mock-geriatric-lung-v1`、输入摘要、规则依据、生成时间和护士采纳状态。
- AI 输出只供演示和护士辅助；高风险使用醒目红色，并明确“请由医护人员复核，必要时及时就医”。

## 8．数据模型与服务边界

### 8.1 核心表

- `users`：账号、角色、显示名、密码哈希、状态、最近登录。
- `sessions`：token 哈希、用户、过期时间、创建时间。
- `patients`：研究编号、姓名、性别、出生日期、演示电话、诊断/治疗阶段、纳入/随访日期、状态、责任护士、关联患者账号。
- `scale_versions`、`scale_items`：量表版本及题目分值配置。
- `assessments`、`assessment_answers`、`assessment_drafts`：评估、答案、自动保存草稿和来源。
- `risk_rule_versions`、`risk_alerts`：规则版本、风险、触发依据、处理状态。
- `care_path_versions`、`care_path_steps`、`patient_path_assignments`：护理路径模板与患者分配。
- `patient_tasks`：任务类型、计划时间、状态、完成反馈、来源和人工调整信息。
- `symptom_reports`：患者主动报告。
- `followups`、`interventions`：护士随访和干预闭环。
- `education_resources`、`patient_education_assignments`：宣教资源及分配/阅读。
- `ai_analysis_runs`：演示 AI 输入摘要、结果、版本和采纳状态。
- `audit_logs`：非敏感操作审计。

字段命名、外键、索引、唯一约束和枚举值由 Drizzle schema 统一定义；使用 migration 管理，不依赖运行时 `push` 作为正式初始化方式。

### 8.2 服务边界

- 采用 Next.js Server Components、Server Actions 和 Route Handlers，不创建独立后端服务。
- 所有写操作走服务端 action/handler，统一执行 schema 校验、session、RBAC、患者范围校验、事务和审计。
- 不提供给第三方使用的公开 API。`/api/health` 只提供最小健康状态；CSV 下载必须鉴权。
- UI 不直接访问 SQLite；页面层调用领域服务，评分、风险、任务和 AI mock 保持纯函数便于测试。

## 9．演示数据合同

`npm run db:reset` 后必须稳定得到：

- 1 个管理员：`admin_demo / Demo@2026`。
- 1 个护士：`nurse_demo / Demo@2026`。
- 1 个固定患者：`patient_demo / Demo@2026`。
- 30 名虚构患者：24 名在组、3 名已完成、2 名失访、1 名退出；覆盖术后康复、化疗期、稳定随访等阶段。
- 3 套护理路径、1 套 10 项演示量表、至少 18 条宣教资源。
- 至少 180 次历史评估、120 条患者任务、30 条主动症状报告、24 条预警、20 条干预/随访、20 条 AI 演示分析。
- 低、中、高风险均有数据；至少 4 条未处理高风险、4 条已完成高风险、正常/逾期/暂停任务均有数据。
- 所有姓名、电话和记录明确虚构，不使用真实客户或患者信息。

Seed 固定随机种子，重复 reset 后关键 ID、账号和统计口径保持一致，便于截图和 E2E 断言。

## 10．路由合同

所有路径均叠加 basePath：

- 通用：`/login`、`/forbidden`、`/api/health`。
- 患者：`/patient`、`/patient/assessments/[id]`、`/patient/symptoms/new`、`/patient/tasks`、`/patient/education`、`/patient/education/[id]`、`/patient/trends`、`/patient/profile`。
- 护士：`/nurse`、`/nurse/patients`、`/nurse/patients/new`、`/nurse/patients/[id]`、`/nurse/alerts`、`/nurse/alerts/[id]`、`/nurse/followups`。
- 管理员：`/admin`、`/admin/patients`、`/admin/users`、`/admin/scales`、`/admin/pathways`、`/admin/risk-rules`、`/admin/education`、`/admin/research`、`/admin/audit`。

可以使用平行路由或 route groups 整理布局，但最终 URL 和角色边界不得变化。

## 11．测试与质量门禁

- 每个 phase 运行 `npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`。
- P2 起运行移动端 Playwright；P3 起运行 PC 端 Playwright；P4 运行 `npm run verify` 和完整人工浏览器检查。
- 关键纯函数覆盖评分、风险、AI mock、路径人工调整、CSV 脱敏、RBAC。
- E2E 覆盖护士创建患者账号、患者评估与主动报告、预警生成和处置、人工调整任务、配置版本、统计导出、权限拒绝。
- 对成功、空数据、校验失败、无权限、已停用账号、重复提交和数据库错误提供可理解反馈。
- 浏览器 console 不得有未处理错误，关键请求无 4xx/5xx，页面无 basePath 资源 404。

## 12．最终浏览器验收与用户手册

### 12.1 浏览器隔离

- 启动前用 `lsof -nP -iTCP:12168 -sTCP:LISTEN` 检查端口；不停止任何未知进程。
- Playwright 使用 `workers: 1`、独立 browser context 和项目专属临时目录，例如 `.tmp/playwright-geriatric-lung-cancer-care-12168`。
- 不连接用户正在使用的 Chrome profile，不执行 `pkill`、`killall`，只关闭本项目明确启动的 PID。
- PC viewport 固定 `1280×800`；移动 viewport 固定 `390×844`；所有手册截图 `fullPage: false`。

### 12.2 用户手册

- 文件：`docs/老年肺癌患者症状群智能评估与全病程管理系统概要设计 2026-08-12.md`。
- 截图：根目录 `screenshots/`，使用有序 ASCII 文件名；手册相对引用 `../screenshots/<name>.png`。
- 不写登录功能、账号密码、技术栈、部署方式、测试过程或开发说明。
- 每个功能模块固定为：二级/三级标题；一段不超过 100 个汉字的自然语言；紧接一张对应截图。说明不能列点。
- 全文使用全角中文标点；站在客户使用角度描述“可以做什么”，不写实现原理。
- 至少覆盖患者首页、症状评估、症状报告、任务、宣教、趋势；护士工作台、患者建档、患者详情、预警、随访、人工任务调整；管理员驾驶舱、量表、路径、规则、宣教、人员、科研统计、导出与审计。
- 完成后脚本核对所有 Markdown 图片引用均存在；再逐张查看图片，检查尺寸、Logo、菜单、弹窗、裁切、演示水印和数据状态。

## 13．跨阶段规则

- 每个 phase 先读 `AGENTS.md`、本文件、当前 phase 和测试文档，再检查仓库现状；不要假设前一会话记忆。
- 只实现当前 phase，不提前扩 scope；但发现前序缺陷会阻塞本阶段时，应先做最小修复并记录在提交/交接中。
- 真实功能必须落库，不接受只切换前端状态的假交互；演示 AI 可以是 mock，但必须由真实输入计算并持久化。
- 所有受保护服务端操作都必须做 RBAC，不以“按钮没显示”代替后端权限。
- 不破坏 `promptDocs`，不把数据库、日志、构建产物、session 或 `.env.local` 提交到 Git。
- 各阶段完成后更新必要的 `AGENTS.md` 长期信息，不写流水账；运行门禁并说明剩余风险。

## 14．最终交付清单

- [ ] P1—P4 功能全部完成。
- [ ] `AGENTS.md` 准确且不超过 200 行。
- [ ] `.env.example`、migration、seed/reset、演示账号可复现。
- [ ] 全部自动门禁通过。
- [ ] production build 在实际选定端口运行，健康检查通过。
- [ ] 三角色全功能浏览器验收通过，无明显视觉或权限缺陷。
- [ ] 用户手册结构、文字、截图和引用全部复核通过。

## 15．已知待替换项（不阻塞首期）

- 客户正式症状群量表、计分版权/授权和评估时间点尚未提供；首期按演示量表实现可配置能力。
- 客户正式风险模型、阈值和验证数据尚未提供；首期使用明确标注的确定性演示规则和 AI mock。
- 正式伦理、隐私和医院安全部署要求尚未提供；首期只使用虚构演示数据，不能直接当作生产医疗系统上线。
