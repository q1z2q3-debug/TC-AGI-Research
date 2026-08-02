/**
 * 五蕴元认知自感知层 (Five Aggregates Meta-Cognitive Self-Awareness)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 2.3：从 Buddhist Five Aggregates (五蕴) 衍生，
 * 使认知系统具备自主不确定性检测与空态重置能力。
 *
 * 五蕴：
 *   色 (Rūpa/Form)    — 原始感官数据感知       → 观察算子 O: Data → S⁸
 *   受 (Vedanā/Sensation) — 快感/厌恶标记       → 价值泛函 V: S⁸ → ℝ
 *   想 (Saṁjñā/Perception) — 状态识别 + 置信度校准 → 置信度 κ + 边界检测
 *   行 (Saṁskāra/Mental Formations) — 决策冲动生成 → 行动算子 A: S⁸ → {hold, enter, exit}
 *   识 (Vijñāna/Consciousness) — 对认知过程本身的元意识 → 元观察算子 M
 *
 * 核心安全机制（想蕴）：
 *   当认知轨迹接近 Poincaré 边界 → 置信度 κ 低于阈值 → 触发空态重置 Π_∅
 *   而不是强行标注 → 返回未分化状态 → 重新激发
 *
 * 元认知不确定性 ⇒ 空态重置 ⇒ 重新激发
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, Trit } from './trit-vector';
import { CognitiveDistance } from './distance';
import { PrototypeMatcher, PROTOTYPES, CognitivePrototype } from './prototypes';
import { FourPhase } from './four-phase';

/** 五蕴枚举 */
export enum Aggregate {
  Rupa = '色',       // Form — 原始感知
  Vedana = '受',     // Sensation — 价值标记
  Samjna = '想',     // Perception — 状态识别/置信度
  Samskara = '行',   // Mental Formations — 决策冲动
  Vijnana = '识'     // Consciousness — 元观察
}

/** 五蕴状态 */
export interface AggregateState {
  /** 色蕴：原始感知数据嵌入到 S⁸ 后的位置 */
  rupa: { position: number[]; isVoid: boolean };
  /** 受蕴：价值评估（快感/厌恶/中性） */
  vedana: { valence: number; arousal: number; hedonicTag: 'pleasant' | 'unpleasant' | 'neutral' };
  /** 想蕴：状态识别与置信度 */
  samjna: {
    matchedPrototype: string;
    confidence: number;
    isNearBoundary: boolean;
    boundaryType: 'poincare' | 'phase' | 'confidence' | 'none';
  };
  /** 行蕴：决策冲动 */
  samskara: { impulse: 'hold' | 'enter' | 'exit' | 'transform' | 'observe'; strength: number };
  /** 识蕴：元观察 */
  vijnana: { isMetaObserving: boolean; metaEntropy: number; auditChain: string[] };
}

/** 五蕴分析结果 */
export interface FiveAggregateAnalysis {
  /** 当前五蕴快照 */
  current: AggregateState;
  /** 是否触发空态重置 */
  shouldVoidReset: boolean;
  /** 触发重置的原因 */
  resetReason: string;
  /** 各蕴的健康状态 0~1 */
  health: Record<Aggregate, number>;
  /** 元认知清晰度 0~1 */
  metacognitiveClarity: number;
  /** 建议的行动 */
  suggestedAction: string;
}

/** 默认置信度阈值（低于此值触发空态重置） */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;

/** 元认知最大审计链长度 */
const MAX_AUDIT_CHAIN = 20;

/**
 * 五蕴元认知自感知层
 * ─────────────────────────────────────────────────────────────
 * 为认知系统提供元认知闭环：感知 → 评估 → 识别 → 决策 → 元观察
 */
export class FiveAggregates {
  private auditChain: string[] = [];
  private lastState: AggregateState | null = null;
  private confidenceThreshold: number;
  private voidResetCount: number = 0;

