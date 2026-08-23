import { redirect } from 'next/navigation';
import { requireRole } from '../../../lib/guard';

// 第7 轮：趋势内容已并入 /patient/profile；保留路由便于可能的旧链接/收藏，
// 直接 302 重定向到 profile 页。
export const dynamic = 'force-dynamic';

export default async function TrendsRedirectPage() {
  await requireRole('PATIENT');
  redirect('/patient/profile');
}
