/**
 * 实现间隙：稀疏认知子流形 (Realization Gap)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 6.5：四相序列 q_t ∈ {1,2,3,4} 的结构熵 H₄
 * 在 14 个系统中占据离散阶梯值，存在禁带 H₄ ∈ [0.2, 0.3)。
 *
 * 核心发现：
 *   真实轨迹的 H₄ ∈ [0.54, 0.91]，意味着可执行的认知宇宙
 *   是稀疏子流形 S* ⊂ (ℤ/3ℤ)ⁿ，|S*| ≪ 3ⁿ
 *
 * 架构配备：
 *   1. 实现先验 P(σ)：已访问状态的实证分布编码
 *   2. 约束传播台账：记录已实现/已排除/禁止区域
 *      使代理搜索 S* 而非整个超立方体
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, Trit } from './trit-vector';
import { FourPhase, FOUR_PHASE_NAMES } from './four-phase';

/** ========== 类型定义 ========== */

/** 约束区域类型 */
export enum ConstraintRegion {
  /** 已实现：曾被访问过的状态 */
  Realized = 'realized',
  /** 已排除：被证明不可达或不相关 */
  Excluded = 'excluded',
  /** 禁止：已知不可行或违反约束 */
  Forbidden = 'forbidden',
  /** 未探索：尚未被任何认知过程访问 */
  Unexplored = 'unexplored'
}

/** 约束区域标签 */
export const CONSTRAINT_REGION_NAMES: Record<ConstraintRegion, string> = {
  [ConstraintRegion.Realized]: '已实现',
  [ConstraintRegion.Excluded]: '已排除',
  [ConstraintRegion.Forbidden]: '禁止',
  [ConstraintRegion.Unexplored]: '未探索'
};

/** 实现间隙配置 */
export interface RealizationGapConfig {
  /** H₄ 熵计算窗口大小，默认 50 */
  entropyWindow: number;
  /** 禁带下界，默认 0.2 */
  forbiddenBandLow: number;
  /** 禁带上界，默认 0.3 */
  forbiddenBandHigh: number;
  /** 先验衰减因子（旧状态权重衰减），默认 0.95 */
  priorDecay: number;
  /** 是否启用约束传播 */
  constraintPropagation: boolean;
  /** 是否启用实现先验 */
  enablePrior: boolean;
}

/** 默认实现间隙配置 */
export const DEFAULT_REALIZATION_GAP_CONFIG: RealizationGapConfig = {
  entropyWindow: 50,
  forbiddenBandLow: 0.2,
  forbiddenBandHigh: 0.3,
  priorDecay: 0.95,
  constraintPropagation: true,
  enablePrior: true
};

/** 约束传播记录 */
export interface ConstraintRecord {
  /** 状态卦象索引 */
  hexagramIndex: number;
  /** 约束区域类型 */
  region: ConstraintRegion;
  /** 记录时间戳（步数） */
  timestamp: number;
  /** 原因 */
  reason: string;
}

/** 实现先验分布 */
export interface RealizationPrior {
  /** 总访问计数 */
  totalVisits: number;
  /** 各状态的访问计数（索引→计数） */
  visitCounts: Map<number, number>;
  /** 各状态的相对先验概率 */
  probabilities: Map<number, number>;
  /** 分布熵 */
  entropy: number;
}

/** 实现间隙分析结果 */
export interface RealizationGapAnalysis {
  /** 当前四相序列 H₄ 结构熵 */
  h4Entropy: number;
  /** 是否在禁带中 */
  inForbiddenBand: boolean;
  /** 稀疏子流形大小 */
  submanifoldSize: number;
  /** 全空间大小 */
  fullSpaceSize: number;
  /** 稀疏比 |S*| / 3ⁿ */
  sparsityRatio: number;
  /** 实现先验 */
  prior: RealizationPrior;
  /** 约束台账摘要 */
  constraintSummary: {
    realized: number;
    excluded: number;
    forbidden: number;
    unexplored: number;
  };
  /** 建议搜索策略 */
  suggestedStrategy: 'explore' | 'exploit' | 'reset' | 'focus';
}

/** ========== 实现间隙引擎 ========== */

/**
 * 实现间隙/稀疏子流形引擎
 * ─────────────────────────────────────────────────────────────
 * 管理稀疏认知子流形 S*，通过四相结构熵 H₄ 和约束传播
 * 引导代理聚焦于高潜力区域而非全空间搜索。
 */
export class RealizationGap {
  private config: RealizationGapConfig;
  private phaseHistory: FourPhase[] = [];
  private constraintLedger: ConstraintRecord[] = [];
  private visitCounts: Map<number, number> = new Map();
  private totalVisits: number = 0;
  private lastAnalysis: RealizationGapAnalysis | null = null;

