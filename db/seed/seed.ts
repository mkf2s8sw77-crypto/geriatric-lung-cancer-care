import { eq } from 'drizzle-orm';
import { hashPassword } from '../../lib/auth';
import { getDb } from '../client';
import { runMigrations } from './migrate';
import {
  users, patients, scales, scaleItems, riskRules, assessments, assessmentAnswers,
  alerts, pathways, pathwaySteps, patientPathways, tasks, symptomReports, followups,
  interventions, educationResources, patientEducationReads, educationAssignments,
  aiAnalyses, knowledgeBases, knowledgeQuestions, sessions, auditLogs,
} from '../schema';
import { computeScore, classifyRisk } from '../../lib/scoring';
import { generateMockAnalysis, defaultStyle, type AIAnalysisStyle } from '../../lib/services/ai/analysis';

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

function seedMockAI(input: { total: number; top: number; topName: string; topCode?: string; stage: string; delta: number | null; style: AIAnalysisStyle }) {
  return generateMockAnalysis({
    total: input.total,
    top: input.top,
    topName: input.topName,
    topCode: input.topCode,
    stage: input.stage,
    delta: input.delta,
  }, input.style);
}

export async function seedDatabase(): Promise<void> {
  runMigrations();
  const db = getDb();

  for (const t of [knowledgeQuestions, knowledgeBases, aiAnalyses, educationAssignments, patientEducationReads, interventions, followups, symptomReports, tasks, patientPathways, pathwaySteps, pathways, alerts, assessmentAnswers, assessments, scaleItems, scales, riskRules, patients, sessions, users, educationResources, auditLogs]) {
    try { await db.delete(t); } catch (e) { /* ignore */ }
  }

  const adminPwd = await hashPassword('123456');
  const nursePwd = await hashPassword('123456');
  const patientPwd = await hashPassword('123456');

  const adminRow = await db.insert(users).values({ username: 'admin', displayName: '演示管理员', role: 'ADMIN', passwordHash: adminPwd, isActive: true }).returning({ id: users.id });
  const adminId = adminRow[0].id;
  const nurseRow = await db.insert(users).values({ username: 'nurse', displayName: '演示护士', role: 'NURSE', passwordHash: nursePwd, isActive: true }).returning({ id: users.id });
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

  // Phase 5 · 30 条 mock 知识库（5 大类各 6 条）
  const KB_BODIES: Array<{ category: string; title: string; source: string; tags: string[]; body: string }> = [
    // 气道护理 6
    { category: '气道护理', title: '人工气道湿化频率与无菌操作', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['气道', '湿化', '无菌', '吸痰'], body: '人工气道患者建议每 1—2 小时评估湿化效果；湿化液应使用无菌蒸馏水，每日更换。吸痰前后应严格执行手卫生与无菌操作，吸痰管一次性使用，每次吸引时间不超过 15 秒。湿化罐温度建议维持在 32—37℃ 之间，过高易烫伤气道，过低则湿化不足。' },
    { category: '气道护理', title: '吸痰负压选择与吸引时长', source: '院内护理常规 2024 演示版', tags: ['吸痰', '负压', '吸引'], body: '成人吸痰负压建议控制在 80—150 mmHg；儿童 60—100 mmHg；新生儿 60—80 mmHg。每次吸引前应先评估患者指征：咳嗽无力、痰鸣音、呼吸困难或血氧下降。吸引顺序为：先气管内后口腔鼻腔，避免交叉污染。每次吸引不超过 15 秒，间隔 2—3 分钟。' },
    { category: '气道护理', title: '气道痉挛的应急识别与处理', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['气道', '痉挛', '应急'], body: '气道痉挛表现为突发呼吸困难、喘鸣、血氧下降、面唇发绀。应急处理：立即停止当前操作，给予高流量吸氧，安抚患者情绪；通知医生，备好支气管扩张剂与激素。必要时协助医生行气管插管或气管切开。事后记录发作时间、持续时长、诱因与处理措施。' },
    { category: '气道护理', title: '气管切开患者内套管清洗消毒', source: '院内护理常规 2024 演示版', tags: ['气切', '内套管', '消毒'], body: '气管切开患者内套管应每 4—6 小时清洗消毒一次；分泌物多时增加频次。流程：取出内套管→双氧水浸泡 5 分钟→刷洗内壁→流动水冲净→煮沸消毒 15 分钟或 0.5% 碘伏浸泡 30 分钟→无菌生理盐水冲洗后放回。操作时保持外管固定，避免脱管。' },
    { category: '气道护理', title: '呼吸机相关性肺炎预防集束化措施', source: 'NCCN 老年指南 2024 演示版', tags: ['呼吸机', '肺炎', '感染', '预防'], body: '预防 VAP 集束化措施：①床头抬高 30—45°；②每日唤醒评估撤机可能；③氯己定口腔护理每 6 小时；④预防深静脉血栓；⑤预防应激性溃疡。声门下分泌物吸引可降低早发 VAP 风险。所有操作严格执行手卫生。' },
    { category: '气道护理', title: '雾化吸入操作与注意事项', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['雾化', '吸入', '操作'], body: '雾化前评估患者意识与配合度，嘱患者缓慢深呼吸。雾化时间一般 10—15 分钟；雾化后协助漱口、擦脸，必要时翻身拍背排痰。雾化器一人一用一消毒，避免交叉感染。注意观察患者有无心悸、手抖等药物不良反应。' },

    // 压力性损伤 6
    { category: '压力性损伤', title: 'Braden 量表评分解读', source: '院内护理常规 2024 演示版', tags: ['Braden', '评估', '压力性损伤'], body: 'Braden 量表从感觉、潮湿、活动、移动、营养、摩擦/剪切力 6 个维度评估。总分 6—23 分，得分越低风险越高：≤9 分为极高危，10—12 分为高危，13—14 分为中危，15—18 分为低危，>18 分无风险。建议入院 8 小时内首次评估，高危患者每周复评。' },
    { category: '压力性损伤', title: 'Ⅰ—Ⅳ 期压力性损伤处理原则', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['分期', '处理', '压力性损伤'], body: 'Ⅰ 期：皮肤完整但发红，按压不变白，解除压力 30 分钟内多可恢复，加强翻身。Ⅱ 期：部分皮层缺损，呈粉红色创面，使用水胶体或泡沫敷料保护。Ⅲ 期：全层皮肤缺损，可见脂肪，使用藻酸盐或泡沫敷料促进肉芽生长。Ⅳ 期：全层组织缺损，可见肌腱/骨骼，需清创 + 负压治疗。' },
    { category: '压力性损伤', title: '敷料选择与更换频率', source: '院内护理常规 2024 演示版', tags: ['敷料', '更换', '压力性损伤'], body: '敷料选择原则：①保持创面湿润环境；②吸收多余渗液；③避免创面与敷料粘连；④保护周围皮肤。常见敷料：透明薄膜（用于Ⅰ期）、水胶体（用于Ⅱ期浅表创面，3—5 天换）、泡沫敷料（中至大量渗液，3—7 天换）、藻酸盐（高渗液，1—3 天换）、银离子敷料（感染创面，3—7 天换）。' },
    { category: '压力性损伤', title: '高危患者翻身频次与体位垫使用', source: '院内护理常规 2024 演示版', tags: ['翻身', '体位', '压力性损伤'], body: '高危压力性损伤患者应每 2 小时翻身一次，使用 30° 侧卧位（避免 90° 增加股骨大转子压力）。骨突处可使用软枕或泡沫垫减压。坐位患者每 1 小时变换重心；使用减压床垫可延长翻身间隔至 3—4 小时，但仍需定时评估皮肤状况。' },
    { category: '压力性损伤', title: '手术患者术中压力性损伤预防', source: 'NCCN 老年指南 2024 演示版', tags: ['手术', '术中', '压力性损伤'], body: '手术患者压力性损伤发生率较高。预防要点：①术前评估 Braden 评分；②体位垫合理放置，避免骨突处直接受压；③术中每 2 小时检查受压部位皮肤；④控制手术时间与体温；⑤术后交接时详细记录受压皮肤情况。' },
    { category: '压力性损伤', title: '失禁性皮炎与压力性损伤的鉴别', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['失禁', '皮炎', '鉴别'], body: '失禁性皮炎位于会阴/肛周/腹股沟，呈弥漫性红斑、渗出、疼痛，与失禁相关；压力性损伤位于骨突处（如骶尾、足跟），边界清晰，常伴坏死组织。失禁性皮炎需保持局部清洁干燥，使用皮肤保护剂；压力性损伤需减压 + 创面处理。两病可同时存在，需分别处理。' },

    // 化疗护理 6
    { category: '化疗护理', title: '化疗药物外渗应急处理', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['化疗', '外渗', '应急'], body: '化疗药物外渗应急处理流程：①立即停止输液，保留针头；②尽量回抽残留药物 3—5 ml；③抬高患肢；④局部冷敷（蒽环类 24 小时） 或热敷（长春碱类、植物碱类 24 小时）；⑤遵医嘱局部注射解毒剂；⑥必要时切开引流或手术。处理后 24—48 小时内每班观察皮肤变化并记录。' },
    { category: '化疗护理', title: '化疗相关恶心呕吐预防', source: 'NCCN 老年指南 2024 演示版', tags: ['化疗', '呕吐', '恶心', '止吐'], body: '化疗相关恶心呕吐（CINV）按发生时间分为：急性（24 小时内）、迟发性（24 小时—5 天）、预期性（化疗前）。高度致吐方案需预防性使用 5-HT3 受体拮抗剂 + NK1 受体拮抗剂 + 地塞米松三联方案。中度致吐可使用 5-HT3 拮抗剂 + 地塞米松。告知患者少食多餐，避免油腻与重味食物。' },
    { category: '化疗护理', title: '化疗期间口腔黏膜炎护理', source: '院内护理常规 2024 演示版', tags: ['化疗', '口腔', '黏膜炎'], body: '化疗后 5—14 天为口腔黏膜炎高发期。预防：每日口腔检查，餐后及睡前用软毛牙刷刷牙，使用生理盐水或碳酸氢钠漱口液漱口。处理：Ⅱ 级以上使用表皮生长因子凝胶或康复新液；疼痛明显者使用利多卡因漱口液（餐前 15 分钟）；合并感染时加用抗真菌或抗菌药物。' },
    { category: '化疗护理', title: '化疗患者静脉通路选择', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['化疗', '静脉', '通路'], body: '化疗患者优先选择中心静脉通路（PICC、输液港、CVC）以减少外渗风险。短期化疗或低致吐药物可使用外周静脉，但应选择前臂粗直血管，避免关节处、乳腺切除侧、淋巴水肿侧。每次输注前抽回血确认在静脉内，输注中每 15—30 分钟巡视。' },
    { category: '化疗护理', title: '化疗后骨髓抑制监测与护理', source: 'NCCN 老年指南 2024 演示版', tags: ['化疗', '骨髓抑制', '血常规'], body: '化疗后 7—14 天为骨髓抑制低谷期。每周监测血常规 2—3 次。中性粒细胞 < 0.5×10^9/L 时启动保护性隔离；血小板 < 20×10^9/L 时避免有创操作；血红蛋白 < 60 g/L 时评估输血指征。教育患者避免去人群密集场所、戴口罩、勤洗手、监测体温。' },
    { category: '化疗护理', title: '化疗药物配制与给药安全', source: '院内护理常规 2024 演示版', tags: ['化疗', '配制', '安全'], body: '化疗药物应在生物安全柜内配制，操作者穿戴双层手套、护目镜、防护服。给药前双人核对患者信息、药物、剂量、速度、顺序。输注过程中使用输液泵控制速度，每 15—30 分钟巡视一次，注意有无渗漏、过敏。剩余药液、输液管路、空瓶按医疗废物处理。' },

    // 营养支持 6
    { category: '营养支持', title: '老年肿瘤患者蛋白质补充建议', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['营养', '蛋白质', '老年'], body: '老年肿瘤患者蛋白质需求增加，建议每日摄入 1.2—2.0 g/kg 体重。优质蛋白来源：鸡蛋、鱼肉、瘦肉、牛奶、豆制品。必要时补充乳清蛋白粉或肠内营养制剂。严重低蛋白血症（白蛋白 < 30 g/L）需营养科会诊评估是否肠外营养。' },
    { category: '营养支持', title: '食欲下降时少食多餐方案', source: '院内护理常规 2024 演示版', tags: ['食欲', '少食多餐', '营养'], body: '食欲下降时建议少食多餐，每天 5—6 餐，每餐 6—7 分饱。两餐之间可补充高蛋白小食如酸奶、坚果、布丁。进餐环境保持愉悦，避免与治疗同时进行。优先选择高热量、高蛋白食物，必要时使用营养强化剂（如蛋白粉、肠内营养液）。' },
    { category: '营养支持', title: '营养风险评估方法', source: 'NCCN 老年指南 2024 演示版', tags: ['营养风险', '评估', 'NRS-2002'], body: '常用营养风险评估工具：①NRS-2002（住院患者）：含 BMI、近 3 月体重变化、饮食摄入、疾病严重度等，总分 ≥ 3 分为有营养风险；②PG-SGA（肿瘤患者专用）：含体重、饮食、症状、功能与体格检查。营养风险 ≥ 3 或近 3 月体重下降 > 5% 应启动营养支持。' },
    { category: '营养支持', title: '肠内营养输注护理要点', source: '院内护理常规 2024 演示版', tags: ['肠内营养', '输注', '护理'], body: '肠内营养输注遵循"浓度由低到高、速度由慢到快、容量由少到多"原则。起始速度 20—30 ml/h，4—6 小时耐受后逐步增加至 80—100 ml/h。床头抬高 30—45° 预防反流误吸。每 4 小时用温开水 20—30 ml 冲管防止堵管。监测胃残余量，> 200 ml 时减慢速度或暂停。' },
    { category: '营养支持', title: '恶心呕吐患者的饮食调整', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['恶心', '呕吐', '饮食'], body: '恶心呕吐期间饮食建议：①少量多次饮用温水或淡盐水（每小时 50—100 ml）；②避免重味、油腻、过甜食物；③选择清淡易消化食物如米粥、面条、苏打饼干；④饭后 30 分钟保持上身直立；⑤冷食比热食气味小，更易接受；⑥严重时按医嘱使用止吐药物。' },
    { category: '营养支持', title: '口服营养补充剂选择', source: '院内护理常规 2024 演示版', tags: ['ONS', '营养', '补充剂'], body: '口服营养补充剂（ONS）适用于能经口进食但摄入不足者。常见类型：①全营养型（整蛋白型）：适用于胃肠功能正常者；②短肽型：适用于消化吸收障碍者；③疾病特异型：如肿瘤专用、糖尿病专用、肾病专用。使用时机：两餐之间或睡前，每次 200—400 ml，每日 1—3 次。' },

    // 心理护理 6
    { category: '心理护理', title: '焦虑情绪识别与倾听技巧', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['焦虑', '倾听', '心理'], body: '焦虑情绪表现：坐立不安、失眠、心悸、过度担忧、反复询问。倾听技巧：①保持眼神接触与开放性肢体语言；②不打断、不评判、不急于给建议；③复述患者感受确认理解；④适时使用沉默给患者表达空间。每次沟通 15—20 分钟，避免一次性信息过载。' },
    { category: '心理护理', title: '抑郁情绪上报阈值', source: '院内护理常规 2024 演示版', tags: ['抑郁', '上报', '阈值'], body: '抑郁情绪上报阈值：①持续 2 周以上情绪低落；②对以往感兴趣的活动失去兴趣；③伴食欲/睡眠紊乱、体重变化；④反复出现"活着没意思"等消极念头；⑤出现自伤或自杀倾向。出现任一情况应立即通知医生与心理科，必要时 24 小时陪护。' },
    { category: '心理护理', title: '家属沟通注意事项', source: 'NCCN 老年指南 2024 演示版', tags: ['家属', '沟通', '心理'], body: '与家属沟通要点：①选择私密、安静的环境；②使用通俗易懂的语言；③先让家属表达情绪再给予信息；④告知病情时同时说明后续支持方案；⑤避免对治疗效果做绝对化承诺；⑥及时解答疑问并提供护理常规相关资料。必要时安排多学科会诊讨论。' },
    { category: '心理护理', title: '正念减压技术应用', source: '《中国肺癌杂志》护理共识 2024 演示版', tags: ['正念', '减压', '心理'], body: '正念减压（MBSR）适合肿瘤患者及家属。常用技术：①呼吸觉察：闭眼专注呼吸 5 分钟；②身体扫描：从头到脚逐部位觉察感受；③三分钟呼吸空间：觉察想法-身体感受-情绪；④行走冥想：慢步行走专注脚底触感。建议每日练习 10—20 分钟，4—8 周可见效果。' },
    { category: '心理护理', title: '临终患者心理支持', source: '院内护理常规 2024 演示版', tags: ['临终', '心理', '支持'], body: '临终患者心理支持原则：①尊重患者知情权与意愿；②四道人生：道谢、道歉、道爱、道别；③协助患者完成未了心愿；④维护患者尊严，避免无谓抢救；⑤家属同步哀伤辅导；⑥提供安静、私密的环境。必要时联系心理科与宁养团队。' },
    { category: '心理护理', title: '失眠患者的放松呼吸法', source: '院内护理常规 2024 演示版', tags: ['失眠', '放松', '呼吸'], body: '常用放松呼吸法：①4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，缓慢呼气 8 秒，重复 4 个循环；②腹式呼吸：鼻吸气时腹部鼓起 4 秒，口呼气时腹部内收 6 秒；③渐进性肌肉放松：从头到脚逐部位紧张 5 秒后放松 10 秒。睡前 30 分钟练习，避免看屏幕。' },
  ];
  for (const kb of KB_BODIES) {
    await db.insert(knowledgeBases).values({
      category: kb.category,
      title: kb.title,
      source: kb.source,
      tags: JSON.stringify(kb.tags),
      body: kb.body,
      approvedBy: '演示护理部',
      enabled: true,
    });
  }

  const totalPatients = 30;
  const patientDistribution: string[] = [];
  for (let i = 0; i < 24; i++) patientDistribution.push('在组');
  for (let i = 0; i < 3; i++) patientDistribution.push('已完成');
  for (let i = 0; i < 2; i++) patientDistribution.push('失访');
  patientDistribution.push('退出');

  for (let i = 0; i < totalPatients; i++) {
    const username = i === 0 ? 'patient' : genUsername(i);
    const displayName = i === 0 ? '演示患者（家属代用）' : genName();
    const userRow = await db.insert(users).values({ username, displayName, role: 'PATIENT', passwordHash: patientPwd, isActive: true }).returning({ id: users.id });
    const userId = userRow[0].id;
    const stage = STAGES[i % STAGES.length];
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

    // 6 次评估的相对日期：5 次落在近 30 天（周节奏）、1 次落在 30-50 天之间。
    // 配合 status==='在组' 时的轻微上扬，让趋势图能呈现"近期多次评估 + 略微加重"的真实病例感。
    const assessmentOffsets = [-randInt(0, 2), -randInt(5, 8), -randInt(12, 15), -randInt(19, 22), -randInt(26, 30), -randInt(35, 50)];
    for (let a = 0; a < 6; a++) {
      const ageBias = stage === '康复期' ? 1.0 : (stage === '随访期' ? 0.6 : 1.4);
      // 近几次的 baseLevel 略高，模拟"最近一次评估风险偏高"的演示效果
      const baseLevel = status === '在组' ? (a <= 1 ? 0.6 : (a <= 3 ? 0.45 : 0.3)) : (status === '已完成' ? 0.2 : 0.0);
      const scoresInput = items.map((it) => {
        const base = randInt(0, 10);
        const adjusted = Math.max(0, Math.min(10, Math.round(base * baseLevel * ageBias + randInt(0, 3))));
        return { itemCode: it.code, itemName: it.name, score: adjusted, weight: 1.0, itemId: it.id };
      });
      const sc = computeScore(scoresInput);
      const scores = scoresInput;
      const submittedAt = isoDay(assessmentOffsets[a]);
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
      const aiInput = { total: sc.totalScore, top: sc.topSymptomScore, topName: sc.topSymptomName || '—', topCode: sc.topSymptomCode || '', stage, delta: a === 0 ? null : sc.totalScore * 0.1 };
      const aiStyle: AIAnalysisStyle = defaultStyle(aiInput);
      const ai = seedMockAI({ ...aiInput, style: aiStyle });
      await db.insert(aiAnalyses).values({
        patientId,
        assessmentId: aRow[0].id,
        model: ai.model,
        style: ai.style,
        inputJson: JSON.stringify(aiInput),
        outputJson: JSON.stringify(ai),
        evidenceJson: JSON.stringify(ai.evidence),
        patientHint: ai.patientHint,
        status: pick(['已采纳', '部分采纳', '未采纳', '已生成']),
      });

      // 每个患者追加一条 proactive 风格分析（覆盖 3 种风格）
      if (a === 0) {
        const pro = seedMockAI({ ...aiInput, style: 'proactive' });
        await db.insert(aiAnalyses).values({
          patientId,
          assessmentId: aRow[0].id,
          model: pro.model,
          style: pro.style,
          inputJson: JSON.stringify(aiInput),
          outputJson: JSON.stringify(pro),
          evidenceJson: JSON.stringify(pro.evidence),
          patientHint: pro.patientHint,
          status: '已生成',
        });
        const cons = seedMockAI({ ...aiInput, style: 'conservative' });
        await db.insert(aiAnalyses).values({
          patientId,
          assessmentId: aRow[0].id,
          model: cons.model,
          style: cons.style,
          inputJson: JSON.stringify(aiInput),
          outputJson: JSON.stringify(cons),
          evidenceJson: JSON.stringify(cons.evidence),
          patientHint: cons.patientHint,
          status: '已生成',
        });
      }
    }

    if ((status === '在组' || status === '已完成') && assignedPathwayId) {
      // 按 ordinal 顺序遍历 pathway 内的所有 step（每位患者至多 N 个不重复任务）；
      // scheduledDate 在原 relativeDay 基础上 ±2 天抖动。治疗期6 / 康复期5 / 随访期4。
      const steps = (await db.select().from(pathwaySteps).where(eq(pathwaySteps.pathwayId, assignedPathwayId)))
        .sort((a, b) => a.ordinal - b.ordinal);
      for (const step of steps) {
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

  console.log('[seed] accounts: admin / nurse / patient (password 123456)');
  console.log('[seed] patients: ' + totalPatients + ' | scales: 1 | pathways: 3 | edu: ' + EDU_BODIES.length);
}
