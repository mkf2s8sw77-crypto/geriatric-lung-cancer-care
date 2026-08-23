# AGENTS.md

## 项目定位

- 仓库名：`geriatric-lung-cancer-care`。
- 中文名称：老年肺癌患者症状群智能评估与全病程管理系统。
- 客户：苏州市立医院。
- 项目是独立运行的科研与护理管理系统，不与 HIS、EMR、LIS、PACS 或其他院内系统对接。
- 所有新增代码、资源、测试、截图和交付文档只能放在本目录内。

## 工作规则

- 每次开发前先完整阅读本文件和当前 phase 对应的 `promptDocs` 文档。
- 默认使用中文编写界面、演示数据、测试说明和交付文档。
- 重要、全局、长期规则才更新本文件；及时合并或删除过时内容，并始终控制在 200 行以内。
- 除 `promptDocs` 指定开发包和最终 `docs` 用户手册外，不新增 README、设计说明、实施总结等 Markdown 文件。
- 不把真实患者姓名、电话、证件号或病历资料写入仓库、截图、日志或演示数据库。

## 技术基线

- Next.js App Router、TypeScript 严格模式、React、Tailwind CSS。
- Drizzle ORM + SQLite，Node.js 运行时使用 `better-sqlite3`。
- 使用 npm，所有依赖只从 npm 官方源 `https://registry.npmjs.org/` 安装；Playwright 浏览器使用官方安装命令。
- 图标使用本地依赖 `lucide-react`，禁止 Emoji、远程图标、远程图片和运行时 CDN。
- 测试使用 Vitest 与 Playwright；浏览器测试串行运行，避免与本机并行项目争抢浏览器资源。

## 路径与运行

- Next.js `basePath` 固定为 `/geriatric-lung-cancer-care`。
- 预期外部入口：`https://sys.huli.sh.cn/geriatric-lung-cancer-care/`。
- 本地首选端口：`12168`；首选地址：`http://127.0.0.1:12168/geriatric-lung-cancer-care/`。
- 启动前先用只读方式检查端口。若端口已被占用，不得停止或影响其他项目；改用 10000—20000 内的空闲端口，并同步更新本文件、环境配置、测试配置和 manifest。
- 所有站内链接、静态资源、重定向、Cookie Path、健康检查和截图访问都必须兼容 `basePath`，不能假设部署在域名根路径。
- 实际项目路径（当前部署）：`/Users/zc-MAC/Downloads/邮件营销项目/苏州市立聂奕轩/geriatric-lung-cancer-care`，run_manifest 中配置的 `/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care` 路径不可用。

## 当前交付状态（2026-08-22）

- P1—P4 全部完成（2026-08-12 基线）；Phase 5 · AI 升级（2026-08-22 启动）覆盖：① AI 演示分析升级（4 维度归因 + 3 风格对比 + 证据触发链）② 护士 RAG 知识库智能体（30 条 mock 知识库 + 问答日志）③ 患者 AI 健康管家（推送卡 + 意图对话）。
- `npm run verify`、`lint`、`typecheck`、`test`、`build`、`test:e2e` 必须全过；每完成一个 Phase 立即回归。
- 演示账号 `admin` / `nurse` / `patient`，密码 `123456`。
- 30 名患者、180 次评估、162 个任务、48 条症状报告、163 条预警、48 条随访、180 条 AI 演示分析、20 条宣教资源。
- 用户手册：`docs/老年肺癌患者症状群智能评估与全病程管理系统概要设计.md`，22 → 30 章节、22 → 30 张 `390×844` 或 `1280×800` 截图。
- 所有演示临床、风险、AI 与量表均为本地确定性内容，明确标注"演示"，不得表述为临床验证。

## 会议背景（2026-08-09 与聂奕轩）

- 纪要：`docs/聂奕轩会议纪要 2026-8-9.md`、`docs/和聂奕轩的电话会议 2026-8-9_原文.md`。
- 客户期望的三个 AI 方向（已在 Phase 5 中对应落地）：
  - **AI 智能评估工具**：基于 LLM 的症状群评估，本系统以本地 `mock-geriatric-lung-v1` 系列（含 balanced / conservative / proactive 三个风格）演示。
  - **AI 健康管家**：以"小龙虾"为代表的患者端 AI 触点，本系统以网页版 `/patient/butler` 演示推送 + 自由对话；微信触点按客户意愿后续扩展。
  - **ICU/护士智能体**：基于审核知识库的 RAG 问答，本系统以 `/nurse/assistant` 演示 5 大类 30 条 mock 知识库 + mock 检索 + 置信度。
- 合作预算：1—3 万 / 独立系统；5 万 / 苏州市立医院卫健委课题。首期不接微信、不接 HIS、不接院内系统。

## Bug 修复记录（部署前排查）

### 第一轮：核心安全与权限

