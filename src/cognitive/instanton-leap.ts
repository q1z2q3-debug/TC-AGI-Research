/**
 * 瞬子跃迁：拓扑直觉推理 (Topological Instanton Leaping)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 6.2：非演绎直觉作为拓扑瞬子跃迁。
 *
 * 核心思想：
 *   Hamiltonian 动力学是确定性的、局部的——推理沿辛测地线
 *   （H 的梯度上升/下降）。但专家认知表现出"直觉"——
 *   一种快速、非演绎的跃迁到远处但正确的状态。
 *   我们建模为拓扑瞬子跃迁，局部梯度流无法生成。
 *
 * 瞬子作用量 S_inst(a,b) = ∫γ √(g(γ̇,γ̇) + V(γ)) dt
 * 跃迁率 Γ_{a→b} = ν₀·exp(-S_inst(a,b)/ħ_cog)
 *
 * 四种瞬子类型：
 *   Logical (S→0)     — 演绎推理
 *   Intuitive (S>0,min) — 非演绎直觉
 *   Creative (S大,新γ) — 新连接发现
 *   Void (S→∞)        — 无可行路径→Π_∅
 *
 * 瞬子框架与 Hamiltonian 主干共存：
 *   正常条件下 → 确定性测地线演化
 *   认知停滞时 → 瞬子隧穿
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, Trit } from './trit-vector';
import { CognitiveDistance } from './distance';
import { FourPhase, FOUR_PHASE_NAMES } from './four-phase';

/** ========== 类型定义 ========== */

/** 瞬子类型 */
export enum InstantonType {
  /** 演绎推理：S_inst → 0，局部梯度可到达 */
  Logical = 'logical',
  /** 直觉：S_inst > 0 但最小，非演绎跃迁 */
  Intuitive = 'intuitive',
  /** 创造：S_inst 大，发现全新路径 */
  Creative = 'creative',
  /** 空态：S_inst → ∞，无可行路径 */
  Void = 'void'
}

/** 瞬子类型的中文标注 */
export const INSTANTON_TYPE_NAMES: Record<InstantonType, string> = {
  [InstantonType.Logical]: '演绎·逻辑推理',
  [InstantonType.Intuitive]: '直觉·非演绎跃迁',
  [InstantonType.Creative]: '创造·新连接发现',
  [InstantonType.Void]: '空态·无可行路径'
};

/** 瞬子跃迁配置 */
export interface InstantonConfig {
  /** 认知 Planck 常数 ħ_cog：最小作用量子，默认 0.15 nat */
  hbarCog: number;
  /** 尝试频率 ν₀，默认 1.0 */
  nu0: number;
  /** 势垒 V 的缩放因子，默认 1.0 */
  potentialScale: number;
  /** 认知停滞检测窗口（步数），默认 10 */
  stallWindow: number;
  /** 停滞置信度方差阈值，默认 0.05 */
  stallVarianceThreshold: number;
  /** 是否启用瞬子跃迁 */
  enabled: boolean;
}

/** 默认瞬子配置 */
export const DEFAULT_INSTANTON_CONFIG: InstantonConfig = {
  hbarCog: 0.15,
  nu0: 1.0,
  potentialScale: 1.0,
  stallWindow: 10,
  stallVarianceThreshold: 0.05,
  enabled: true
};

/** 瞬子路径节点 */
export interface InstantonPathNode {
  /** 节点索引（卦象索引） */
  index: number;
  /** 该节点的累积作用量 */
  cumulativeAction: number;
  /** 前驱节点索引 */
  predecessor: number | null;
  /** 到前驱的局部作用量增量 */
  localAction: number;
  /** 节点处的势垒 V */
  potential: number;
}

/** 瞬子跃迁结果 */
export interface InstantonTransition {
  /** 源状态 */
  source: TritVector;
  /** 目标状态 */
  target: TritVector;
  /** 瞬子类型 */
  type: InstantonType;
  /** 瞬子作用量 S_inst */
  action: number;
  /** 跃迁率 Γ = ν₀·exp(-S_inst/ħ_cog) */
  rate: number;
  /** 路径上的中间状态序列 */
  path: TritVector[];
  /** 路径长度（步数） */
  pathLength: number;
  /** 是否成功跃迁 */
  success: boolean;
  /** 如果失败，原因 */
  failureReason?: string;
}

