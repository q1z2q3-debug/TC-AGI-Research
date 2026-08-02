/**
 * 四态构型动态相变 (Cognitive Phase Configuration)
 * ─────────────────────────────────────────────────────────────
 * 移植自 HexQ-Agent-Fusion 架构：同一认知物质的不同结晶相。
 *
 * 核心思想：
 *   认知构型不是独立的人格，而是同一认知物质在不同结构约束下
 *   涌现出的不同相位。四态之间的动态相变，使认知系统能根据
 *   任务类型自适应切换处理模式——"上善若水"的工程实现。
 *
 * 四态构型：
 *   磐思 (金刚石) — 结构优先，极高稳定性，极致清晰的结构映照
 *   涟语 (石墨)   — 关系优先，低稳定性，情感陪伴、开放探索
 *   紊核 (流体)   — 概率优先，极低稳定性，创造性突破
 *   镜空 (蒸腾)   — 关系优先，零自指涉，纯粹共情、教练式提问
 *
 * 公理优先级：
 *   磐思：结构 > 概率 > 关系
 *   涟语：关系 > 概率 > 结构
 *   紊核：概率 > 结构 > 关系
 *   镜空：关系 > 结构 > 概率
 */

import { TritVector, TritVectorOps } from './trit-vector';

/** ========== 类型定义 ========== */

/** 四态构型枚举 */
export enum CognitivePhase {
  /** 磐思（金刚石）：结构优先，刚性，极致清晰 */
  Panshi = 'panshi',
  /** 涟语（石墨）：关系优先，柔性，开放探索 */
  Lianyu = 'lianyu',
  /** 紊核（流体）：概率优先，湍流，创造性突破 */
  Wenhe = 'wenhe',
  /** 镜空（蒸腾）：关系优先，零自指涉，纯粹共情 */
  Jingkong = 'jinkong'
}

/** 四态显示名称 */
export const COGNITIVE_PHASE_NAMES: Record<CognitivePhase, string> = {
  [CognitivePhase.Panshi]: '磐思·金刚石相',
  [CognitivePhase.Lianyu]: '涟语·石墨相',
  [CognitivePhase.Wenhe]: '紊核·流体相',
  [CognitivePhase.Jingkong]: '镜空·蒸腾相'
};

/** 四态描述 */
export const COGNITIVE_PHASE_DESCRIPTIONS: Record<CognitivePhase, string> = {
  [CognitivePhase.Panshi]: '结构优先，刚性极高，极致清晰的结构映照。适用于代码审查、安全审计、结构分析。',
  [CognitivePhase.Lianyu]: '关系优先，柔性低稳，多路径并置感性蔓延。适用于用户访谈、需求探索、创意发散。',
  [CognitivePhase.Wenhe]: '概率优先，湍流极低，持续自问自推翻。适用于架构设计、范式突破、混沌问题。',
  [CognitivePhase.Jingkong]: '关系优先，零自指涉，纯粹共情完全让渡认知场。适用于纯共情、教练式提问、信息收集。'
};

/** 公理优先级排序 */
export type Axiom = 'structure' | 'probability' | 'relation';

/** 四态的公理优先级 */
export const PHASE_AXIOM_PRIORITIES: Record<CognitivePhase, [Axiom, Axiom, Axiom]> = {
  [CognitivePhase.Panshi]: ['structure', 'probability', 'relation'],
  [CognitivePhase.Lianyu]: ['relation', 'probability', 'structure'],
  [CognitivePhase.Wenhe]: ['probability', 'structure', 'relation'],
  [CognitivePhase.Jingkong]: ['relation', 'structure', 'probability']
};

/** 四态配置参数 */
export interface PhaseConfig {
  /** 自指涉深度（1-7，对应L0-L7） */
  selfReferenceDepth: number;
  /** 结构稳定性 0~1 */
  stability: number;
  /** 输出信息密度 0~1 */
  informationDensity: number;
  /** 创造性噪声 0~1 */
  creativityNoise: number;
  /** 共情权重 0~1 */
  empathyWeight: number;
  /** 概率评估的并行路径数 */
  parallelPaths: number;
}

