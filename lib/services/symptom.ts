import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { symptomReports, alerts } from '../../db/schema';
import { classifySymptomReportRisk } from '../scoring';
import { recordAudit } from '../audit';

const SYMPTOM_NAME_MAP: Record<string, string> = {
  fatigue: '疲乏无力', pain: '疼痛', dyspnea: '气短/呼吸困难', cough: '咳嗽', sleep: '睡眠紊乱',
  appetite: '食欲下降', mood: '情绪低落', nausea: '恶心呕吐', weight: '体重变化', daily: '日常活动受限',
};

export const SYMPTOM_OPTIONS = SYMPTOM_NAME_MAP;

export const symptomReportSchema = z.object({
  symptomCode: z.string().min(1).max(40),
  severity: z.coerce.number().int().min(0).max(10),
  occurredAt: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}/),
  note: z.string().max(500).optional().default(''),
});

export async function listPatientReports(patientId: number) {
  const db = getDb();
  return await db.select().from(symptomReports).where(eq(symptomReports.patientId, patientId)).orderBy(desc(symptomReports.occurredAt)).limit(20);
}

export async function createSymptomReport(input: z.infer<typeof symptomReportSchema> & { patientId: number; actorUserId: number }) {
  const db = getDb();
  const occurredAt = new Date(input.occurredAt);
  if (occurredAt.getTime() > Date.now()) throw new Error('发生时间不能晚于当前时间');
  const name = SYMPTOM_NAME_MAP[input.symptomCode] || input.symptomCode;
  const inserted = await db.insert(symptomReports).values({
    patientId: input.patientId,
    symptomCode: input.symptomCode,
    symptomName: name,
    severity: input.severity,
    occurredAt: input.occurredAt,
    note: input.note || '',
  }).returning({ id: symptomReports.id });

  const risk = classifySymptomReportRisk(input.severity);
  if (risk.level !== 'low') {
    await db.insert(alerts).values({
      patientId: input.patientId,
      source: '患者主动报告',
      sourceId: inserted[0].id,
      level: risk.level,
      ruleVersion: 'demo-risk-v1@1',
      ruleSnapshot: JSON.stringify([risk.reason]),
      status: '未处理',
      summary: `患者主动报告 ${name} ${input.severity} 分`,
    });
  }
  await recordAudit({
    actorUserId: input.actorUserId,
    actorRole: 'PATIENT',
    action: '提交症状报告',
    targetType: '症状报告',
    targetId: String(inserted[0].id),
    summary: `${name} ${input.severity} 分`,
  });
  return { id: inserted[0].id, alertLevel: risk.level };
}