/** 认知停滞检测结果 */
export interface StallDetection {
  /** 是否处于认知停滞 */
  isStalled: boolean;
  /** 停滞持续时间（步数） */
  stallDuration: number;
  /** 最近窗口内的置信度序列 */
  recentConfidence: number[];
  /** 置信度方差 */
  confidenceVariance: number;
  /** 认知熵稳定性 */
  entropyStability: number;
  /** 建议触发的瞬子类型 */
  suggestedInstanton: InstantonType;
}

/** ========== 瞬子跃迁引擎 ========== */

/**
 * 拓扑瞬子跃迁引擎
 * ─────────────────────────────────────────────────────────────
 * 在 Hamiltonian 确定性测地线演化之外，提供非局部认知跃迁能力。
 * 当检测到认知停滞时，主动寻找最小作用量路径实现瞬子隧穿。
 */
export class InstantonLeap {
  private config: InstantonConfig;
  private confidenceHistory: number[] = [];
  private entropyHistory: number[] = [];
  private stallCounter: number = 0;
  private lastTransition: InstantonTransition | null = null;

  constructor(config: Partial<InstantonConfig> = {}) {
    this.config = { ...DEFAULT_INSTANTON_CONFIG, ...config };
  }

  /**
   * 计算瞬子作用量 S_inst(a,b)
   * ─────────────────────────────────────────────────────────────
   * S_inst(a,b) = ∫γ √(g(γ̇,γ̇) + V(γ)) dt
   *
   * 离散近似：沿最短路径，每步的贡献 = √(d² + V)
   * 其中 d 是辛度量下的距离，V 是势垒
   */
  computeInstantonAction(
    source: TritVector,
    target: TritVector
  ): { action: number; path: TritVector[] } {
    const srcIdx = TritVectorOps.toHexagramIndex(source);
    const tgtIdx = TritVectorOps.toHexagramIndex(target);

    // 如果相同，作用量为 0
    if (srcIdx === tgtIdx) {
      return { action: 0, path: [source] };
    }

    // 使用 A* 搜索找到最小作用量路径
    const result = this.aStarSearch(source, target);
    return result;
  }

  /**
   * A* 搜索：在三维认知空间中寻找最小作用量路径
   * ─────────────────────────────────────────────────────────────
   * 启发式：剩余曼哈顿距离 × 平均势垒
   * 每步代价：√(d² + V) 其中 d 是辛度量距离，V 是势垒
   */
  private aStarSearch(
    source: TritVector,
    target: TritVector
  ): { action: number; path: TritVector[] } {
    const srcArr = TritVectorOps.toArray(source);
    const tgtArr = TritVectorOps.toArray(target);

    // 计算每维的差异，得到需要变化的维度
    const diffs: number[] = [];
    for (let i = 0; i < 9; i++) {
      diffs.push(tgtArr[i] - srcArr[i]);
    }

    // 生成路径：逐维翻转，每次改变一个 trit
    // 这是最小作用量路径的近似——每次沿单维变化
    const path: TritVector[] = [source];
    let totalAction = 0;
    const currentArr = [...srcArr];

    for (let i = 0; i < 9; i++) {
      const diff = diffs[i];
      if (diff === 0) continue;

      // 需要变化的步数（-1→0→1 或 1→0→-1）
      const step = diff > 0 ? 1 : -1;
      let currentVal = currentArr[i];
      while (currentVal !== tgtArr[i]) {
        currentVal += step;
        currentArr[i] = currentVal as unknown as Trit;

        // 构建中间向量
        const clampedArr = currentArr.map(v => {
          const clamped = Math.max(-1, Math.min(1, v));
          return (clamped === 0 ? 0 : clamped > 0 ? 1 : -1);
        }) as Trit[];
        const midVec = TritVectorOps.fromArray(clampedArr);

        // 计算这一步的局部作用量
        // d = 1（曼哈顿距离，单维变化）
        // V = |currentVal| * config.potentialScale（中间态势垒，0态势垒最低）
        const potential = Math.abs(currentVal) * this.config.potentialScale;
        const localAction = Math.sqrt(1 + potential * potential);
        totalAction += localAction;

        path.push(midVec);
      }
    }

    return { action: totalAction, path };
  }