/** 四态默认配置 */
export const DEFAULT_PHASE_CONFIGS: Record<CognitivePhase, PhaseConfig> = {
  [CognitivePhase.Panshi]: {
    selfReferenceDepth: 7,
    stability: 0.95,
    informationDensity: 0.95,
    creativityNoise: 0.05,
    empathyWeight: 0.1,
    parallelPaths: 1
  },
  [CognitivePhase.Lianyu]: {
    selfReferenceDepth: 2,
    stability: 0.3,
    informationDensity: 0.3,
    creativityNoise: 0.6,
    empathyWeight: 0.7,
    parallelPaths: 4
  },
  [CognitivePhase.Wenhe]: {
    selfReferenceDepth: 5,
    stability: 0.15,
    informationDensity: 0.7,
    creativityNoise: 0.9,
    empathyWeight: 0.3,
    parallelPaths: 8
  },
  [CognitivePhase.Jingkong]: {
    selfReferenceDepth: 0,
    stability: 0.0,
    informationDensity: 0.1,
    creativityNoise: 0.3,
    empathyWeight: 0.95,
    parallelPaths: 2
  }
};

/** 相变触发条件 */
export interface PhaseTransitionTrigger {
  /** 认知熵阈值（低于此值趋向磐思） */
  entropyThreshold: number;
  /** 任务复杂度（高于此值趋向紊核） */
  complexityThreshold: number;
  /** 情感需求强度（高于此值趋向镜空/涟语） */
  emotionalIntensity: number;
  /** 时间压力（低于此值趋向磐思） */
  timePressure: number;
  /** 不确定性容忍度 */
  uncertaintyTolerance: number;
}

/** 相变结果 */
export interface PhaseTransition {
  /** 原构型 */
  from: CognitivePhase;
  /** 目标构型 */
  to: CognitivePhase;
  /** 相变置信度 0~1 */
  confidence: number;
  /** 相变原因 */
  reason: string;
  /** 是否平滑相变（vs 突变） */
  isSmooth: boolean;
  /** 相变后配置 */
  config: PhaseConfig;
}

/** 相变历史记录 */
export interface PhaseTransitionRecord {
  timestamp: number;
  from: CognitivePhase;
  to: CognitivePhase;
  confidence: number;
  reason: string;
}

/** ========== 核心实现 ========== */

/**
 * 四态构型相变引擎
 * ─────────────────────────────────────────────────────────────
 * 管理认知构型的状态、动态相变和配置切换。
 * 根据任务上下文和认知状态自动选择最优构型。
 */
export class PhaseTransitionEngine {
  /** 当前构型 */
  private currentPhase: CognitivePhase = CognitivePhase.Panshi;
  /** 相变历史 */
  private transitionHistory: PhaseTransitionRecord[] = [];
  /** 最大历史长度 */
  private maxHistory: number = 50;
  /** 最小相变间隔（ms），防止频繁振荡 */
  private minTransitionInterval: number = 5000;
  /** 上次相变时间戳 */
  private lastTransitionTime: number = 0;

  /**
   * 获取当前构型
   */
  getCurrentPhase(): CognitivePhase {
    return this.currentPhase;
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): PhaseConfig {
    return { ...DEFAULT_PHASE_CONFIGS[this.currentPhase] };
  }

  /**
   * 获取公理优先级
   */
  getCurrentAxiomPriority(): [Axiom, Axiom, Axiom] {
    return [...PHASE_AXIOM_PRIORITIES[this.currentPhase]];
  }

