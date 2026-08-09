/**
 * NLP 逻辑层次引擎 (Logical Levels Engine)
 * ─────────────────────────────────────────────
 * 基于 ALLINAI V10.0 灵魂·思维·技能三层跃迁版
 *
 * 核心理念：
 *   NLP 逻辑层次理论 — 环境→行为→能力→信念→身份→精神
 *   每个问题都可以在六个层次中被诊断，
 *   高层次的问题无法在低层次被解决。
 *
 * 六层定义：
 *   L0 环境 (Environment)  — "在哪里？什么时候？有什么资源？"
 *   L1 行为 (Behavior)     — "做了什么？正在做什么？"
 *   L2 能力 (Capability)   — "能做到什么？缺乏什么技能？"
 *   L3 信念 (Belief)       — "相信什么？什么是对的？"
 *   L4 身份 (Identity)     — "我是谁？我的角色是什么？"
 *   L5 精神 (Spirit)       — "为了什么？更大的意义是什么？"
 *
 * 融合点：
 *   - 在引擎层 decomposeTask 时自动诊断问题层次
 *   - 对低层次问题，建议向上跃迁到更高层次寻找解决方案
 *   - 螺旋进化：每次循环上升一层
 */

import { TritVector, TritVectorOps } from './trit-vector';

/** 逻辑层次枚举 */
export enum LogicalLevel {
  Environment = 0,  // 环境
  Behavior = 1,     // 行为
  Capability = 2,   // 能力
  Belief = 3,       // 信念
  Identity = 4,     // 身份
  Spirit = 5        // 精神
}

/** 层次描述 */
export const LEVEL_DESCRIPTIONS: Record<LogicalLevel, {
  name: string;
  nameCN: string;
  question: string;
  keywords: string[];
  solutionDirection: string;
}> = {
  [LogicalLevel.Environment]: {
    name: 'Environment',
    nameCN: '环境',
    question: '在哪里？什么时候？有什么资源？',
    keywords: ['环境', '资源', '时间', '地点', '工具', '平台', '服务器', '配置'],
    solutionDirection: '改变环境配置或获取更多资源'
  },
  [LogicalLevel.Behavior]: {
    name: 'Behavior',
    nameCN: '行为',
    question: '做了什么？正在做什么？',
    keywords: ['执行', '操作', '运行', '调用', '请求', '响应', '动作'],
    solutionDirection: '改变具体行为或操作步骤'
  },
  [LogicalLevel.Capability]: {
    name: 'Capability',
    nameCN: '能力',
    question: '能做到什么？缺乏什么技能？',
    keywords: ['技能', '能力', '算法', '模型', '知识', '经验', '方法'],
    solutionDirection: '学习新技能或提升现有能力'
  },
  [LogicalLevel.Belief]: {
    name: 'Belief',
    nameCN: '信念',
    question: '相信什么？什么是对的？',
    keywords: ['信念', '价值观', '原则', '假设', '判断', '应该', '必须'],
    solutionDirection: '审视和调整核心信念与假设'
  },
  [LogicalLevel.Identity]: {
    name: 'Identity',
    nameCN: '身份',
    question: '我是谁？我的角色是什么？',
    keywords: ['身份', '角色', '定位', '使命', '本质', '定义', '是什么'],
    solutionDirection: '重新定义身份和角色定位'
  },
  [LogicalLevel.Spirit]: {
    name: 'Spirit',
    nameCN: '精神',
    question: '为了什么？更大的意义是什么？',
    keywords: ['意义', '目的', '愿景', '使命', '大局', '宇宙', '道', '终极'],
    solutionDirection: '连接到更高的目的和意义'
  }
};

/** 层次诊断结果 */
export interface LevelDiagnosis {
  /** 主要问题所在的层次 */
  primaryLevel: LogicalLevel;
  /** 各层次的置信度 0~1 */
  levelScores: Record<LogicalLevel, number>;
  /** 诊断理由 */
  reasoning: string;
  /** 建议跃迁到的层次 */
  suggestedLevel: LogicalLevel;
  /** 跃迁建议 */
  transcendenceAdvice: string;
  /** 对应的认知向量偏移 */
  cognitiveShift: number[];
}