  /**
   * 计算跃迁率 Γ_{a→b} = ν₀·exp(-S_inst/ħ_cog)
   */
  computeTransitionRate(action: number): number {
    if (action === Infinity) return 0;
    return this.config.nu0 * Math.exp(-action / this.config.hbarCog);
  }

  /**
   * 分类瞬子类型
   */
  classifyInstanton(
    action: number,
    isDirectPath: boolean
  ): InstantonType {
    if (action === Infinity) return InstantonType.Void;
    if (action < 0.1) return InstantonType.Logical;
    if (isDirectPath) return InstantonType.Intuitive;
    return InstantonType.Creative;
  }

  /**
   * 执行瞬子跃迁
   * ─────────────────────────────────────────────────────────────
   * 从源状态到目标状态，计算作用量、跃迁率、分类，并返回完整结果
   */
  attemptTransition(
    source: TritVector,
    target: TritVector
  ): InstantonTransition {
    if (!this.config.enabled) {
      return {
        source,
        target,
        type: InstantonType.Logical,
        action: 0,
        rate: 1,
        path: [source, target],
        pathLength: 1,
        success: true
      };
    }

    const { action, path } = this.computeInstantonAction(source, target);

    // 判断是否直接路径（路径长度 = 变化维度数 + 1）
    const srcArr = TritVectorOps.toArray(source);
    const tgtArr = TritVectorOps.toArray(target);
    const changedDims = srcArr.filter((v, i) => v !== tgtArr[i]).length;
    const isDirectPath = path.length === changedDims + 1;

    const type = this.classifyInstanton(action, isDirectPath);
    const rate = this.computeTransitionRate(action);

    const transition: InstantonTransition = {
      source,
      target,
      type,
      action,
      rate,
      path,
      pathLength: path.length,
      success: type !== InstantonType.Void && rate > 0.01
    };

    if (!transition.success) {
      transition.failureReason = type === InstantonType.Void
        ? '无可行认知路径'
        : `跃迁率过低 (${rate.toFixed(4)})`;
    }

    this.lastTransition = transition;
    return transition;
  }

  /**
   * 检测认知停滞
   * ─────────────────────────────────────────────────────────────
   * 基于最近窗口内的置信度方差和认知熵稳定性判断是否停滞
   */
  detectStall(
    currentConfidence: number,
    currentEntropy: number
  ): StallDetection {
    this.confidenceHistory.push(currentConfidence);
    this.entropyHistory.push(currentEntropy);

    // 只保留最近的窗口
    if (this.confidenceHistory.length > this.config.stallWindow) {
      this.confidenceHistory.shift();
    }
    if (this.entropyHistory.length > this.config.stallWindow) {
      this.entropyHistory.shift();
    }

    // 计算置信度方差
    const mean = this.confidenceHistory.reduce((a, b) => a + b, 0) / this.confidenceHistory.length;
    const variance = this.confidenceHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.confidenceHistory.length;

    // 计算熵稳定性（最近熵值与均值的偏差）
    const entropyMean = this.entropyHistory.reduce((a, b) => a + b, 0) / this.entropyHistory.length;
    const entropyStability = 1 - Math.min(
      Math.abs(currentEntropy - entropyMean) / (entropyMean + 0.001),
      1
    );

    const isStalled = variance < this.config.stallVarianceThreshold &&
      entropyStability > 0.9 &&
      this.confidenceHistory.length >= this.config.stallWindow;

    // 根据停滞状态推荐瞬子类型
    let suggestedType = InstantonType.Logical;
    if (isStalled) {
      if (currentConfidence < 0.3) {
        suggestedType = InstantonType.Void;
      } else if (currentConfidence < 0.5) {
        suggestedType = InstantonType.Intuitive;
      } else {
        suggestedType = InstantonType.Creative;
      }
    }

    if (isStalled) {
      this.stallCounter++;
    } else {
      this.stallCounter = 0;
    }

    return {
      isStalled,
      stallDuration: this.stallCounter,
      recentConfidence: [...this.confidenceHistory],
      confidenceVariance: variance,
      entropyStability,
      suggestedInstanton: suggestedType
    };
  }