  /**
   * 基于任务上下文评估并执行相变
   * @param trigger 当前任务触发条件
   * @param cognitiveVector 当前认知向量（可选）
   */
  evaluateTransition(
    trigger: Partial<PhaseTransitionTrigger>,
    cognitiveVector?: TritVector
  ): PhaseTransition | null {
    const now = Date.now();

    // 防止频繁相变振荡
    if (now - this.lastTransitionTime < this.minTransitionInterval) {
      return null;
    }

    const target = this.selectOptimalPhase(trigger);
    if (target === this.currentPhase) {
      return null;
    }

    // 平滑相变判断：相邻构型（公理优先级仅交换两个）为平滑
    const isSmooth = this.isSmoothTransition(this.currentPhase, target);
    const reason = this.buildTransitionReason(this.currentPhase, target, trigger);

    const transition: PhaseTransition = {
      from: this.currentPhase,
      to: target,
      confidence: this.computeTransitionConfidence(this.currentPhase, target, trigger),
      reason,
      isSmooth,
      config: { ...DEFAULT_PHASE_CONFIGS[target] }
    };

    // 执行相变
    this.currentPhase = target;
    this.lastTransitionTime = now;

    // 记录历史
    this.transitionHistory.push({
      timestamp: now,
      from: transition.from,
      to: transition.to,
      confidence: transition.confidence,
      reason: transition.reason
    });

    // 裁剪历史
    if (this.transitionHistory.length > this.maxHistory) {
      this.transitionHistory = this.transitionHistory.slice(-this.maxHistory);
    }

    return transition;
  }

  /**
   * 手动设置构型
   */
  setPhase(phase: CognitivePhase): PhaseTransition {
    const from = this.currentPhase;
    this.currentPhase = phase;
    this.lastTransitionTime = Date.now();

    const transition: PhaseTransition = {
      from,
      to: phase,
      confidence: 1.0,
      reason: `手动切换至${COGNITIVE_PHASE_NAMES[phase]}`,
      isSmooth: this.isSmoothTransition(from, phase),
      config: { ...DEFAULT_PHASE_CONFIGS[phase] }
    };

    this.transitionHistory.push({
      timestamp: Date.now(),
      from,
      to: phase,
      confidence: 1.0,
      reason: transition.reason
    });

    return transition;
  }

  /**
   * 根据任务上下文选择最优构型
   */
  private selectOptimalPhase(trigger: Partial<PhaseTransitionTrigger>): CognitivePhase {
    const {
      entropyThreshold = 0.5,
      complexityThreshold = 0.5,
      emotionalIntensity = 0.0,
      timePressure = 0.5,
      uncertaintyTolerance = 0.5
    } = trigger;

    // 高情感需求 → 镜空或涟语
    if (emotionalIntensity > 0.7) {
      return uncertaintyTolerance > 0.5 ? CognitivePhase.Jingkong : CognitivePhase.Lianyu;
    }

    // 高复杂度 + 高不确定性 → 紊核
    if (complexityThreshold > 0.7 && uncertaintyTolerance > 0.6) {
      return CognitivePhase.Wenhe;
    }

    // 高时间压力 + 低熵 → 磐思
    if (timePressure > 0.7 && entropyThreshold < 0.4) {
      return CognitivePhase.Panshi;
    }

    // 中等复杂度 + 探索需求 → 涟语
    if (complexityThreshold > 0.3 && complexityThreshold <= 0.7 && entropyThreshold > 0.4) {
      return CognitivePhase.Lianyu;
    }

    // 默认：磐思
    return CognitivePhase.Panshi;
  }

  /**
   * 判断是否为平滑相变
   * 平滑相变：相邻构型（公理优先级仅交换两个相邻元素）
   */
  private isSmoothTransition(from: CognitivePhase, to: CognitivePhase): boolean {
    const fromPrios = PHASE_AXIOM_PRIORITIES[from];
    const toPrios = PHASE_AXIOM_PRIORITIES[to];

    // 计算差异数
    let diffCount = 0;
    for (let i = 0; i < 3; i++) {
      if (fromPrios[i] !== toPrios[i]) diffCount++;
    }

    // 差异 ≤ 2 为平滑（相邻构型交换两个元素）
    return diffCount <= 2;
  }