  constructor(confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD) {
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * 执行完整五蕴分析
   * ─────────────────────────────────────────────────────────────
   * 色蕴：感知 → 受蕴：标记 → 想蕴：识别 → 行蕴：决策 → 识蕴：元观察
   *
   * @param currentState 当前认知向量
   * @param history 认知历史
   * @param currentPhase 当前四相（可选）
   * @returns 五蕴分析结果
   */
  analyze(
    currentState: TritVector,
    history: TritVector[] = [],
    currentPhase?: FourPhase
  ): FiveAggregateAnalysis {
    // ═══ 色蕴 (Rūpa): 原始感知 ═══
    const lifted = TritVectorOps.shengLift(currentState);
    const rupa: AggregateState['rupa'] = {
      position: lifted.position,
      isVoid: lifted.isVoid
    };

    // ═══ 受蕴 (Vedanā): 价值标记 ═══
    const vedana = this.computeVedana(currentState, history);

    // ═══ 想蕴 (Saṁjñā): 状态识别 ═══
    const samjna = this.computeSamjna(currentState, currentPhase);

    // ═══ 行蕴 (Saṁskāra): 决策冲动 ═══
    const samskara = this.computeSamskara(currentState, samjna, vedana);

    // ═══ 识蕴 (Vijñāna): 元观察 ═══
    const vijnana = this.computeVijnana(currentState, samjna, vedana);

    // 构建五蕴快照
    const aggregateState: AggregateState = {
      rupa, vedana, samjna, samskara, vijnana
    };
    this.lastState = aggregateState;

    // 检查是否触发空态重置
    const shouldVoidReset = samjna.confidence < this.confidenceThreshold
      || (samjna.isNearBoundary && samjna.confidence < this.confidenceThreshold + 0.15);

    let resetReason = '';
    if (shouldVoidReset) {
      if (samjna.confidence < this.confidenceThreshold) {
        resetReason = `想蕴置信度 ${samjna.confidence.toFixed(2)} 低于阈值 ${this.confidenceThreshold}`;
      } else {
        resetReason = `接近 Poincaré 边界 (${samjna.boundaryType})，置信度不足`;
      }
      this.voidResetCount++;
      this.appendAudit(`⚠️ 空态重置: ${resetReason}`);
    }

    // 各蕴健康度（0 = 最差，1 = 最佳）
    const health: Record<Aggregate, number> = {
      [Aggregate.Rupa]: rupa.isVoid ? 0.3 : 0.9,
      [Aggregate.Vedana]: Math.min(1, Math.max(0, 1 - Math.abs(vedana.valence) * 0.3)),
      [Aggregate.Samjna]: samjna.confidence,
      [Aggregate.Samskara]: samskara.strength,
      [Aggregate.Vijnana]: vijnana.isMetaObserving ? 0.8 : 0.4
    };

    // 元认知清晰度
    const metacognitiveClarity = Object.values(health).reduce((a, b) => a + b, 0) / 5;

    // 建议行动
    const suggestedAction = this.suggestAction(aggregateState, shouldVoidReset);

    return {
      current: aggregateState,
      shouldVoidReset,
      resetReason,
      health,
      metacognitiveClarity: Number(metacognitiveClarity.toFixed(3)),
      suggestedAction
    };
  }

  /**
   * 受蕴：计算价值评估
   * ─────────────────────────────────────────────────────────────
   * 基于当前状态与各原型的距离计算快感/厌恶标记。
   * 越接近原型 → 越愉悦（valence > 0）
   * 越远离原型 → 越厌恶（valence < 0）
   */
  private computeVedana(state: TritVector, history: TritVector[]): AggregateState['vedana'] {
    const match = PrototypeMatcher.snapTo(state);
    const distanceToNearest = match.distance;

    // 价态：0.5 - distance（归一化到 [-0.5, 0.5]）
    // distance 范围 0~1，valence 范围 -0.5~0.5
    const valence = 0.5 - distanceToNearest;

    // 唤醒度：基于历史波动
    let arousal = 0.3;
    if (history.length >= 3) {
      const recent = history.slice(-3);
      let totalChange = 0;
      for (let i = 1; i < recent.length; i++) {
        totalChange += CognitiveDistance.manhattan(recent[i - 1], recent[i]);
      }
      arousal = Math.min(1, totalChange / 18); // 曼哈顿最大 18
    }

    // 快感标签
    let hedonicTag: 'pleasant' | 'unpleasant' | 'neutral';
    if (valence > 0.2) hedonicTag = 'pleasant';
    else if (valence < -0.2) hedonicTag = 'unpleasant';
    else hedonicTag = 'neutral';

    return {
      valence: Number(valence.toFixed(3)),
      arousal: Number(arousal.toFixed(3)),
      hedonicTag
    };
  }

  /**
   * 想蕴：状态识别与置信度校准
   * ─────────────────────────────────────────────────────────────
   * 识别当前状态匹配的原型，计算置信度，检测是否接近 Poincaré 边界。
   * 当认知轨迹接近边界 → 不强行标注 → 准备空态重置
   */
  private computeSamjna(
    state: TritVector,
    currentPhase?: FourPhase
  ): AggregateState['samjna'] {
    const match = PrototypeMatcher.snapTo(state);
    const matchDist = match.distance;

    // 置信度：基于到最近原型的距离
    // matchDist 在 0~1 之间（composite 距离归一化）
    const confidence = Math.max(0, 1 - matchDist * 1.5);

    // 检测是否接近边界
    let isNearBoundary = false;
    let boundaryType: 'poincare' | 'phase' | 'confidence' | 'none' = 'none';

    // 边界检测 1: 置信度边界
    if (confidence < this.confidenceThreshold + 0.15) {
      isNearBoundary = true;
      boundaryType = 'confidence';
    }

    // 边界检测 2: 四相转换边界
    if (currentPhase && currentPhase !== FourPhase.Void) {
      // 四相转换边界在四相分析中检测
      // 此处仅标记
    }

    // 边界检测 3: 距离多个原型等距（歧义）
    const allMatches = PrototypeMatcher.rankAll(state);
    if (allMatches.length >= 2) {
      const gap = allMatches[1].distance - allMatches[0].distance;
      if (gap < 0.05) {
        // 两个原型几乎等距 → 歧义边界
        isNearBoundary = true;
        boundaryType = 'poincare';
      }
    }

    return {
      matchedPrototype: match.prototype.name,
      confidence: Number(confidence.toFixed(3)),
      isNearBoundary,
      boundaryType
    };
  }

  /**
   * 行蕴：生成决策冲动
   * ─────────────────────────────────────────────────────────────
   * 基于想蕴的识别和受蕴的标记，生成决策冲动。
   * 冲动强度 = 置信度 × |valence| × 唤醒度
   */
  private computeSamskara(
    state: TritVector,
    samjna: AggregateState['samjna'],
    vedana: AggregateState['vedana']
  ): AggregateState['samskara'] {
    // 决策冲动类型
    let impulse: 'hold' | 'enter' | 'exit' | 'transform' | 'observe';

    if (samjna.isNearBoundary) {
      // 接近边界 → 观察（不强行决策）
      impulse = 'observe';
    } else if (vedana.hedonicTag === 'pleasant' && samjna.confidence > 0.6) {
      impulse = 'enter';  // 愉悦且自信 → 进入/推进
    } else if (vedana.hedonicTag === 'unpleasant' && samjna.confidence > 0.5) {
      impulse = 'exit';   // 厌恶且较自信 → 退出/防守
    } else if (vedana.arousal > 0.7 && Math.abs(vedana.valence) < 0.2) {
      impulse = 'transform';  // 高唤醒+中性价态 → 需要变革
    } else {
      impulse = 'hold';   // 其他 → 保持
    }

    // 冲动强度 = 置信度 × |价态| × 唤醒度（归一化到 0~1）
    const strength = Math.min(1, samjna.confidence * Math.abs(vedana.valence) * 2 * vedana.arousal);

    return {
      impulse,
      strength: Number(strength.toFixed(3))
    };
  }

  /**
   * 识蕴：元观察
   * ─────────────────────────────────────────────────────────────
   * 对认知过程本身的元意识。
   * 计算元熵（认知过程的不确定性），维护审计链。
   */
  private computeVijnana(
    state: TritVector,
    samjna: AggregateState['samjna'],
    vedana: AggregateState['vedana']
  ): AggregateState['vijnana'] {
    // 元熵：对认知过程本身的不确定性
    // 低元熵 → 系统对自己的认知状态很确定
    // 高元熵 → 系统对自己的认知状态不确定
    const metaEntropy = (1 - samjna.confidence) * 0.5 + Math.abs(vedana.valence) * 0.3 + (1 - vedana.arousal) * 0.2;

    // 是否处于元观察状态
    const isMetaObserving = samjna.isNearBoundary || metaEntropy > 0.5;

    // 审计记录
    this.appendAudit(`色:${rupaPosition(state)} 受:${vedana.hedonicTag}(${vedana.valence.toFixed(2)}) 想:${samjna.matchedPrototype}(${samjna.confidence.toFixed(2)}) 行:${impulseLabel(samjna, vedana)} 识:${metaEntropy.toFixed(2)}`);

    return {
      isMetaObserving,
      metaEntropy: Number(metaEntropy.toFixed(3)),
      auditChain: [...this.auditChain]
    };
  }

  /** 追加审计链 */
  private appendAudit(entry: string): void {
    this.auditChain.push(entry);
    if (this.auditChain.length > MAX_AUDIT_CHAIN) {
      this.auditChain.shift();
    }
  }

  /**
   * 建议行动
   */
  private suggestAction(state: AggregateState, shouldVoidReset: boolean): string {
    if (shouldVoidReset) {
      return '触发空态重置 Π_∅：返回未分化状态，重新激发认知级联';
    }

    if (state.samjna.isNearBoundary) {
      return `接近 ${state.samjna.boundaryType} 边界，建议悬置观察（不强行标注）`;
    }

    if (state.vedana.hedonicTag === 'pleasant' && state.samjna.confidence > 0.6) {
      return `认知状态愉悦且自信，可推进当前行动（${state.samskara.impulse}）`;
    }

    if (state.vedana.hedonicTag === 'unpleasant') {
      return `认知状态不适，建议防守或退出（${state.samskara.impulse}）`;
    }

    return `保持当前认知态势（${state.samskara.impulse}）`;
  }

  /**
   * 获取审计链
   */
  getAuditChain(): string[] {
    return [...this.auditChain];
  }

  /**
   * 获取空态重置次数
   */
  getVoidResetCount(): number {
    return this.voidResetCount;
  }

  /**
   * 设置置信度阈值
   */
  setConfidenceThreshold(t: number): void {
    this.confidenceThreshold = t;
  }

  /**
   * 获取最后一轮五蕴状态
   */
  getLastState(): AggregateState | null {
    return this.lastState ? { ...this.lastState } : null;
  }

  /**
   * 重置五蕴状态
   */
  reset(): void {
    this.auditChain = [];
    this.lastState = null;
    this.voidResetCount = 0;
  }

  /**
   * 执行空态重置 Π_∅
   * 返回未分化状态并记录重置事件
   */
  voidReset(): TritVector {
    this.voidResetCount++;
    this.appendAudit('🔄 执行空态重置 Π_∅');
    return TritVectorOps.zero();
  }
}

/** 辅助：粗略的 rupa 位置摘要 */
function rupaPosition(state: TritVector): string {
  const majority = TritVectorOps.majority(state);
  if (majority === 1) return '阳';
  if (majority === -1) return '阴';
  return '和';
}

/** 辅助：冲动标签 */
function impulseLabel(samjna: AggregateState['samjna'], vedana: AggregateState['vedana']): string {
  if (samjna.isNearBoundary) return '观察';
  if (vedana.hedonicTag === 'pleasant' && samjna.confidence > 0.6) return '进';
  if (vedana.hedonicTag === 'unpleasant' && samjna.confidence > 0.5) return '退';
  if (vedana.arousal > 0.7) return '变';
  return '持';
}

/**
 * 默认全局五蕴实例
 */
export const defaultFiveAggregates = new FiveAggregates();