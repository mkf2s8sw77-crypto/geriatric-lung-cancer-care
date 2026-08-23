import fs from 'node:fs';
import path from 'node:path';
import { getDb, closeDb } from '../db/client';
import { users, patients, scales, pathways, educationResources, assessments, tasks, symptomReports, alerts, followups, aiAnalyses } from '../db/schema';
import { count } from 'drizzle-orm';

async function main() {
  const errors: string[] = [];
  const docsPath = 'docs/老年肺癌患者症状群智能评估与全病程管理系统概要设计.md';
  if (!fs.existsSync(docsPath)) errors.push('manual not found');
  if (!fs.existsSync('screenshots')) errors.push('screenshots dir not found');
  // 验证图片引用
  if (fs.existsSync(docsPath)) {
    const md = fs.readFileSync(docsPath, 'utf-8');
    const refs = Array.from(md.matchAll(/\!\[[^\]]*\]\(\.\.\/screenshots\/([^)]+)\)/g)).map((m) => m[1]);
    for (const r of refs) {
      const p = path.join('screenshots', r);
      if (!fs.existsSync(p)) errors.push('missing image: ' + r);
    }
    console.log('[verify] image refs:', refs.length);
    // 半角标点检测
    const halfCJK = md.match(/[\u4e00-\u9fff][,.;:!?][\s\u4e00-\u9fff]/g) || [];
    if (halfCJK.length > 0) errors.push('half-width punct in CJK: ' + halfCJK.slice(0, 3).join(','));
  }
  // 数据库统计
  const db = getDb();
  const u = await db.select({ c: count() }).from(users);
  const p = await db.select({ c: count() }).from(patients);
  const s = await db.select({ c: count() }).from(scales);
  const pw = await db.select({ c: count() }).from(pathways);
  const ed = await db.select({ c: count() }).from(educationResources);
  const a = await db.select({ c: count() }).from(assessments);
  const t = await db.select({ c: count() }).from(tasks);
  const sr = await db.select({ c: count() }).from(symptomReports);
  const al = await db.select({ c: count() }).from(alerts);
  const f = await db.select({ c: count() }).from(followups);
  const ai = await db.select({ c: count() }).from(aiAnalyses);
  console.log('[verify] users:', u[0].c, 'patients:', p[0].c, 'scales:', s[0].c, 'pathways:', pw[0].c, 'edu:', ed[0].c);
  console.log('[verify] assessments:', a[0].c, 'tasks:', t[0].c, 'symptom_reports:', sr[0].c, 'alerts:', al[0].c, 'followups:', f[0].c, 'ai:', ai[0].c);
  if (p[0].c < 24) errors.push('patients < 24');
  if (a[0].c < 180) errors.push('assessments < 180');
  if (t[0].c < 120) errors.push('tasks < 120');
  if (sr[0].c < 30) errors.push('symptom_reports < 30');
  if (ed[0].c < 18) errors.push('edu < 18');
  closeDb();
  if (errors.length > 0) {
    console.error('[verify] FAILED:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  } else {
    console.log('[verify] PASS');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
