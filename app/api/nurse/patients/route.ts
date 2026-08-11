import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../lib/guard';
import { createPatientAccount } from '../../../../lib/services/patient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  fullName: z.string().trim().min(1, '请填写姓名').max(50),
  phone: z.string().regex(/^[0-9]{11}$/, '电话必须为 11 位数字'),
  age: z.coerce.number().int().min(40, '年龄过小').max(120, '年龄过大'),
  gender: z.enum(['M', 'F']),
  diagnosis: z.string().trim().min(1, '请选择诊断'),
  treatmentStage: z.string().trim().min(1, '请选择治疗阶段'),
  enrollmentDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/, '请填写合法日期'),
  followupDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/, '请填写合法日期'),
  primaryNurseId: z.number().int().nullable(),
  actorUserId: z.number().int(),
  actorRole: z.string(),
});

export async function POST(req: NextRequest) {
  const nurse = await requireRole('NURSE');
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  raw = { ...(raw as Record<string, unknown>), actorUserId: nurse.id, actorRole: nurse.role, primaryNurseId: nurse.id };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return NextResponse.json({ ok: false, error: '请检查表单字段', fieldErrors }, { status: 400 });
  }
  if (new Date(parsed.data.followupDate) < new Date(parsed.data.enrollmentDate)) {
    return NextResponse.json({ ok: false, error: '下次随访日期不能早于纳入日期', fieldErrors: { followupDate: '下次随访日期不能早于纳入日期' } }, { status: 400 });
  }
  try {
    const r = await createPatientAccount(parsed.data);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '建档失败' }, { status: 500 });
  }
}
