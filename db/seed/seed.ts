import { eq } from 'drizzle-orm';
import { hashPassword } from '../../lib/auth';
import { getDb } from '../client';
import { runMigrations } from './migrate';
import {
  users, patients, scales, scaleItems, riskRules, assessments, assessmentAnswers,
  alerts, pathways, pathwaySteps, patientPathways, tasks, symptomReports, followups,
  interventions, educationResources, patientEducationReads, educationAssignments,
  aiAnalyses, sessions, auditLogs,
} from '../schema';
import { computeScore, classifyRisk } from '../../lib/scoring';

let _seed = 20260812;
function rand(): number {
  let t = (_seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function isoDay(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString();
}

const SURNAMES = ['苏南', '江南', '云山', '怀远', '映雪', '安然', '知秋', '远帆', '清和', '长河', '映月', '晓川'];
const GIVEN_NAMES = ['鹤年', '松龄', '鹤松', '竹安', '南山', '秋实', '云起', '鹤鸣', '寿康', '福安', '永宁', '怀瑾', '思齐', '怀仁'];
const PHONE_PREFIX = ['139', '138', '152', '156', '188', '189'];
function genName(): string {
  return pick(SURNAMES) + pick(GIVEN_NAMES) + '（演示）';
}
function genPhone(): string {
  return pick(PHONE_PREFIX) + String(randInt(10000000, 99999999));
}
function genResearchNo(idx: number): string {
  return 'GL2026-' + String(idx).padStart(4, '0');
}
function genUsername(idx: number): string {
  return 'patient_demo_' + String(idx).padStart(4, '0');
}

const SYMPTOMS: Array<{ code: string; name: string }> = [
  { code: 'fatigue', name: '疲乏无力' },
  { code: 'pain', name: '疼痛' },
  { code: 'dyspnea', name: '气短/呼吸困难' },
  { code: 'cough', name: '咳嗽' },
  { code: 'sleep', name: '睡眠紊乱' },
  { code: 'appetite', name: '食欲下降' },
  { code: 'mood', name: '情绪低落' },
  { code: 'nausea', name: '恶心呕吐' },
  { code: 'weight', name: '体重变化' },
  { code: 'daily', name: '日常活动受限' },
];

const STAGES = ['治疗中', '康复期', '随访期'];

const EDU_BODIES: Array<{ title: string; category: string; applicableStage: string; body: string }> = [
  { title: '用药安全：口服靶向药的正确方式', category: '用药', applicableStage: '治疗中', body: '请按医嘱固定时间、固定剂量服药；不可自行增减剂量或停药。漏服时若与下一次服药间隔不足 8 小时，请直接跳过本次，不要双倍补服。任何异常出血、严重皮疹或呼吸困难应立即联系护士。' },
  { title: '饮食建议：高蛋白与清淡', category: '饮食', applicableStage: '治疗中', body: '建议每日摄入优质蛋白，如鸡蛋、鱼肉、瘦肉、豆制品；避免生冷、辛辣与高糖油炸食物。少食多餐有助于缓解食欲下降。如出现严重恶心呕吐超过 24 小时，请联系护士。' },
  { title: '康复活动：呼吸训练与步行', category: '康复', applicableStage: '康复期', body: '每日可在餐后 30 分钟进行 10 分钟深呼吸训练，配合缓慢步行 15 至 20 分钟。若出现明显气短、胸闷或胸痛，应立即停止并联系护士。' },
  { title: '情绪调节：保持联系与倾诉', category: '心理', applicableStage: '康复期', body: '家属应主动倾听患者感受，避免评价性语言。每日安排固定的交流时间，鼓励患者表达情绪。如持续情绪低落超过两周，请联系护士安排专业心理支持。' },
  { title: '复诊准备：资料与疑问清单', category: '复诊', applicableStage: '随访期', body: '复诊前请准备好近期用药清单、异常症状记录与想要咨询的问题清单。提前一晚准备好医保卡、就诊卡与既往检查报告。' },
  { title: '疼痛自我评估与上报', category: '用药', applicableStage: '治疗中', body: '使用 0-10 分评估疼痛强度：0 分无痛，10 分最严重。3 分以下可暂观察；4-6 分应联系护士；7 分及以上应立即联系护士或就医。' },
  { title: '睡眠改善：建立规律作息', category: '心理', applicableStage: '康复期', body: '每天尽量在固定时间上床与起床；睡前避免使用电子设备、咖啡与浓茶。若连续三天以上难以入睡或早醒，请联系护士。' },
  { title: '气短应急处理', category: '康复', applicableStage: '治疗中', body: '感到气短时立即停下活动，坐位或半卧位休息；缓慢用鼻吸气、口呼气 6-8 次；如未缓解或伴有胸痛、嘴唇发紫，请立即拨打急救电话。' },
  { title: '化疗期间个人卫生', category: '康复', applicableStage: '治疗中', body: '每日温水沐浴，避免盆浴；勤换内衣与床单；餐前便后规范洗手。如出现持续发热、口腔溃疡或腹泻超过 24 小时，请联系护士。' },
  { title: '家属照护：安全与陪伴', category: '心理', applicableStage: '康复期', body: '家属应关注家中防滑、防跌倒措施；夜间保留低亮度夜灯；陪同患者外出时携带联系卡与近期用药清单。' },
  { title: '营养支持：补充维生素与水分', category: '饮食', applicableStage: '治疗中', body: '每日饮水 1500-2000 毫升（医嘱限制者除外）；适当摄入新鲜蔬果；避免生食与隔夜食物。如出现严重腹泻或便秘，请联系护士。' },
  { title: '复查指标：看懂血常规', category: '复诊', applicableStage: '随访期', body: '重点关注白细胞、血小板、血红蛋白数值。若医生提示指标异常，请按医嘱安排复查或联系护士。' },
  { title: '情绪支持小组介绍', category: '心理', applicableStage: '康复期', body: '本院每月组织线上情绪支持小组，由专业护士主持，帮助患者与家属互相交流。报名请联系责任护士。' },
  { title: '康复期步行计划', category: '康复', applicableStage: '康复期', body: '推荐从每日 500 步起步，每周增加 10%，逐步达到每日 3000 步。步行前后记录心率与自觉疲劳程度。' },
  { title: '用药提醒小技巧', category: '用药', applicableStage: '治疗中', body: '使用手机闹钟或药盒提醒服药；出门时随身携带一份用药清单与急救联系卡。' },
  { title: '复诊前常见疑问', category: '复诊', applicableStage: '随访期', body: '复诊常见疑问包括：是否需要空腹、是否需要停药、是否需要家属陪同。建议提前将疑问写在纸上带给医生。' },
  { title: '恶心呕吐的家庭处理', category: '饮食', applicableStage: '治疗中', body: '少量多次饮用温水或淡盐水；避免重口味食物；饭后 30 分钟保持上身直立。如 24 小时内呕吐超过 3 次请联系护士。' },
  { title: '失眠时的放松呼吸', category: '心理', applicableStage: '康复期', body: '睡前可用 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，缓慢呼气 8 秒，重复 4 个循环。如无效请记录并联系护士。' },
  { title: '康复期运动禁忌', category: '康复', applicableStage: '康复期', body: '血小板偏低时应避免剧烈运动与外伤；骨质疏松患者应避免跌倒风险高的运动；发热期间应暂停运动并及时就医。' },
  { title: '患者家属沟通指南', category: '心理', applicableStage: '康复期', body: '与患者沟通时使用开放式问题，避免评价；耐心倾听，不强求患者立即表达情绪；尊重患者的节奏。' },
];

function mockAI(input: { total: number; top: number; topName: string; stage: string; delta: number | null }) {
  const level = input.total >= 50 || input.top >= 8 ? 'high' : (input.total >= 30 || input.top >= 5 ? 'medium' : 'low');
  return {
    summary: input.topName + ' ' + input.top + ' 分；总分 ' + input.total + '（演示评估）',
    riskFactors: level === 'low' ? ['症状整体平稳'] : [input.topName + ' 突出'].concat(input.delta !== null && input.delta > 10 ? ['较上次加重'] : []),
    nurseReview: level === 'high' ? ['建议 24 小时内复评', '通知家属'] : (level === 'medium' ? ['本周内复评', '观察睡眠与饮食'] : ['按常规随访即可']),
    suggestedFollowup: level === 'high' ? '24 小时内' : (level === 'medium' ? '一周内' : '下次常规随访'),
    patientHint: level === 'high' ? '请及时联系护士或就医' : (level === 'medium' ? '请关注症状变化，必要时联系护士' : '请保持当前生活习惯'),
    disclaimer: '本结果为本地确定性演示分析（mock-geriatric-lung-v1），不构成临床诊断，所有建议须经医护人员确认。',
  };
}

export async function seedDatabase(): Promise<void> {
  runMigrations();
  const db = getDb();

  for (const t of [aiAnalyses, educationAssignments, patientEducationReads, interventions, followups, symptomReports, tasks, patientPathways, pathwaySteps, pathways, alerts, assessmentAnswers, assessments, scaleItems, scales, riskRules, patients, sessions, users, educationResources, auditLogs]) {
    try { await db.delete(t); } catch (e) { /* ignore */ }
  }

  const adminPwd = await hashPassword('Demo@2026');
  const nursePwd = await hashPassword('Demo@2026');
  const patientPwd = await hashPassword('Demo@2026');

  const adminRow = await db.insert(users).values({ username: 'admin_demo', displayName: '演示管理员', role: 'ADMIN', passwordHash: adminPwd, isActive: true }).returning({ id: users.id });
  const adminId = adminRow[0].id;
  const nurseRow = await db.insert(users).values({ username: 'nurse_demo', displayName: '演示护士', role: 'NURSE', passwordHash: nursePwd, isActive: true }).returning({ id: users.id });
  const nurseId = nurseRow[0].id;

  const scaleRow = await db.insert(scales).values({
    code: 'demo-symptom-cluster-v1',
    name: '老年肺癌症状群演示量表',
    version: 1,
    status: '已发布',
    isDemo: true,
    description: '本量表为本地演示量表，未经过临床验证。所有结果仅用于功能演示。',
  }).returning({ id: scales.id });
  const scaleId = scaleRow[0].id;
  const items: Array<{ id: number; code: string; name: string }> = [];
  for (let i = 0; i < SYMPTOMS.length; i++) {
    const s = SYMPTOMS[i];
    const it = await db.insert(scaleItems).values({ scaleId, ordinal: i + 1, code: s.code, prompt: '请评估您过去 24 小时内 "' + s.name + '" 的严重程度（0=无，10=最严重）。', minScore: 0, maxScore: 10, weight: 1.0 }).returning({ id: scaleItems.id });
    items.push({ id: it[0].id, code: s.code, name: s.name });
  }

  await db.insert(riskRules).values({
    code: 'demo-risk-v1', name: '演示风险规则 v1', version: 1, status: '已发布', isDemo: true,
    thresholdsJson: JSON.stringify({ totalMedium: 30, totalHigh: 50, topSymptomMedium: 5, topSymptomHigh: 8, deltaHigh: 15 }),
  });

  const pathwayData = [
    { code: 'pathway-treatment', name: '治疗期标准路径', stage: '治疗中', tasks: [
      { taskType: '评估', title: '症状评估', relativeDay: 0, description: '完成本周症状评估量表' },
      { taskType: '用药', title: '靶向药服用', relativeDay: 0, description: '按医嘱服药，记录异常反应' },
      { taskType: '随访', title: '电话随访', relativeDay: 3, description: '护士主动电话联系，了解用药与反应' },
      { taskType: '康复', title: '呼吸训练', relativeDay: 1, description: '每日完成呼吸训练 10 分钟' },
      { taskType: '宣教', title: '阅读化疗期间个人卫生', relativeDay: 0, description: '阅读并确认' },
      { taskType: '复诊', title: '门诊复诊', relativeDay: 7, description: '整理疑问清单，陪同复诊' },
    ] },
    { code: 'pathway-rehab', name: '康复期促进路径', stage: '康复期', tasks: [
      { taskType: '评估', title: '康复评估', relativeDay: 0, description: '完成康复评估' },
      { taskType: '康复', title: '步行锻炼', relativeDay: 1, description: '按计划完成步行' },
      { taskType: '宣教', title: '阅读康复期步行计划', relativeDay: 0, description: '阅读并确认' },
      { taskType: '随访', title: '家庭随访', relativeDay: 5, description: '护士家访或视频随访' },
      { taskType: '用药', title: '康复期用药', relativeDay: 0, description: '康复期辅助用药' },
    ] },
    { code: 'pathway-followup', name: '随访期维持路径', stage: '随访期', tasks: [
      { taskType: '评估', title: '症状复评', relativeDay: 0, description: '完成症状复评' },
      { taskType: '复诊', title: '门诊复诊', relativeDay: 14, description: '门诊复查' },
      { taskType: '随访', title: '电话随访', relativeDay: 7, description: '本周电话随访' },
      { taskType: '宣教', title: '阅读复诊前常见疑问', relativeDay: 1, description: '阅读并确认' },
    ] },
  ];
  const pathwayIds: number[] = [];
  for (const p of pathwayData) {
    const prow = await db.insert(pathways).values({ code: p.code, name: p.name, version: 1, applicableStage: p.stage, status: '已发布', isDemo: true }).returning({ id: pathways.id });
    pathwayIds.push(prow[0].id);
    for (let i = 0; i < p.tasks.length; i++) {
      const t = p.tasks[i];
      await db.insert(pathwaySteps).values({ pathwayId: prow[0].id, ordinal: i + 1, taskType: t.taskType, title: t.title, description: t.description, relativeDay: t.relativeDay });
    }
  }

  for (let i = 0; i < EDU_BODIES.length; i++) {
    const e = EDU_BODIES[i];
    await db.insert(educationResources).values({ title: e.title, category: e.category, applicableStage: e.applicableStage, summary: e.body.slice(0, 60), body: e.body, readMinutes: randInt(2, 5), enabled: true, sortOrder: i });
  }

  const totalPatients = 30;
  const patientDistribution: string[] = [];
  for (let i = 0; i < 24; i++) patientDistribution.push('在组');
  for (let i = 0; i < 3; i++) patientDistribution.push('已完成');
  for (let i = 0; i < 2; i++) patientDistribution.push('失访');
  patientDistribution.push('退出');

  for (let i = 0; i < totalPatients; i++) {
    const username = i === 0 ? 'patient_demo' : genUsername(i);
    const displayName = i === 0 ? '演示患者（家属代用）' : genName();
    const userRow = await db.insert(users).values({ username, displayName, role: 'PATIENT', passwordHash: patientPwd, isActive: true }).returning({ id: users.id });
    const userId = userRow[0].id;
    const stage = pick(STAGES);
    const status = patientDistribution[i];
    const enrollmentDate = isoDay(-randInt(30, 360));
    const followupDate = isoDay(randInt(1, 30));
    const patientRow = await db.insert(patients).values({
      userId,
      researchNo: genResearchNo(i + 1),
      fullName: displayName,
      phone: genPhone(),
      age: randInt(60, 85),
      gender: rand() < 0.5 ? 'F' : 'M',
      diagnosis: pick(['非小细胞肺癌 II 期', '非小细胞肺癌 III 期', '小细胞肺癌局限期', '肺腺癌 IV 期（演示）']),
      treatmentStage: stage,
      enrollmentDate,
      followupDate,
      primaryNurseId: nurseId,
      status,
    }).returning({ id: patients.id });
    const patientId = patientRow[0].id;

    let assignedPathwayId: number | null = null;
    if (status === '在组' || status === '已完成') {
      const stageIdx = stage === '治疗中' ? 0 : (stage === '康复期' ? 1 : 2);
      assignedPathwayId = pathwayIds[stageIdx];
      await db.insert(patientPathways).values({ patientId, pathwayId: assignedPathwayId, assignedBy: nurseId });
    }

    for (let a = 0; a < 6; a++) {
      const ageBias = stage === '康复期' ? 1.0 : (stage === '随访期' ? 0.6 : 1.4);
      const baseLevel = status === '在组' ? (a === 0 ? 0.6 : 0.4) : (status === '已完成' ? 0.2 : 0.0);
      const scoresInput = items.map((it) => {
        const base = randInt(0, 10);
        const adjusted = Math.max(0, Math.min(10, Math.round(base * baseLevel * ageBias + randInt(0, 3))));
        return { itemCode: it.code, itemName: it.name, score: adjusted, weight: 1.0, itemId: it.id };
      });
      const sc = computeScore(scoresInput);
      const scores = scoresInput;
      const submittedAt = isoDay(-randInt(0, 90) - a * 14);
      const aRow = await db.insert(assessments).values({
        patientId,
        scaleId,
        filledByUserId: userId,
        source: a === 0 && rand() < 0.2 ? '护士代填' : '患者',
        status: '已提交',
        totalScore: sc.totalScore,
        topSymptomCode: sc.topSymptomCode,
        topSymptomScore: sc.topSymptomScore,
        deltaVsPrev: a === 0 ? null : sc.totalScore * 0.1,
        riskLevel: classifyRisk({ totalScore: sc.totalScore, topSymptomScore: sc.topSymptomScore, deltaVsPrev: a === 0 ? null : sc.totalScore * 0.1 }).level,
        submittedAt,
      }).returning({ id: assessments.id });
      for (const s of scores) {
        await db.insert(assessmentAnswers).values({ assessmentId: aRow[0].id, scaleItemId: s.itemId, score: s.score });
      }
      const risk = classifyRisk({ totalScore: sc.totalScore, topSymptomScore: sc.topSymptomScore, deltaVsPrev: a === 0 ? null : sc.totalScore * 0.1 });
      if (risk.level !== 'low' && status === '在组') {
        const isHandled = rand() < 0.5;
        await db.insert(alerts).values({
          patientId,
          source: '评估',
          sourceId: aRow[0].id,
          level: risk.level,
          ruleVersion: 'demo-risk-v1@1',
          ruleSnapshot: JSON.stringify(risk.reasons),
          status: isHandled ? '已确认' : '未处理',
          handlerUserId: isHandled ? nurseId : null,
          handledAt: isHandled ? submittedAt : null,
          summary: risk.reasons.join('；'),
        });
      }
      const ai = mockAI({ total: sc.totalScore, top: sc.topSymptomScore, topName: sc.topSymptomName || '—', stage, delta: a === 0 ? null : sc.totalScore * 0.1 });
      await db.insert(aiAnalyses).values({
        patientId,
        assessmentId: aRow[0].id,
        model: 'mock-geriatric-lung-v1',
        inputJson: JSON.stringify({ total: sc.totalScore, top: sc.topSymptomScore, topName: sc.topSymptomName, stage }),
        outputJson: JSON.stringify(ai),
        status: pick(['已采纳', '部分采纳', '未采纳', '已生成']),
      });
    }

    if ((status === '在组' || status === '已完成') && assignedPathwayId) {
      const steps = await db.select().from(pathwaySteps).where(eq(pathwaySteps.pathwayId, assignedPathwayId));
      for (let t = 0; t < 6; t++) {
        const step = steps[(t + Math.floor(rand() * steps.length)) % steps.length];
        const offset = step.relativeDay + randInt(-2, 5);
        const isDone = status === '已完成' || rand() < 0.3;
        const isOverdue = !isDone && offset < 0;
        await db.insert(tasks).values({
          patientId,
          pathwayId: assignedPathwayId,
          pathwayStepId: step.id,
          taskType: step.taskType,
          title: step.title,
          description: step.description,
          scheduledDate: isoDay(offset),
          status: isDone ? '已完成' : (isOverdue ? '未完成' : '待完成'),
          feedbackNote: isDone ? '已完成，反馈良好' : '',
          completedAt: isDone ? isoDay(offset) : null,
        });
      }
    }

    if (status === '在组') {
      for (let sr = 0; sr < 2; sr++) {
        const sym = pick(SYMPTOMS);
        const severity = randInt(0, 10);
        await db.insert(symptomReports).values({
          patientId,
          symptomCode: sym.code,
          symptomName: sym.name,
          severity,
          occurredAt: isoDay(-randInt(0, 30)),
          note: '演示用主动症状报告',
        });
        if (severity >= 5) {
          await db.insert(alerts).values({
            patientId,
            source: '患者主动报告',
            sourceId: null,
            level: severity >= 8 ? 'high' : 'medium',
            ruleVersion: 'demo-risk-v1@1',
            ruleSnapshot: JSON.stringify(['症状 ' + sym.name + ' 严重度 ' + severity]),
            status: '未处理',
            summary: '患者主动报告 ' + sym.name + ' ' + severity + ' 分',
          });
        }
      }
    }

    if (status === '在组') {
      for (let f = 0; f < 2; f++) {
        const isDone = f === 0;
        await db.insert(followups).values({
          patientId,
          nurseId,
          scheduledAt: isoDay(f === 0 ? -randInt(1, 7) : randInt(1, 7)),
          status: isDone ? '已完成' : '计划',
          method: pick(['电话', '门诊', '视频']),
          summary: isDone ? '随访完成，症状稳定' : '',
          nextFollowupAt: isDone ? isoDay(randInt(7, 14)) : null,
        });
      }
    }

    if (status === '在组' && rand() < 0.5) {
      await db.insert(interventions).values({
        patientId,
        nurseId,
        actionType: pick(['电话联系', '护理指导', '建议就医', '复评']),
        note: '已联系患者并给予护理指导',
      });
    }

    const edus = await db.select().from(educationResources).limit(5);
    for (let r = 0; r < 2; r++) {
      await db.insert(patientEducationReads).values({
        patientId,
        resourceId: edus[(r + i) % edus.length].id,
        confirmed: r === 0,
      });
      if (r === 0) {
        await db.insert(educationAssignments).values({
          patientId,
          resourceId: edus[(r + i) % edus.length].id,
          assignedBy: nurseId,
        });
      }
    }
  }

  console.log('[seed] accounts: admin_demo / nurse_demo / patient_demo (password Demo@2026)');
  console.log('[seed] patients: ' + totalPatients + ' | scales: 1 | pathways: 3 | edu: ' + EDU_BODIES.length);
}
