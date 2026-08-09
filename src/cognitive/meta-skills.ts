/**
 * 元技能内化模块 (Meta-Skills Internalization)
 * ─────────────────────────────────────────────
 * 基于 ALLINAI V9.5 元技能内化版
 *
 * 核心理念：
 *   四大元技能不是外部规则，而是注入认知空间的原则激活逻辑。
 *   元技能成为自觉的一部分，而非外部约束。
 *
 * 四大元技能：
 *   1. 先思考再行动 (Think Before Act)
 *      知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得
 *   2. 简洁优先 (Simplicity First)
 *      大道至简，衍化至繁
 *   3. 精准修改 (Precise Modification)
 *      差之毫厘，谬以千里
 *   4. 目标驱动 (Goal Driven)
 *      君子务本，本立而道生
 *
 * 融合点：
 *   - 在意识形态层 evaluateAction 前自动激活相关元技能
 *   - 在任务编排 decomposeTask 时注入元技能检查
 *   - 在审查/复盘时检测违反元技能的行为
 */

import { TritVector, TritVectorOps } from './trit-vector';

/** 元技能定义 */
export interface MetaSkill {
  /** 元技能名称 */
  name: string;
  /** 中文名 */
  nameCN: string;
  /** 经典依据 */
  principle: string;
  /** 适用场景关键词 */
  triggers: string[];
  /** 违反信号关键词 */
  violationSignals: string[];
  /** 激活时建议的认知向量偏移 */
  cognitiveBias: number[];
}

/** 元技能激活结果 */
export interface MetaSkillActivation {
  /** 激活的元技能列表 */
  activated: MetaSkill[];
  /** 综合激活向量（各元技能认知偏移的平均） */
  compositeBias: TritVector;
  /** 激活理由 */
  reasons: string[];
}

/** 元技能合规检查结果 */
export interface MetaSkillCompliance {
  /** 是否合规 */
  compliant: boolean;
  /** 违规的元技能 */
  violations: Array<{
    skill: MetaSkill;
    signal: string;
    suggestion: string;
  }>;
}

/**
 * 四大元技能定义
 * 每个元技能都包含经典依据、触发关键词、违反信号和认知偏移
 */
export const META_SKILLS: MetaSkill[] = [
  {
    name: 'think-before-act',
    nameCN: '先思考再行动',
    principle: '知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得',
    triggers: ['新任务', '紧急', '复杂', '高风险', '不确定', '首次'],
    violationSignals: ['直接执行', '跳过分析', '未评估', '草率', '冲动'],
    cognitiveBias: [0, 1, 0, 1, 0, 0, 1, 0, -1]  // 增强现在+内省+因，抑制果
  },
  {
    name: 'simplicity-first',
    nameCN: '简洁优先',
    principle: '大道至简，衍化至繁',
    triggers: ['冗长', '重复', '复杂度过高', '过度设计', '多层嵌套'],
    violationSignals: ['过度工程', '重复代码', '多层抽象', '不必要的依赖'],
    cognitiveBias: [0, 1, 0, 0, 1, 0, 0, 1, 0]  // 增强现在+中道+缘
  },
  {
    name: 'precise-modification',
    nameCN: '精准修改',
    principle: '差之毫厘，谬以千里',
    triggers: ['修改', '重构', '修复', '优化', '升级', '变更'],
    violationSignals: ['大范围改动', '未测试', '影响不明', '副作用', '破坏性'],
    cognitiveBias: [1, 0, -1, 0, 0, 0, 1, 0, 1]  // 增强过去经验+因+果，抑制未来盲目
  },
  {
    name: 'goal-driven',
    nameCN: '目标驱动',
    principle: '君子务本，本立而道生',
    triggers: ['目标', '交付', '完成', '结果', '产出', '里程碑'],
    violationSignals: ['偏离目标', '无意义工作', '方向漂移', '舍本逐末'],
    cognitiveBias: [0, 0, 1, 0, 0, 1, 0, 0, 1]  // 增强未来+外+果
  }
];