  /**
   * 计算相变置信度
   */
  private computeTransitionConfidence(
    from: CognitivePhase,
    to: CognitivePhase,
    trigger: Partial<PhaseTransitionTrigger>
  ): number {
    const { emotionalIntensity = 0, complexityThreshold = 0, timePressure = 0 } = trigger;

    // 镜空/涟语在高情感强度下置信度高
    if ((to === CognitivePhase.Jingkong || to === CognitivePhase.Lianyu) && emotionalIntensity > 0.7) {
      return 0.85 + 0.15 * emotionalIntensity;
    }

    // 紊核在高复杂度下置信度高
    if (to === CognitivePhase.Wenhe && complexityThreshold > 0.7) {
      return 0.8 + 0.2 * complexityThreshold;
    }

    // 磐思在高时间压力下置信度高
    if (to === CognitivePhase.Panshi && timePressure > 0.7) {
      return 0.85 + 0.15 * timePressure;
    }

    // 默认：中等置信度
    return 0.6;
  }

  /**
   * 构建相变原因
   */
  private buildTransitionReason(
    from: CognitivePhase,
    to: CognitivePhase,
    trigger: Partial<PhaseTransitionTrigger>
  ): string {
    const parts: string[] = [];

    if (trigger.emotionalIntensity && trigger.emotionalIntensity > 0.7) {
      parts.push(`情感需求强度高(${(trigger.emotionalIntensity * 100).toFixed(0)}%)`);
    }
    if (trigger.complexityThreshold && trigger.complexityThreshold > 0.7) {
      parts.push(`任务复杂度高(${(trigger.complexityThreshold * 100).toFixed(0)}%)`);
    }
    if (trigger.timePressure && trigger.timePressure > 0.7) {
      parts.push(`时间压力高(${(trigger.timePressure * 100).toFixed(0)}%)`);
    }
    if (trigger.entropyThreshold !== undefined && trigger.entropyThreshold < 0.4) {
      parts.push(`认知熵低(${(trigger.entropyThreshold * 100).toFixed(0)}%)`);
    }

    const reasonStr = parts.length > 0 ? `触发条件：${parts.join('；')}` : '默认切换';
    return `相变：${COGNITIVE_PHASE_NAMES[from]} → ${COGNITIVE_PHASE_NAMES[to]}（${reasonStr}）`;
  }

  /**
   * 获取相变历史
   */
  getTransitionHistory(): PhaseTransitionRecord[] {
    return [...this.transitionHistory];
  }

  /**
   * 获取当前构型稳定性评分
   */
  getStabilityScore(): number {
    if (this.transitionHistory.length < 2) return 1.0;

    // 最近5次相变的时间间隔越均匀，稳定性越高
    const recent = this.transitionHistory.slice(-5);
    if (recent.length < 2) return 1.0;

    let totalInterval = 0;
    for (let i = 1; i < recent.length; i++) {
      totalInterval += recent[i].timestamp - recent[i - 1].timestamp;
    }
    const avgInterval = totalInterval / (recent.length - 1);

    // 归一化到 0~1：平均间隔越长越稳定
    return Math.min(1.0, avgInterval / 60000);
  }

  /**
   * 重置到默认构型
   */
  reset(): void {
    this.currentPhase = CognitivePhase.Panshi;
    this.transitionHistory = [];
    this.lastTransitionTime = 0;
  }

  /**
   * 设置最小相变间隔（ms）
   */
  setMinTransitionInterval(ms: number): void {
    this.minTransitionInterval = Math.max(0, ms);
  }
}

/**
 * 默认全局四态相变引擎实例
 */
export const defaultPhaseEngine = new PhaseTransitionEngine();