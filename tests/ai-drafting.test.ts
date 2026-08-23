import { describe, it, expect } from 'vitest';
import { generateAlertHandlingDraft, generateFollowupSummaryDraft, DRAFTING_DISCLAIMER, DRAFTING_MODEL } from '../lib/services/ai/drafting';

describe('ai-drafting · alert handling', () => {
  it('包含模型标识、免责声明、风险等级、来源、4 条处置建议', () => {
    const d = generateAlertHandlingDraft(
      { id: 1, level: 'high', source: '评估', ruleSnapshot: '总分 60 达高风险阈值', summary: '总分 60' },
      [{ totalScore: 60, topSymptomCode: 'pain', topSymptomScore: 9, riskLevel: 'high', submittedAt: '2026-08-22T10:00:00Z' }],
    );
    expect(d).toContain(DRAFTING_MODEL);
    expect(d).toContain(DRAFTING_DISCLAIMER);
    expect(d).toContain('高'); // 风险等级文本
    expect(d).toContain('评估'); // 来源
    expect(d).toContain('总分 60'); // 触发条件
    expect(d).toContain('1. 24 小时内联系患者'); // 处置建议
    expect(d).toContain('4. 在护理记录中登记');
  });

  it('无评估时仍能生成草稿', () => {
    const d = generateAlertHandlingDraft(
      { id: 2, level: 'medium', source: '任务逾期', ruleSnapshot: '任务逾期 3 天', summary: '任务逾期' },
      [],
    );
    expect(d).toContain('近 30 天暂无已提交评估');
    expect(d).toContain('中');
  });
});

describe('ai-drafting · followup summary', () => {
  it('包含患者姓名、阶段、平均分、风险描述、4 条要点', () => {
    const d = generateFollowupSummaryDraft({
      patientName: '苏南怀远（演示）',
      treatmentStage: '治疗中',
      recentAssessments: [
        { totalScore: 30, topSymptomCode: 'fatigue', topSymptomScore: 6, riskLevel: 'medium', submittedAt: '2026-08-22' },
        { totalScore: 25, topSymptomCode: 'fatigue', topSymptomScore: 5, riskLevel: 'low', submittedAt: '2026-08-15' },
      ],
      recentSymptomCodes: ['fatigue', 'sleep', 'appetite'],
    });
    expect(d).toContain(DRAFTING_MODEL);
    expect(d).toContain(DRAFTING_DISCLAIMER);
    expect(d).toContain('苏南怀远（演示）');
    expect(d).toContain('治疗中');
    expect(d).toContain('平均分 27.5');
    expect(d).toContain('近 30 天评估 2 次');
    expect(d).toContain('fatigue、sleep、appetite');
    expect(d).toContain('1. 确认当前症状');
    expect(d).toContain('4. 与患者共同制定');
  });

  it('无评估/无症状时使用默认文本', () => {
    const d = generateFollowupSummaryDraft({
      patientName: '测试',
      treatmentStage: '随访期',
      recentAssessments: [],
      recentSymptomCodes: [],
    });
    expect(d).toContain('近 30 天评估 0 次');
    expect(d).toContain('近 30 天无主动症状报告');
    expect(d).toContain('近期整体低风险');
  });
});