- 限制 `symptomReportSchema.symptomCode` 在已知枚举内，拒收任意 code。
- AI 演示分析采纳 API 增加对象级权限（必须为该患者责任护士），跨患者操作被拒。
- 患者评估提交 API 增加 24 小时内最多一次的频率限制，防止网络重试/双击产生重复预警。
- 重置密码、账号停用、账号启用的审计日志 summary 增加目标用户标识（显示名 / 用户名 / 角色）。
- 管理员不能对自己账号执行重置密码/停用/启用，避免自锁。
- patient 首页"最近评估"卡片增加"查看本次结果"和"历史趋势"链接。
- db/client.ts 增加数据库路径必须在项目 `data/` 子目录的硬校验，阻止 `DATABASE_URL=file:///etc/passwd` 类攻击。
- seed 中治疗阶段改用顺序分配（10:10:10），避免随机分布造成导出筛选结果偏差。

### 第二轮：状态机完整性

- 患者不能再给已取消的任务反馈（"任务已被护士取消，不能再反馈"）。
- 护士不能再调整/取消已取消的任务。
- 已取消的随访不能再被标记完成；已完成的随访不能再被重复完成（"随访已完成，无需重复操作"）。
- 已处理的预警不能再被重复处理（"预警已处理，无需重复操作"）。
- 已采纳的 AI 演示分析不能再被重复采纳（"AI 分析已采纳，无需重复操作"）。
- 任务被调整时，若新状态不是"已完成"，自动清空 `completed_at`，保持状态机一致。
- 症状报告的发生时间限制在 30 天内（"发生时间不能早于 30 天前"），避免错误录入历史数据。
- 补充实现：护士代填评估 API + 页面（`/nurse/patients/[id]/assessments/new`），记录来源为"护士代填"并写入审计日志。

### 第三轮：API 完整性

- 修复护士调整任务时 `status` 字段未从 API 传递到 service（导致无法通过 API 修改任务状态，状态机卡住）。调整任务若新状态不是"已完成"，自动清空 `completed_at` 保持一致。

### 第四轮：状态机深化

- 调整任务时若新状态是"已完成"，自动设置 `completed_at = 当前时间`；若新状态不是"已完成"，清空 `completed_at`。已"已完成"任务再次调整时保留原 `completed_at`，避免覆盖历史完成时间。

### 第五轮：Phase 5 · AI 升级（2026-08-22 启动）

- 见「会议背景」与「临床与 AI 边界」小节；三件 AI 全做 + 视觉升级，按 Phase 0 → Phase 5 顺序实施；每 Phase 结束立即回归。
- 实施细节与方案存档于 `artifacts/plan.md`（本会话快照）；不再单独建 Markdown 设计文档。

### 第六轮：上线前用户视角排查（2026-08-23）

- `BrandHeader.tsx` 顶部 Logo 的 `<Link href="/geriatric-lung-cancer-care/">` 在 basePath 已含同前缀的情况下产生双 basePath，导致所有页面控制台 404 与点击跳到不存在的页面；改为 `<Link href="/">`。
- `app/api/auth/logout/route.ts` 仅返回 `{ok:true}` JSON，导致所有角色点退出后落到空白 JSON 页；按 `content-type / accept` 区分：表单 POST 时 303 重定向到登录页，fetch/AJAX 仍返回 JSON。
- `components/AIKnowledgePanel.tsx` 中 mock RAG 用 `**term**` 标记关键词高亮，但回答区直接渲染纯文本，用户看到 `****吸****痰…`。新增 `renderHighlighted()` 把 `**` 分段渲染为 `<strong>`，关键词真正粗体显示。
- `lib/services/symptom-cluster.ts` 新增 `SYMPTOM_LABEL / symptomLabel(code)` 作为量表 code → 中文显示名的唯一来源；同步替换 `app/patient/assessments/[id]/page.tsx` / `app/nurse/patients/[id]/page.tsx` / `app/nurse/patients/[id]/assessments/new/page.tsx` / `lib/services/ai/analysis.ts` 中散落的 `it.code / topSymptomCode / SYMPTOM_NAME_MAP` 英文展示。
- `db/seed/seed.ts` 评估时间分布调整：每位患者的最近 2 次评估强制落在近 30 天窗口内，让患者端趋势图默认有数据（之前只有约 10% 患者有近 30 天评估，趋势页大面积"暂无"）。
- `scripts/verify.ts` 用户手册文件名同步 AGENTS.md，去掉 2026-08-12 后缀，否则 `npm run verify` 必失败。
- 新增 `tests/regression-bug-fixes.test.ts` 覆盖：症状 code 中文映射、未知 code 兜底、评估 topSymptomCode 全部能映射为中文、最近 30 天评估分布、logout API 存在且支持表单 POST。

## 环境变量

- `.env.example` 必须包含 `DATABASE_URL`、`SESSION_SECRET`、`APP_BASE_PATH`、`PORT`、`AI_MODE`，不得包含真实密钥。
- 默认 `DATABASE_URL=file:./data/app.db`、`APP_BASE_PATH=/geriatric-lung-cancer-care`、`PORT=12168`、`AI_MODE=mock`。
- AI 功能首期只能使用本地确定性演示引擎，不连接任何真实 AI API，也不要求配置 AI 密钥。

## 用户与权限