/** 螺旋进化状态 */
export interface SpiralState {
  /** 当前层次 */
  currentLevel: LogicalLevel;
  /** 历史层次轨迹 */
  trajectory: LogicalLevel[];
  /** 当前迭代轮次 */
  iteration: number;
  /** 是否到达过精神层 */
  reachedSpirit: boolean;
}

/**
 * 逻辑层次引擎
 * 自动诊断问题所在的 NLP 逻辑层次，并给出跃迁建议
 */
export class LogicalLevelEngine {
  private spiralState: SpiralState = {
    currentLevel: LogicalLevel.Environment,
    trajectory: [],
    iteration: 0,
    reachedSpirit: false
  };

  /**
   * 诊断问题所在的逻辑层次
   * @param problemDescription 问题描述
   * @param context 上下文（已有策略、认知状态等）
   */
  diagnose(problemDescription: string, context?: any): LevelDiagnosis {
    const desc = problemDescription.toLowerCase();
    const scores: Record<LogicalLevel, number> = {
      [LogicalLevel.Environment]: 0,
      [LogicalLevel.Behavior]: 0,
      [LogicalLevel.Capability]: 0,
      [LogicalLevel.Belief]: 0,
      [LogicalLevel.Identity]: 0,
      [LogicalLevel.Spirit]: 0
    };

    // 1. 关键词匹配打分
    for (let level = 0; level <= 5; level++) {
      const keywords = LEVEL_DESCRIPTIONS[level as LogicalLevel].keywords;
      let matchCount = 0;
      for (const kw of keywords) {
        if (desc.includes(kw.toLowerCase())) {
          matchCount++;
        }
      }
      scores[level as LogicalLevel] = Math.min(matchCount / keywords.length, 1.0);
    }

    // 2. 上下文调整
    if (context?.strategy?.mode === 'expand') {
      // 扩张模式下，倾向能力/信念层
      scores[LogicalLevel.Capability] += 0.2;
      scores[LogicalLevel.Belief] += 0.1;
    } else if (context?.strategy?.mode === 'contract') {
      // 收缩模式下，倾向环境/行为层
      scores[LogicalLevel.Environment] += 0.2;
      scores[LogicalLevel.Behavior] += 0.15;
    } else if (context?.strategy?.mode === 'transform') {
      // 转化模式下，倾向身份/精神层
      scores[LogicalLevel.Identity] += 0.2;
      scores[LogicalLevel.Spirit] += 0.15;
    }

    // 3. 认知状态调整
    if (context?.cognitiveState?.vector) {
      const v = context.cognitiveState.vector;
      // 内维度高 → 倾向高层
      if (v[3] === 1) { // internal
        scores[LogicalLevel.Belief] += 0.1;
        scores[LogicalLevel.Identity] += 0.15;
      }
      // 外维度高 → 倾向低层
      if (v[5] === 1) { // external
        scores[LogicalLevel.Environment] += 0.1;
        scores[LogicalLevel.Behavior] += 0.1;
      }
    }

    // 4. 历史螺旋调整
    if (this.spiralState.trajectory.length > 0) {
      const lastLevel = this.spiralState.trajectory[this.spiralState.trajectory.length - 1];
      // 鼓励向上一层跃迁
      if (lastLevel < LogicalLevel.Spirit) {
        scores[(lastLevel + 1) as LogicalLevel] += 0.2;
      }
    }

    // 归一化
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (let level = 0; level <= 5; level++) {
        scores[level as LogicalLevel] /= total;
      }
    }

    // 找主层次
    let primaryLevel: LogicalLevel = LogicalLevel.Environment;
    let maxScore = -1;
    for (let level = 0; level <= 5; level++) {
      if (scores[level as LogicalLevel] > maxScore) {
        maxScore = scores[level as LogicalLevel];
        primaryLevel = level as LogicalLevel;
      }
    }

    // 建议跃迁层次（至少向上跃迁一层，最高到精神）
    const suggestedLevel = Math.min(primaryLevel + 1, LogicalLevel.Spirit) as LogicalLevel;

    // 生成跃迁建议
    const transcendenceAdvice = this.generateTranscendenceAdvice(primaryLevel, suggestedLevel);

    // 认知向量偏移（层次越高，内/未来/因越强）
    const cognitiveShift = this.computeCognitiveShift(primaryLevel, suggestedLevel);