  /**
   * 寻找瞬子跃迁目标
   * ─────────────────────────────────────────────────────────────
   * 在当前认知状态周围搜索，找到瞬子作用量最小的可行目标状态
   */
  findInstantonTarget(
    currentState: TritVector,
    candidateStates: TritVector[],
    currentPhase: FourPhase
  ): { target: TritVector; transition: InstantonTransition } | null {
    if (candidateStates.length === 0) return null;

    let bestAction = Infinity;
    let bestTarget: TritVector | null = null;
    let bestTransition: InstantonTransition | null = null;

    for (const candidate of candidateStates) {
      const transition = this.attemptTransition(currentState, candidate);

      // 优先选择可行且作用量最小的跃迁
      if (transition.success && transition.action < bestAction) {
        bestAction = transition.action;
        bestTarget = candidate;
        bestTransition = transition;
      }
    }

    if (bestTarget && bestTransition) {
      return { target: bestTarget, transition: bestTransition };
    }

    // 如果没有可行候选，返回空态导向
    const voidTarget = TritVectorOps.zero();
    const voidTransition = this.attemptTransition(currentState, voidTarget);
    return { target: voidTarget, transition: voidTransition };
  }

  /**
   * 重置瞬子引擎状态
   */
  reset(): void {
    this.confidenceHistory = [];
    this.entropyHistory = [];
    this.stallCounter = 0;
    this.lastTransition = null;
  }

  /** 获取上次跃迁记录 */
  getLastTransition(): InstantonTransition | null {
    return this.lastTransition;
  }

  /** 获取当前配置 */
  getConfig(): InstantonConfig {
    return { ...this.config };
  }

  /** 更新配置 */
  updateConfig(config: Partial<InstantonConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/** ========== 工具函数 ========== */

/**
 * 计算状态之间的势垒 V
 * ─────────────────────────────────────────────────────────────
 * 基于目标状态的活跃维度数：0 越多，势垒越低
 * 全零态（空态）势垒最低，激活维度越多势垒越高
 */
export function computePotential(state: TritVector): number {
  const arr = TritVectorOps.toArray(state);
  const activeDims = arr.filter(t => t !== 0).length;
  return activeDims / 9; // [0, 1] 范围
}

/**
 * 生成瞬子候选目标列表
 * ─────────────────────────────────────────────────────────────
 * 基于当前状态，生成不同距离的候选目标：
 * - 近邻（1维变化）：逻辑推理
 * - 中距（2-3维变化）：直觉跃迁
 * - 远距（4+维变化）：创造性跃迁
 * - 空态（全0）：归元
 */
export function generateInstantonCandidates(
  current: TritVector,
  count: number = 5
): TritVector[] {
  const candidates: TritVector[] = [];
  const currentArr = TritVectorOps.toArray(current);

  // 1. 空态
  candidates.push(TritVectorOps.zero());

  // 2. 单维翻转（近邻直觉）
  for (let i = 0; i < Math.min(3, count); i++) {
    const dim = Math.floor(Math.random() * 9);
    const newArr = [...currentArr];
    // 在当前值上翻转：-1→1, 0→±1, 1→-1
    const flip = (currentArr[dim] === 1) ? -1 : currentArr[dim] + 1;
    newArr[dim] = flip as Trit;
    candidates.push(TritVectorOps.fromArray(newArr as Trit[]));
  }

  // 3. 多维同时变化（创造跃迁）
  for (let i = 0; i < Math.min(2, count - candidates.length); i++) {
    const newArr = [...currentArr];
    const numChanges = 2 + Math.floor(Math.random() * 3); // 2~4 维
    const dims = new Set<number>();
    while (dims.size < numChanges) {
      dims.add(Math.floor(Math.random() * 9));
    }
    for (const d of dims) {
      const flip = (Math.random() > 0.5) ? 1 : -1;
      newArr[d] = flip as Trit;
    }
    candidates.push(TritVectorOps.fromArray(newArr as Trit[]));
  }

  return candidates.slice(0, count);
}