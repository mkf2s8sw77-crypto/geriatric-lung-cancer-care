import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const now = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

// users: 管理员/护士/患者账号统一表
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(), // PATIENT | NURSE | ADMIN
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(now()),
  updatedAt: text('updated_at').notNull().default(now()),
}, (t) => ({
  uniqUsername: uniqueIndex('users_username_uniq').on(t.username),
  roleIdx: index('users_role_idx').on(t.role),
}));

// sessions
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  uniqToken: uniqueIndex('sessions_token_uniq').on(t.tokenHash),
  userIdx: index('sessions_user_idx').on(t.userId),
}));

// patients
export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  researchNo: text('research_no').notNull(),
  fullName: text('full_name').notNull(), // 演示用虚构姓名
  phone: text('phone').notNull(), // 演示虚构
  age: integer('age').notNull(),
  gender: text('gender').notNull(), // M | F
  diagnosis: text('diagnosis').notNull(),
  treatmentStage: text('treatment_stage').notNull(), // 治疗中 / 康复期 / 随访期
  enrollmentDate: text('enrollment_date').notNull(),
  followupDate: text('followup_date').notNull(),
  primaryNurseId: integer('primary_nurse_id').references(() => users.id),
  status: text('status').notNull().default('在组'), // 在组 / 已完成 / 失访 / 退出
  createdAt: text('created_at').notNull().default(now()),
  updatedAt: text('updated_at').notNull().default(now()),
}, (t) => ({
  uniqResearch: uniqueIndex('patients_research_no_uniq').on(t.researchNo),
  userIdx: uniqueIndex('patients_user_uniq').on(t.userId),
  nurseIdx: index('patients_primary_nurse_idx').on(t.primaryNurseId),
  statusIdx: index('patients_status_idx').on(t.status),
}));

// scales 量表版本
export const scales = sqliteTable('scales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  status: text('status').notNull().default('草稿'), // 草稿 / 已发布 / 停用
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(true),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
  updatedAt: text('updated_at').notNull().default(now()),
}, (t) => ({
  uniqCodeVer: uniqueIndex('scales_code_ver_uniq').on(t.code, t.version),
}));

// scale items 题目
export const scaleItems = sqliteTable('scale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scaleId: integer('scale_id').notNull().references(() => scales.id),
  ordinal: integer('ordinal').notNull(),
  code: text('code').notNull(),
  prompt: text('prompt').notNull(),
  minScore: integer('min_score').notNull().default(0),
  maxScore: integer('max_score').notNull().default(10),
  weight: real('weight').notNull().default(1.0),
}, (t) => ({
  uniqScaleItem: uniqueIndex('scale_items_uniq').on(t.scaleId, t.ordinal),
}));

// assessments 评估
export const assessments = sqliteTable('assessments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  scaleId: integer('scale_id').notNull().references(() => scales.id),
  filledByUserId: integer('filled_by_user_id').notNull().references(() => users.id),
  source: text('source').notNull().default('患者'), // 患者 / 护士代填
  status: text('status').notNull().default('草稿'), // 草稿 / 已提交
  totalScore: real('total_score'),
  topSymptomCode: text('top_symptom_code'),
  topSymptomScore: real('top_symptom_score'),
  deltaVsPrev: real('delta_vs_prev'),
  riskLevel: text('risk_level'), // low / medium / high
  submittedAt: text('submitted_at'),
  createdAt: text('created_at').notNull().default(now()),
  updatedAt: text('updated_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('assessments_patient_idx').on(t.patientId),
  statusIdx: index('assessments_status_idx').on(t.status),
}));

// assessment answers
export const assessmentAnswers = sqliteTable('assessment_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assessmentId: integer('assessment_id').notNull().references(() => assessments.id),
  scaleItemId: integer('scale_item_id').notNull().references(() => scaleItems.id),
  score: real('score').notNull(),
}, (t) => ({
  uniqAns: uniqueIndex('assessment_answers_uniq').on(t.assessmentId, t.scaleItemId),
}));

// risk rules
export const riskRules = sqliteTable('risk_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  status: text('status').notNull().default('草稿'),
  thresholdsJson: text('thresholds_json').notNull(), // JSON
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  uniqCodeVer: uniqueIndex('risk_rules_uniq').on(t.code, t.version),
}));

// alerts
export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  source: text('source').notNull(), // 评估 / 患者主动报告 / 任务逾期
  sourceId: integer('source_id'),
  level: text('level').notNull(), // low / medium / high
  ruleVersion: text('rule_version').notNull(),
  ruleSnapshot: text('rule_snapshot').notNull(),
  status: text('status').notNull().default('未处理'), // 未处理 / 已确认 / 已忽略 / 已升级
  handlerUserId: integer('handler_user_id').references(() => users.id),
  handledAt: text('handled_at'),
  summary: text('summary').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('alerts_patient_idx').on(t.patientId),
  statusIdx: index('alerts_status_idx').on(t.status),
  levelIdx: index('alerts_level_idx').on(t.level),
}));

// pathways 护理路径版本
export const pathways = sqliteTable('pathways', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  applicableStage: text('applicable_stage').notNull(),
  status: text('status').notNull().default('草稿'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  uniqCodeVer: uniqueIndex('pathways_uniq').on(t.code, t.version),
}));

