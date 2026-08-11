import { eq, desc, and, gte, lte, sql, isNotNull, inArray } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { scales, scaleItems, pathways, pathwaySteps, riskRules, educationResources, aiAnalyses, patients, assessments, alerts, tasks, symptomReports, auditLogs, users, followups, interventions } from '../../db/schema';

export type DashboardStats = {
  totalPatients: number;
  patientsByStatus: Record<string, number>;
  patientsByStage: Record<string, number>;
  riskDistribution: Record<'low' | 'medium' | 'high', number>;
  openAlerts: number;
  overdueTasks: number;
  recentAssessments: number;
  trendDaily: Array<{ date: string; count: number; avgTotal: number }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  const pats = await db.select().from(patients);
  const statusCount: Record<string, number> = {};
  const stageCount: Record<string, number> = {};
  for (const p of pats) {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    stageCount[p.treatmentStage] = (stageCount[p.treatmentStage] || 0) + 1;
  }
  const openAlertsRows = await db.select({ c: sql<number>`count(*)` }).from(alerts).where(eq(alerts.status, '未处理'));
  const openAlerts = openAlertsRows[0]?.c || 0;
  const overdueRows = await db.select({ c: sql<number>`count(*)` }).from(tasks).where(eq(tasks.status, '未完成'));
  const overdueTasks = overdueRows[0]?.c || 0;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const isoToday = todayStart.toISOString().slice(0, 10);
  const todayAssess = await db.select({ c: sql<number>`count(*)` }).from(assessments).where(and(eq(assessments.status, '已提交'), gte(assessments.submittedAt, isoToday)));
  const recentAssessments = todayAssess[0]?.c || 0;
  // 风险分布：基于最新已提交评估
  const recent = await db.select().from(assessments).where(eq(assessments.status, '已提交')).orderBy(desc(assessments.submittedAt));
  const latestByPatient = new Map<number, typeof recent[number]>();
  for (const a of recent) {
    if (!latestByPatient.has(a.patientId)) latestByPatient.set(a.patientId, a);
  }
  const dist = { low: 0, medium: 0, high: 0 };
  for (const a of latestByPatient.values()) {
    if (a.riskLevel === 'low' || a.riskLevel === 'medium' || a.riskLevel === 'high') dist[a.riskLevel]++;
  }
  // 近30天每日评估计数 + 均分
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30); cutoff.setHours(0,0,0,0);
  const allSub = await db.select().from(assessments).where(and(eq(assessments.status, '已提交'), gte(assessments.submittedAt, cutoff.toISOString())));
  const byDay = new Map<string, { count: number; total: number }>();
  for (const a of allSub) {
    const d = (a.submittedAt || a.createdAt).slice(0, 10);
    const cur = byDay.get(d) || { count: 0, total: 0 };
    cur.count++;
    cur.total += a.totalScore || 0;
    byDay.set(d, cur);
  }
  const trendDaily: Array<{ date: string; count: number; avgTotal: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10);
    const cur = byDay.get(key);
    trendDaily.push({ date: key, count: cur?.count || 0, avgTotal: cur && cur.count > 0 ? Number((cur.total / cur.count).toFixed(2)) : 0 });
  }
  return {
    totalPatients: pats.length,
    patientsByStatus: statusCount,
    patientsByStage: stageCount,
    riskDistribution: dist,
    openAlerts,
    overdueTasks,
    recentAssessments,
    trendDaily,
  };
}

export async function listAllPatients(filter: { stage?: string; status?: string; q?: string } = {}) {
  const db = getDb();
  let all = await db.select().from(patients);
  if (filter.stage) all = all.filter((p) => p.treatmentStage === filter.stage);
  if (filter.status) all = all.filter((p) => p.status === filter.status);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    all = all.filter((p) => p.fullName.toLowerCase().includes(q) || p.researchNo.toLowerCase().includes(q));
  }
  return all;
}

export async function listAllUsers() {
  const db = getDb();
  return await db.select().from(users);
}

export async function listScales() {
  const db = getDb();
  return await db.select().from(scales);
}

export async function listPathways() {
  const db = getDb();
  return await db.select().from(pathways);
}

export async function listRiskRules() {
  const db = getDb();
  return await db.select().from(riskRules);
}

export async function listEducation() {
  const db = getDb();
  return await db.select().from(educationResources);
}

export async function listAuditLogs(filter: { actorId?: number; action?: string; fromDate?: string; toDate?: string } = {}) {
  const db = getDb();
  let all = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
  if (filter.actorId) all = all.filter((r) => r.actorUserId === filter.actorId);
  if (filter.action) all = all.filter((r) => r.action.includes(filter.action!));
  if (filter.fromDate) all = all.filter((r) => r.createdAt >= filter.fromDate!);
  if (filter.toDate) all = all.filter((r) => r.createdAt <= filter.toDate!);
  return all;
}