  constructor(config: Partial<RealizationGapConfig> = {}) {
    this.config = { ...DEFAULT_REALIZATION_GAP_CONFIG, ...config };
  }

  /**
   * 计算四相结构熵 H₄
   * ─────────────────────────────────────────────────────────────
   * H₄ = -Σ_{k=1}^{4} p_k · log₄ p_k ∈ [0, 1]
   *
   * 使用 log₄ 使熵值归一化到 [0, 1]
   */
  computeH4Entropy(phases: FourPhase[]): number {
    if (phases.length === 0) return 0;

    // 统计四相频率
    const counts: Record<string, number> = {
      [FourPhase.OldYang]: 0,
      [FourPhase.YoungYin]: 0,
      [FourPhase.OldYin]: 0,
      [FourPhase.YoungYang]: 0
    };

    // 排除 Void 态
    const validPhases = phases.filter(p => p !== FourPhase.Void);
    if (validPhases.length === 0) return 0;

    for (const p of validPhases) {
      counts[p]++;
    }

    const total = validPhases.length;

    // H₄ = -Σ p_k · log₄(p_k)
    let entropy = 0;
    for (const phase of Object.values(FourPhase)) {
      if (phase === FourPhase.Void) continue;
      const p = counts[phase] / total;
      if (p > 0) {
        entropy -= p * Math.log(p) / Math.log(4); // log₄ = ln / ln 4
      }
    }

    return entropy;
  }

  /**
   * 检查是否在禁带中
   */
  isInForbiddenBand(h4Entropy: number): boolean {
    return h4Entropy >= this.config.forbiddenBandLow &&
      h4Entropy < this.config.forbiddenBandHigh;
  }

  /**
   * 记录认知状态访问
   */
  recordVisit(state: TritVector, phase: FourPhase, reason: string = '认知处理'): void {
    const idx = TritVectorOps.toHexagramIndex(state);

    // 更新访问计数
    const currentCount = this.visitCounts.get(idx) || 0;
    this.visitCounts.set(idx, currentCount + 1);
    this.totalVisits++;

    // 更新相位历史
    this.phaseHistory.push(phase);
    if (this.phaseHistory.length > this.config.entropyWindow * 10) {
      this.phaseHistory.shift();
    }

    // 如果是首次访问，记录到约束台账
    if (currentCount === 0) {
      this.constraintLedger.push({
        hexagramIndex: idx,
        region: ConstraintRegion.Realized,
        timestamp: this.totalVisits,
        reason
      });
    }
  }

  /**
   * 标记状态为排除或禁止
   */
  markConstraint(
    state: TritVector,
    region: ConstraintRegion,
    reason: string
  ): void {
    if (region === ConstraintRegion.Realized || region === ConstraintRegion.Unexplored) {
      return; // 只有 Excluded 和 Forbidden 需要手动标记
    }

    const idx = TritVectorOps.toHexagramIndex(state);
    this.constraintLedger.push({
      hexagramIndex: idx,
      region,
      timestamp: this.totalVisits,
      reason
    });
  }

  /**
   * 计算实现先验分布
   */
  computePrior(): RealizationPrior {
    if (this.totalVisits === 0) {
      return {
        totalVisits: 0,
        visitCounts: new Map(),
        probabilities: new Map(),
        entropy: 0
      };
    }

    const probabilities = new Map<number, number>();

    // 计算每个状态的相对频率（带衰减）
    let totalWeight = 0;
    for (const [idx, count] of this.visitCounts) {
      // 衰减因子：越旧的访问权重越低
      const weight = count * Math.pow(this.config.priorDecay, this.totalVisits - count);
      probabilities.set(idx, weight);
      totalWeight += weight;
    }

    // 归一化
    for (const [idx, weight] of probabilities) {
      probabilities.set(idx, weight / totalWeight);
    }

    // 计算先验熵
    let entropy = 0;
    for (const p of probabilities.values()) {
      if (p > 0) {
        entropy -= p * Math.log(p) / Math.LN2;
      }
    }

    return {
      totalVisits: this.totalVisits,
      visitCounts: new Map(this.visitCounts),
      probabilities,
      entropy
    };
  }