- 角色至少包括患者/家属、护士、护士管理员。
- 患者端不提供注册入口；患者账号由护士或管理员在后台创建、重置和停用。
- 使用数据库会话和 HttpOnly Cookie；密码必须哈希保存，服务端对每次查询和变更执行角色鉴权。
- 患者只能访问自己的资料；护士访问负责或授权范围内患者；管理员负责配置、人员、科研和审计。
- 登录功能必须可用，但最终用户手册不得介绍登录流程，也不得写演示账号密码。

## 产品端形态

- 患者/家属端：移动端优先 Web App，支持患者本人或家属使用同一已分配账号。
- 护士移动工作站：移动端优先，覆盖患者、评估、预警、随访和人工路径调整。
- 护士管理员端：PC 端优先，覆盖配置、人员、统计、科研导出和审计。
- 首期护理路径不允许系统自动调整。系统可以提示建议，必须由护士手动确认并修改任务。

## 临床与 AI 边界

- 项目尚未获得客户正式量表、风险模型和临床阈值；首期使用明确标注“演示”的可配置量表与规则。
- 演示风险结果和 AI 建议不得表述为经过临床验证，不得自动诊断、开药、调整治疗或替代医护人员。
- 高风险结果只能触发醒目提醒、建议及时就医和人工复核；所有护理建议由护士确认后执行。
- 演示 AI 必须确定性、可复现、可测试，并显示生成依据、模型标识和演示声明。
- Phase 5 起所有 AI 能力（`lib/services/ai/` 命名空间）均为本地 mock：
  - `analysis.ts` —— `mock-geriatric-lung-v1-{balanced|conservative|proactive}` 演示分析；
  - `agent.ts` —— `mock-kb-agent-v1` 知识库 RAG 智能体；
  - `butler.ts` —— `mock-butler-v1` 患者 AI 健康管家；
  - `drafting.ts` —— `mock-drafting-v1` 预警处置 / 随访摘要草稿。
- 任何 AI 输出的 UI 必须显式展示：模型标识、生成时间、演示声明 / 免责声明。不得隐藏来源。
- 未来接入真实 LLM 时，UI 与 API 不变；只需替换 `lib/services/ai/` 内部实现并通过 `AI_MODE` 环境变量切换。
- 知识库条目必须标注来源（演示版）：不得使用未注明"演示"字样的真实指南/共识原文。
- 症状群归类（躯体 / 营养 / 心理 / 呼吸 4 群）为演示映射，未经过临床验证；UI 中不得标"临床归类"。

## 品牌与视觉

- 原始 Logo 位于父目录 `../logo.png`，尺寸为 `1980×486`，透明底，约 4.07∶1 横向构图。
- 实施时复制为 `public/brand/suzhou-municipal-hospital-logo.png`，保持完整比例，不裁切、不拉伸、不改色。
- 主色采用 Logo 医疗蓝，背景以白色和浅灰为主；Logo 中红色仅用于高风险、错误和关键警示，不作大面积装饰。
- 桌面端 Logo 建议宽度 360—520 像素，移动端 210—260 像素；窄屏不得挤压正文或横向溢出。
- 除 Logo 外不使用照片。空状态、菜单、指标和操作全部使用本地图标与 CSS 视觉元素。
- 患者端必须落实大字号、高对比度、大触控区、少层级、清晰反馈、自动保存和语音播放等老年友好设计。

## 演示数据

- `db:reset` 必须安全、可重复地重建本项目 SQLite 演示数据库，不得删除项目目录外文件。
- 提供管理员、护士、患者三个固定测试账号，并生成足够覆盖低/中/高风险、不同治疗阶段、正常/逾期任务及已处理/未处理预警的数据。
- 演示姓名、电话和研究编号必须为虚构内容，并在界面中体现数据为演示用途。

## 测试与最终验收

- 每阶段至少运行 lint、typecheck、单元测试和 production build；相关阶段补充 Playwright 端到端测试。
- 最终对三个角色、主要路由、所有可点击操作、成功/空/错误状态和双视口进行真实浏览器验收。
- PC 截图固定 `1280×800`；移动端固定 iPhone 视口 `390×844`；禁止 full-page 长截图。
- Playwright 使用项目独立临时目录、独立 browser context 和单 worker；不得连接、关闭或清理其他项目的浏览器与进程。
- 只终止本项目自己启动且 PID 已确认的进程，禁止 `pkill`、`killall` 或宽泛端口清理。

## 用户手册

- 最终手册写入 `docs/老年肺癌患者症状群智能评估与全病程管理系统概要设计.md`。
- 截图统一放在根目录 `screenshots/`，Markdown 使用相对路径 `../screenshots/<file>.png` 引用。
- 手册不介绍登录、不写技术栈、不放账号密码；只讲客户可见功能。
- 每个功能模块必须严格采用“标题＋一段不超过 100 个汉字的自然语言说明＋一张系统截图”，说明不得列点。
- 手册正文全部使用全角中文标点。完成后逐条核对图片文件、引用路径、视口尺寸、Logo、裁切和页面状态。