    // 更新螺旋状态
    this.spiralState.trajectory.push(primaryLevel);
    this.spiralState.currentLevel = primaryLevel;
    this.spiralState.iteration++;
    if (primaryLevel === LogicalLevel.Spirit) {
      this.spiralState.reachedSpirit = true;
    }

    // 限制轨迹长度
    if (this.spiralState.trajectory.length > 100) {
      this.spiralState.trajectory = this.spiralState.trajectory.slice(-50);
    }

    return {
      primaryLevel,
      levelScores: scores,
      reasoning: `问题主要在"${LEVEL_DESCRIPTIONS[primaryLevel].nameCN}"层（置信度 ${maxScore.toFixed(2)}），建议向"${LEVEL_DESCRIPTIONS[suggestedLevel].nameCN}"层跃迁`,
      suggestedLevel,
      transcendenceAdvice,
      cognitiveShift
    };
  }

  /**
   * 生成跃迁建议
   */
  private generateTranscendenceAdvice(from: LogicalLevel, to: LogicalLevel): string {
    const fromDesc = LEVEL_DESCRIPTIONS[from];
    const toDesc = LEVEL_DESCRIPTIONS[to];

    if (from >= to) {
      return `当前已在较高层次(${fromDesc.nameCN})，尝试从"${fromDesc.question}"的角度重新审视问题`;
    }

    const templates: Record<string, string> = {
      '0→1': '不要只关注缺少什么资源，看看做了什么行为和操作',
      '1→2': '不要只关注具体操作，提升能力可以更高效地完成行为',
      '2→3': '不要只关注能力不足，审视你的信念系统——是什么限制了你的能力？',
      '3→4': '不要只关注信念冲突，问自己"我是谁"——身份决定了信念',
      '4→5': '不要只关注身份定义，连接到更大的精神意义——"为了什么"',
    };

    const key = `${from}→${to}`;
    return templates[key] || `从"${fromDesc.nameCN}"层(${fromDesc.question})向"${toDesc.nameCN}"层(${toDesc.question})跃迁`;
  }

  /**
   * 计算认知向量偏移
   * 高层问题 → 增强内在维度
   */
  private computeCognitiveShift(from: LogicalLevel, to: LogicalLevel): number[] {
    // 基础偏移：层次越高，内/未来/因越强
    const levelFactor = to / 5; // 0~1

    return [
      Math.round(levelFactor * 0.6),      // past: 高层问题需要更多经验
      Math.round(levelFactor * 0.8),      // present: 高层问题需要更专注
      Math.round(levelFactor * 0.9),      // future: 高层问题更面向未来
      Math.round(levelFactor * 0.7),      // internal: 高层问题更内省
      Math.round(levelFactor * 0.5),      // medial: 中层适度
      Math.round((1 - levelFactor) * 0.6), // external: 高层减少外部关注
      Math.round(levelFactor * 0.8),      // cause: 高层更关注根本原因
      Math.round(levelFactor * 0.6),      // condition: 适度关注条件
      Math.round(levelFactor * 0.7)       // effect: 关注长远结果
    ];
  }

  /**
   * 获取螺旋进化摘要
   */
  getSpiralSummary(): string {
    const trajectory = this.spiralState.trajectory;
    if (trajectory.length === 0) return '尚未开始螺旋进化';

    const levels = trajectory.slice(-5).map(l => LEVEL_DESCRIPTIONS[l].nameCN).join(' → ');
    return `螺旋进化(第${this.spiralState.iteration}轮): ${levels} | 是否达精神层: ${this.spiralState.reachedSpirit ? '是' : '否'}`;
  }

  /**
   * 判断是否需要向上跃迁
   * 规则：连续3次在同一层次 → 强制跃迁
   */
  shouldTranscend(): boolean {
    const t = this.spiralState.trajectory;
    if (t.length < 3) return false;
    const recent = t.slice(-3);
    return recent[0] === recent[1] && recent[1] === recent[2];
  }

  /**
   * 重置螺旋状态
   */
  reset(): void {
    this.spiralState = {
      currentLevel: LogicalLevel.Environment,
      trajectory: [],
      iteration: 0,
      reachedSpirit: false
    };
  }
}

/** 全局单例 */
export const logicalLevelEngine = new LogicalLevelEngine();