  /**
   * 执行完整实现间隙分析
   */
  analyze(): RealizationGapAnalysis {
    // 1. 计算 H₄ 结构熵
    const window = this.phaseHistory.slice(-this.config.entropyWindow);
    const h4Entropy = this.computeH4Entropy(window);

    // 2. 禁带检测
    const inForbiddenBand = this.isInForbiddenBand(h4Entropy);

    // 3. 稀疏子流形计算
    const realizedSet = new Set<number>();
    const excludedSet = new Set<number>();
    const forbiddenSet = new Set<number>();

    for (const record of this.constraintLedger) {
      switch (record.region) {
        case ConstraintRegion.Realized:
          realizedSet.add(record.hexagramIndex);
          break;
        case ConstraintRegion.Excluded:
          excludedSet.add(record.hexagramIndex);
          break;
        case ConstraintRegion.Forbidden:
          forbiddenSet.add(record.hexagramIndex);
          break;
      }
    }

    const submanifoldSize = realizedSet.size;
    const fullSpaceSize = 19683; // 3⁹
    const sparsityRatio = submanifoldSize / fullSpaceSize;

    // 4. 先验分布
    const prior = this.computePrior();

    // 5. 约束台账摘要
    const constraintSummary = {
      realized: realizedSet.size,
      excluded: excludedSet.size,
      forbidden: forbiddenSet.size,
      unexplored: fullSpaceSize - realizedSet.size - excludedSet.size - forbiddenSet.size
    };

    // 6. 建议搜索策略
    let suggestedStrategy: 'explore' | 'exploit' | 'reset' | 'focus';
    if (inForbiddenBand) {
      suggestedStrategy = 'reset';
    } else if (sparsityRatio < 0.01) {
      suggestedStrategy = 'explore';
    } else if (h4Entropy > 0.8) {
      suggestedStrategy = 'focus';
    } else {
      suggestedStrategy = 'exploit';
    }

    const analysis: RealizationGapAnalysis = {
      h4Entropy,
      inForbiddenBand,
      submanifoldSize,
      fullSpaceSize,
      sparsityRatio,
      prior,
      constraintSummary,
      suggestedStrategy
    };

    this.lastAnalysis = analysis;
    return analysis;
  }

  /**
   * 获取当前窗口内的四相序列
   */
  getRecentPhases(count: number = 20): FourPhase[] {
    return this.phaseHistory.slice(-count);
  }

  /**
   * 判断给定状态是否在稀疏子流形中
   */
  isInSubmanifold(state: TritVector): boolean {
    const idx = TritVectorOps.toHexagramIndex(state);
    return this.visitCounts.has(idx);
  }

  /**
   * 获取状态的先验概率
   */
  getPriorProbability(state: TritVector): number {
    if (!this.config.enablePrior) return 1 / 19683;
    const prior = this.computePrior();
    const idx = TritVectorOps.toHexagramIndex(state);
    return prior.probabilities.get(idx) || 0;
  }

  /**
   * 获取约束台账
   */
  getConstraintLedger(): ConstraintRecord[] {
    return [...this.constraintLedger];
  }

  /**
   * 清理过期约束记录
   */
  pruneLedger(maxRecords: number = 10000): void {
    if (this.constraintLedger.length > maxRecords) {
      this.constraintLedger = this.constraintLedger.slice(-maxRecords);
    }
  }

  /**
   * 重置
   */
  reset(): void {
    this.phaseHistory = [];
    this.constraintLedger = [];
    this.visitCounts.clear();
    this.totalVisits = 0;
    this.lastAnalysis = null;
  }

  /**
   * 获取上次分析结果
   */
  getLastAnalysis(): RealizationGapAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RealizationGapConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/** ========== 工具函数 ========== */

/**
 * 基于 H₄ 熵生成搜索策略建议
 */
export function suggestSearchStrategy(analysis: RealizationGapAnalysis): string {
  const strategies: Record<string, string> = {
    explore: '探索新区域：H₄ 适中，子流形小，应扩展认知边界',
    exploit: '利用已有状态：H₄ 偏低，子流形成熟，应深化已有认知',
    reset: '空态重置：H₄ 在禁带 [0.2, 0.3) 中，需要重新激发',
    focus: '聚焦高熵区域：H₄ 偏高，应减少随机探索，收敛到高价值区域'
  };

  return strategies[analysis.suggestedStrategy] || '继续当前搜索策略';
}

/**
 * 计算归一化四相熵
 */
export function normalizedFourPhaseEntropy(phases: FourPhase[]): number {
  if (phases.length === 0) return 0;

  const counts: Record<string, number> = {
    [FourPhase.OldYang]: 0,
    [FourPhase.YoungYin]: 0,
    [FourPhase.OldYin]: 0,
    [FourPhase.YoungYang]: 0
  };

  const validPhases = phases.filter(p => p !== FourPhase.Void);
  if (validPhases.length === 0) return 0;

  for (const p of validPhases) {
    counts[p]++;
  }

  const total = validPhases.length;
  let entropy = 0;
  for (const phase of Object.values(FourPhase)) {
    if (phase === FourPhase.Void) continue;
    const p = counts[phase] / total;
    if (p > 0) {
      entropy -= p * Math.log(p) / Math.log(4);
    }
  }

  return entropy;
}