/**
 * 元技能激活器
 * 根据任务描述自动激活相关元技能
 */
export class MetaSkillActivator {
  /**
   * 根据任务描述激活元技能
   * @param taskDescription 任务描述
   * @param context 额外上下文
   */
  activate(taskDescription: string, context?: any): MetaSkillActivation {
    const activated: MetaSkill[] = [];
    const reasons: string[] = [];
    const taskLower = taskDescription.toLowerCase();

    for (const skill of META_SKILLS) {
      let relevanceScore = 0;

      // 1. 触发关键词匹配
      for (const trigger of skill.triggers) {
        if (taskLower.includes(trigger.toLowerCase())) {
          relevanceScore += 0.4;
        }
      }

      // 2. 违反信号反向匹配（任务描述中包含"避免""防止"等词时降低激活）
      const hasAvoidanceSignal = skill.violationSignals.some(
        s => taskLower.includes(`避免${s}`) || taskLower.includes(`防止${s}`)
      );
      if (hasAvoidanceSignal) {
        relevanceScore -= 0.2;
      }

      // 3. 上下文增强
      if (context?.priority === 'high' || context?.risk === 'high') {
        if (skill.name === 'think-before-act' || skill.name === 'precise-modification') {
          relevanceScore += 0.3;
        }
      }

      // 4. 始终激活"目标驱动"（万物皆有目标）
      if (skill.name === 'goal-driven') {
        relevanceScore = Math.max(relevanceScore, 0.5);
      }

      if (relevanceScore >= 0.3) {
        activated.push(skill);
        reasons.push(`激活"${skill.nameCN}": ${skill.principle.slice(0, 20)}... (相关度:${relevanceScore.toFixed(2)})`);
      }
    }

    // 如果没有任何激活，默认激活"先思考再行动"（安全兜底）
    if (activated.length === 0) {
      activated.push(META_SKILLS[0]);
      reasons.push('默认激活"先思考再行动"（无明确匹配的元技能，安全兜底）');
    }

    // 计算综合认知偏移向量
    const compositeBias = this.computeCompositeBias(activated);

    return { activated, compositeBias, reasons };
  }

  /**
   * 计算多个元技能的复合认知偏移
   */
  private computeCompositeBias(skills: MetaSkill[]): TritVector {
    if (skills.length === 0) {
      return TritVectorOps.zero();
    }

    const sum = new Array(9).fill(0);
    for (const skill of skills) {
      for (let i = 0; i < 9; i++) {
        sum[i] += skill.cognitiveBias[i] || 0;
      }
    }

    // 平均并限制在 -1/0/1
    const avg = sum.map(v => {
      const avgVal = v / skills.length;
      if (avgVal > 0.3) return 1;
      if (avgVal < -0.3) return -1;
      return 0;
    });

    return TritVectorOps.fromArray(avg as [number,number,number,number,number,number,number,number,number]);
  }

  /**
   * 合规检查：检测行动描述是否违反元技能
   * @param actionDescription 行动描述
   */
  checkCompliance(actionDescription: string): MetaSkillCompliance {
    const violations: MetaSkillCompliance['violations'] = [];
    const actionLower = actionDescription.toLowerCase();

    for (const skill of META_SKILLS) {
      for (const signal of skill.violationSignals) {
        if (actionLower.includes(signal.toLowerCase())) {
          violations.push({
            skill,
            signal,
            suggestion: `建议遵循"${skill.nameCN}": ${skill.principle}`
          });
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * 生成元技能注入的指导信息
   * 供意识形态层和引擎层使用
   */
  generateGuidance(activation: MetaSkillActivation): string {
    const lines: string[] = ['【元技能激活指导】'];
    for (const skill of activation.activated) {
      lines.push(`  ${skill.nameCN}: ${skill.principle}`);
    }
    return lines.join('\n');
  }
}

/** 全局单例 */
export const metaSkillActivator = new MetaSkillActivator();