export async function researchAggregates(filter: { stage?: string; status?: string; risk?: string; fromDate?: string; toDate?: string } = {}) {
  const db = getDb();
  let pats = await db.select().from(patients);
  if (filter.stage) pats = pats.filter((p) => p.treatmentStage === filter.stage);
  if (filter.status) pats = pats.filter((p) => p.status === filter.status);

  // 收集每个患者的最新评估风险
  const patIds = pats.map((p) => p.id);
  const allAssess = patIds.length > 0 ? await db.select().from(assessments).where(inArray(assessments.patientId, patIds)) : [];
  const latestByPatient = new Map<number, typeof allAssess[number]>();
  for (const a of allAssess) {
    if (a.status !== '已提交') continue;
    const cur = latestByPatient.get(a.patientId);
    if (!cur || (cur.submittedAt || '') < (a.submittedAt || '')) latestByPatient.set(a.patientId, a);
  }
  const dist = { low: 0, medium: 0, high: 0, none: 0 };
  for (const p of patIds) {
    const last = latestByPatient.get(p);
    if (!last) dist.none++;
    else if (last.riskLevel === 'low' || last.riskLevel === 'medium' || last.riskLevel === 'high') dist[last.riskLevel as 'low' | 'medium' | 'high']++;
  }
  if (filter.risk) {
    if (filter.risk !== 'none') {
      pats = pats.filter((p) => latestByPatient.get(p.id)?.riskLevel === filter.risk);
    } else {
      pats = pats.filter((p) => !latestByPatient.get(p.id));
    }
  }

  const allTasks = patIds.length > 0 ? await db.select().from(tasks).where(inArray(tasks.patientId, patIds)) : [];
  const completedTasks = allTasks.filter((t) => t.status === '已完成').length;
  const completionRate = allTasks.length > 0 ? Number(((completedTasks / allTasks.length) * 100).toFixed(1)) : 0;

  // 预警处置时长
  const handledAlerts = patIds.length > 0 ? await db.select().from(alerts).where(inArray(alerts.patientId, patIds)) : [];
  const handled = handledAlerts.filter((a) => a.handledAt);
  const avgHandlingHours = handled.length > 0 ? Number((handled.reduce((s, a) => s + (new Date(a.handledAt!).getTime() - new Date(a.createdAt).getTime()), 0) / handled.length / 3600000).toFixed(2)) : 0;

  return {
    filteredPatientCount: pats.length,
    riskDistribution: dist,
    taskCompletionRate: completionRate,
    avgAlertHandlingHours: avgHandlingHours,
  };
}

export async function buildResearchCSV(filter: { stage?: string; status?: string; risk?: string; fromDate?: string; toDate?: string } = {}): Promise<string> {
  const db = getDb();
  let pats = await db.select().from(patients);
  if (filter.stage) pats = pats.filter((p) => p.treatmentStage === filter.stage);
  if (filter.status) pats = pats.filter((p) => p.status === filter.status);
  const patIds = pats.map((p) => p.id);
  const allAssess = patIds.length > 0 ? await db.select().from(assessments).where(inArray(assessments.patientId, patIds)) : [];
  const latestByPatient = new Map<number, typeof allAssess[number]>();
  for (const a of allAssess) {
    if (a.status !== '已提交') continue;
    const cur = latestByPatient.get(a.patientId);
    if (!cur || (cur.submittedAt || '') < (a.submittedAt || '')) latestByPatient.set(a.patientId, a);
  }
  let filtered = pats;
  if (filter.risk) {
    if (filter.risk !== 'none') filtered = filtered.filter((p) => latestByPatient.get(p.id)?.riskLevel === filter.risk);
    else filtered = filtered.filter((p) => !latestByPatient.get(p.id));
  }
  const rows: string[] = [];
  // UTF-8 BOM
  rows.push('﻿研究编号,性别,年龄段,诊断,治疗阶段,患者状态,评估总数,最近总分,最近风险,任务完成数,任务总数,随访完成数,预警总数');
  function csvEscape(v: unknown): string {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function ageBucket(age: number): string {
    if (age < 70) return '60-69';
    if (age < 80) return '70-79';
    return '80+';
  }
  for (const p of filtered) {
    const pa = allAssess.filter((a) => a.patientId === p.id);
    const last = latestByPatient.get(p.id);
    const pTasks = await db.select().from(tasks).where(eq(tasks.patientId, p.id));
    const completed = pTasks.filter((t) => t.status === '已完成').length;
    const flist = await db.select().from(followups).where(eq(followups.patientId, p.id));
    const fCompleted = flist.filter((f) => f.status === '已完成').length;
    const alist = await db.select().from(alerts).where(eq(alerts.patientId, p.id));
    rows.push([
      csvEscape(p.researchNo),
      csvEscape(p.gender === 'M' ? '男' : '女'),
      csvEscape(ageBucket(p.age)),
      csvEscape(p.diagnosis),
      csvEscape(p.treatmentStage),
      csvEscape(p.status),
      csvEscape(pa.length),
      csvEscape(last?.totalScore?.toFixed(1) ?? ''),
      csvEscape(last?.riskLevel ?? ''),
      csvEscape(completed),
      csvEscape(pTasks.length),
      csvEscape(fCompleted),
      csvEscape(alist.length),
    ].join(','));
  }
  return rows.join('\n') + '\n';
}
