import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { activateUserAccount, deactivateUserAccount, resetUserPassword } from '../../../../../lib/services/patient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ action: z.enum(['reset', 'deactivate', 'activate']) });

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const admin = await requireRole('ADMIN');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '用户 ID 非法' }, { status: 400 });
  // 禁止管理员对自己账号执行敏感操作，避免自锁
  if (id === admin.id) return NextResponse.json({ ok: false, error: '不允许对自己的账号执行此操作' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  try {
    if (parsed.data.action === 'reset') {
      const newPassword = await resetUserPassword(id, admin.id, admin.role);
      return NextResponse.json({ ok: true, newPassword });
    } else if (parsed.data.action === 'deactivate') {
      await deactivateUserAccount(id, admin.id, admin.role);
      return NextResponse.json({ ok: true });
    } else {
      await activateUserAccount(id, admin.id, admin.role);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '操作失败' }, { status: 400 });
  }
}
