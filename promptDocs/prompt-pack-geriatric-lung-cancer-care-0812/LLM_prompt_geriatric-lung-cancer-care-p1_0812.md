# LLM Prompt：geriatric-lung-cancer-care Phase 1/4

## 阶段目标

在全新项目目录中完成可运行的工程和数据底座，并交付第一条真实可验收的垂直闭环：护士/管理员登录后创建患者与患者账号，患者登录后完成一份演示症状评估，系统落库评分并生成风险预警，护士能够看到该结果。

本阶段结束时，仓库不是空壳或静态页面，而是具有品牌、basePath、SQLite、鉴权、RBAC、seed/reset 和最小评估闭环的 Next.js 应用。

## 本阶段输入

- 必读：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care/AGENTS.md`。
- 必读总文档：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care/promptDocs/prompt-pack-geriatric-lung-cancer-care-0812/master_spec_geriatric-lung-cancer-care_0812.md`。
- 测试文档：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/geriatric-lung-cancer-care/promptDocs/prompt-pack-geriatric-lung-cancer-care-0812/test_case_geriatric-lung-cancer-care_0812.md`。
- 当前代码现状：项目目录只有 `AGENTS.md` 和 `promptDocs/`，没有应用代码、数据库或 Git 历史（若执行器已初始化 Git，以实际状态为准）。
- 品牌源文件：`/Users/huli-dev/Downloads/projects/苏州市立聂奕轩/logo.png`，已核验为横向透明底 `1980×486`。

## 任务清单

1. **只在当前项目根目录初始化工程**
   - 不要对非空目录运行 `create-next-app .`；手工建立 Next.js App Router、TypeScript strict、Tailwind、ESLint 配置、`package.json` 和目录结构。
   - 使用 npm 官方源安装 Next.js、React、Drizzle、`better-sqlite3`、`bcryptjs`、`zod`、`lucide-react`、Vitest 等必要依赖。
   - 建立 `.gitignore`，排除 `.env.local`、`data/*.db*`、`.next`、coverage、Playwright 输出和项目临时目录。
   - 提供 `.env.example`，默认 `DATABASE_URL=file:./data/app.db`、`APP_BASE_PATH=/geriatric-lung-cancer-care`、`PORT=12168`、`AI_MODE=mock`，不写真实密钥。

2. **落实 basePath、品牌与基本布局**
   - Next.js `basePath` 固定 `/geriatric-lung-cancer-care`，避免额外 `assetPrefix` 造成重复路径。
   - 复制父目录 Logo 到 `public/brand/suzhou-municipal-hospital-logo.png`；桌面和移动登录/页头均保持完整横向比例。
   - 实现通用登录页、无权限页、患者移动布局、护士移动布局、管理员 PC 布局的基础壳；未完成功能用明确“后续阶段开放”的非交互状态，不放假按钮。
   - 使用 Logo 医疗蓝为主色，红色只用于高风险与错误；除 Logo 外不使用图片，所有图标来自 `lucide-react`，禁止 Emoji。

3. **数据库、migration 与安全 reset**
   - 根据 Master Spec 建立完整核心 schema，至少覆盖 users、sessions、patients、量表/题目、评估/答案/草稿、风险规则/预警、路径/步骤/患者路径、任务、症状报告、随访、干预、宣教/分配、AI 运行和审计。
   - 为账号、研究编号、外键、状态和常用筛选字段添加合适唯一约束/索引；所有时间字段规范化。
   - 生成并提交 Drizzle migration；正式初始化走 migration，不以 `drizzle push` 代替。
   - 实现 `db:migrate`、`db:seed`、`db:reset`。reset 必须校验数据库真实路径处于 `<project>/data/`，只删除明确列出的 SQLite 文件，不使用递归删除或 glob。

4. **鉴权、session 与 RBAC**
   - 自建账号密码登录，密码用 `bcryptjs` 哈希；session token 仅以哈希形式入库，Cookie 为 HttpOnly、SameSite=Lax，Path 兼容 basePath。
   - 三角色固定为 `PATIENT`、`NURSE`、`ADMIN`；实现服务端 session helper、角色守卫、患者自有范围和护士负责范围检查。
   - `/login` 不提供注册或第三方登录。管理员可进入管理员端，护士进入护士端，患者进入患者端；越权访问返回受控 403/跳转，不泄漏数据。
   - 实现退出登录和停用账号拒绝新旧 session。

5. **护士建档与患者账号**
   - 在护士工作区实现患者列表和新建患者表单；管理员也可通过相同领域服务创建患者。
   - 一次事务内生成患者、唯一研究编号、患者账号和初始密码；初始密码仅创建成功当次显示，数据库只保存哈希。
   - 支持责任护士、治疗阶段、纳入日期、随访日期和患者状态；患者端无注册入口。
   - 创建、重置、停用操作写审计日志，日志不得包含密码明文。

6. **最小症状评估闭环**
   - seed 一套明确标记“演示”的 10 项 0—10 分症状量表和风险规则。
   - 患者首页显示一条待完成评估；分步表单支持必填校验、前后切换和草稿自动保存，重新打开后恢复。
   - 提交后在事务中保存评估与答案，使用纯函数计算总分、最高症状、与上次差值及低/中/高风险，必要时创建预警。
   - 防止重复提交；提交成功后患者看到易懂结果和演示/医护复核声明。
   - 护士患者详情和预警列表能看到该评估、来源、得分、风险和触发依据。

7. **健康检查和演示数据**
   - 实现 `/api/health`，检查应用与 SQLite 可读，返回最小非敏感 JSON。
   - seed 固定管理员、护士、患者账号：`admin_demo`、`nurse_demo`、`patient_demo`，密码均为 `Demo@2026`。
   - P1 至少 seed 30 名虚构患者基础档案、三类风险样本和足够评估数据；后续业务数据可在 P2/P3 补齐到 Master Spec 目标。

8. **测试与脚本**
   - 配置 Vitest；覆盖评分边界、风险优先级、密码/session、RBAC、reset 路径保护和重复提交。
   - 为关键服务提供集成测试，使用独立临时 SQLite，不修改开发演示库。
   - package scripts 与 Master Spec 合同一致；`npm run build` 必须在 basePath 下成功。

## 范围边界

### 本阶段要做

- 工程、品牌、数据库、migration/seed/reset、登录/RBAC、护士创建患者账号、患者首次评估、评分预警、护士查看结果。
- 页面必须能真实操作和落库，不能仅写静态 UI。

### 本阶段不要做

- 不实现完整任务中心、宣教阅读、主动症状报告、随访和路径调整；这些属于 P2。
- 不实现管理员量表/路径/规则配置 UI、科研导出、完整审计浏览或 AI mock UI；这些属于 P3。
- 不制作最终截图或用户手册；这些属于 P4。
- 不连接任何外部系统或 AI API，不做患者注册、文件上传、微信/短信推送。

## 实现约束

- 所有服务端写操作使用 Zod、RBAC、事务和审计；不以隐藏按钮代替服务端权限。
- SQLite/Drizzle 仅在 Node.js runtime 使用，不把数据库代码打入 Edge runtime。
- 评分、风险和权限逻辑应保持纯函数或小型领域服务，便于后续复用和测试。
- 患者端以 `390×844` 设计，管理员端以 `1280×800` 设计；本阶段虽不做最终验收，也不能留下明显横向溢出。
- 说明性长期规则仅更新根目录 `AGENTS.md`，不要新增 README 或阶段总结 Markdown。

## 验证要求

至少执行并修复所有失败：

```bash
npm config get registry
npm run db:reset
npm run lint
npm run typecheck
npm run test
npm run build
```

手工检查：

- 从带 basePath 的登录页分别登录三个固定账号。
- 护士创建患者和账号，确认密码只显示一次；新患者可登录。
- 患者填写并提交演示量表；刷新后结果仍在。
- 高风险输入生成预警，护士端能看到；患者不能访问护士/管理员路由。
- Logo 在 390×844 和 1280×800 下完整、不变形、无资源 404。

## 完成标准与交接

- 上述垂直闭环、命令和检查全部通过后才算 P1 完成。
- 给 P2 留下稳定 schema、领域服务、角色布局、固定 seed ID 和可复用表单/反馈组件。
- 在交接信息中明确 migration 版本、演示账号、当前数据计数和仍未实现的 P2 功能；不要把交接另写成 Markdown 文件。