// pathway steps
export const pathwaySteps = sqliteTable('pathway_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pathwayId: integer('pathway_id').notNull().references(() => pathways.id),
  ordinal: integer('ordinal').notNull(),
  taskType: text('task_type').notNull(), // 评估/随访/用药/复诊/康复/宣教
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  relativeDay: integer('relative_day').notNull().default(0),
}, (t) => ({
  uniqStep: uniqueIndex('pathway_steps_uniq').on(t.pathwayId, t.ordinal),
}));

// patient pathway assignments
export const patientPathways = sqliteTable('patient_pathways', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  pathwayId: integer('pathway_id').notNull().references(() => pathways.id),
  assignedAt: text('assigned_at').notNull().default(now()),
  assignedBy: integer('assigned_by').notNull().references(() => users.id),
}, (t) => ({
  uniqAssign: uniqueIndex('patient_pathways_uniq').on(t.patientId, t.pathwayId),
}));

// tasks
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  pathwayId: integer('pathway_id').references(() => pathways.id),
  pathwayStepId: integer('pathway_step_id').references(() => pathwaySteps.id),
  taskType: text('task_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  scheduledDate: text('scheduled_date').notNull(),
  status: text('status').notNull().default('待完成'), // 待完成 / 已完成 / 未完成 / 暂不适用 / 已取消
  feedbackNote: text('feedback_note').notNull().default(''),
  completedAt: text('completed_at'),
  adjustedFromId: integer('adjusted_from_id'),
  adjustedReason: text('adjusted_reason'),
  createdAt: text('created_at').notNull().default(now()),
  updatedAt: text('updated_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('tasks_patient_idx').on(t.patientId),
  dateIdx: index('tasks_date_idx').on(t.scheduledDate),
  statusIdx: index('tasks_status_idx').on(t.status),
}));

// symptom reports
export const symptomReports = sqliteTable('symptom_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  symptomCode: text('symptom_code').notNull(),
  symptomName: text('symptom_name').notNull(),
  severity: integer('severity').notNull(),
  occurredAt: text('occurred_at').notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('symptom_reports_patient_idx').on(t.patientId),
}));

// followups 随访
export const followups = sqliteTable('followups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  nurseId: integer('nurse_id').notNull().references(() => users.id),
  scheduledAt: text('scheduled_at').notNull(),
  status: text('status').notNull().default('计划'), // 计划 / 已完成 / 已取消
  method: text('method').notNull().default('电话'),
  summary: text('summary').notNull().default(''),
  nextFollowupAt: text('next_followup_at'),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('followups_patient_idx').on(t.patientId),
  nurseIdx: index('followups_nurse_idx').on(t.nurseId),
}));

// interventions 干预
export const interventions = sqliteTable('interventions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  nurseId: integer('nurse_id').notNull().references(() => users.id),
  alertId: integer('alert_id').references(() => alerts.id),
  actionType: text('action_type').notNull(), // 电话联系/护理指导/建议就医/复评
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('interventions_patient_idx').on(t.patientId),
}));

// education resources
export const educationResources = sqliteTable('education_resources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull(), // 用药/饮食/康复/心理/复诊
  applicableStage: text('applicable_stage').notNull(),
  summary: text('summary').notNull().default(''),
  body: text('body').notNull().default(''),
  readMinutes: integer('read_minutes').notNull().default(3),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  categoryIdx: index('education_category_idx').on(t.category),
}));

// patient education reads
export const patientEducationReads = sqliteTable('patient_education_reads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  resourceId: integer('resource_id').notNull().references(() => educationResources.id),
  readAt: text('read_at').notNull().default(now()),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
}, (t) => ({
  uniqRead: uniqueIndex('patient_education_reads_uniq').on(t.patientId, t.resourceId),
}));

// education assignments
export const educationAssignments = sqliteTable('education_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  resourceId: integer('resource_id').notNull().references(() => educationResources.id),
  assignedBy: integer('assigned_by').notNull().references(() => users.id),
  assignedAt: text('assigned_at').notNull().default(now()),
}, (t) => ({
  uniqAssign: uniqueIndex('education_assignments_uniq').on(t.patientId, t.resourceId),
}));

// ai analyses (deterministic mock) · Phase 5
export const aiAnalyses = sqliteTable('ai_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  assessmentId: integer('assessment_id').references(() => assessments.id),
  model: text('model').notNull().default('mock-geriatric-lung-v1'),
  style: text('style').notNull().default('balanced'), // balanced / conservative / proactive
  inputJson: text('input_json').notNull(),
  outputJson: text('output_json').notNull(),
  evidenceJson: text('evidence_json').notNull().default('[]'), // 触发的关键阈值（JSON 数组）
  patientHint: text('patient_hint').notNull().default(''),     // 给患者的简短提示
  status: text('status').notNull().default('已生成'), // 已生成 / 已采纳 / 部分采纳 / 未采纳
  nurseNote: text('nurse_note').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  patientIdx: index('ai_analyses_patient_idx').on(t.patientId),
  styleIdx: index('ai_analyses_style_idx').on(t.style),
}));

// audit logs
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  summary: text('summary').notNull().default(''),
  createdAt: text('created_at').notNull().default(now()),
}, (t) => ({
  actorIdx: index('audit_actor_idx').on(t.actorUserId),
  actionIdx: index('audit_action_idx').on(t.action),
}));
