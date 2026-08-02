/**
 * 梦境推理：无数据自主学习 (Dream Reasoning)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 6.3：在闭市或数据稀缺期，认知场进入"梦境状态"——
 * 无需外部输入，在流形上自主生成自洽轨迹。
 *
 * 梦境 Hamiltonian：
 *   H_dream(x,p) = H(x,p) + α·R(x,p)
 *   其中 R(x,p) 是反事实奖励，评估生成轨迹的"有趣性"
 *   R = novelty × coherence × predictive_consistency
 *
 * 三种用途：
 *   1. 压力测试：已有耦合 J_ij 在合成极端场景下是否稳定
 *   2. 边界发现：历史数据未曾访问的 T*S⁸ 区域
 *   3. 反事实学习："如果在相位 θ* 而非 θ 行动，会怎样？"
 *
 * 梦境/清醒交替比 R_dream/wake ≈ 0.25，模拟哺乳动物睡眠-觉醒周期
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, Trit } from './trit-vector';
import { CognitiveDistance } from './distance';
import { FourPhase, FOUR_PHASE_NAMES, FourPhaseAnalysis } from './four-phase';
import { PiEResonanceState } from './pi-e-resonance';

/** ========== 类型定义 ========== */

/** 梦境配置 */
export interface DreamConfig {
  /** 梦境/清醒交替比，默认 0.25 */
  dreamWakeRatio: number;
  /** 反事实奖励权重 α，默认 0.3 */
  alpha: number;
  /** 新颖性权重，默认 0.4 */
  noveltyWeight: number;
  /** 一致性权重，默认 0.3 */
  coherenceWeight: number;
  /** 预测一致性权重，默认 0.3 */
  predictiveWeight: number;
  /** 每轮梦境步数，默认 50 */
  dreamSteps: number;
  /** 是否启用梦境 */
  enabled: boolean;
}

/** 默认梦境配置 */
export const DEFAULT_DREAM_CONFIG: DreamConfig = {
  dreamWakeRatio: 0.25,
  alpha: 0.3,
  noveltyWeight: 0.4,
  coherenceWeight: 0.3,
  predictiveWeight: 0.3,
  dreamSteps: 50,
  enabled: true
};

/** 梦境轨迹点 */
export interface DreamTrajectoryPoint {
  /** 步数索引 */
  step: number;
  /** 认知状态向量 */
  state: TritVector;
  /** 反事实奖励 R */
  reward: number;
  /** 新颖性得分 */
  novelty: number;
  /** 一致性得分 */
  coherence: number;
  /** 预测一致性得分 */
  predictiveConsistency: number;
  /** 哈密顿量 H 值 */
  hamiltonian: number;
  /** 当前相位（如果可识别） */
  phase?: FourPhase;
}

/** 梦境分析结果 */
export interface DreamAnalysis {
  /** 梦境轨迹 */
  trajectory: DreamTrajectoryPoint[];
  /** 总步数 */
  totalSteps: number;
  /** 平均奖励 */
  meanReward: number;
  /** 发现的新边界状态 */
  discoveredBoundaries: TritVector[];
  /** 发现的耦合不稳定点 */
  unstableCouplings: { dim1: number; dim2: number; instability: number }[];
  /** 反事实场景 */
  counterfactuals: CounterfactualResult[];
  /** 是否成功完成梦境周期 */
  completed: boolean;
}

/** 反事实分析结果 */
export interface CounterfactualResult {
  /** 实际相位 */
  actualPhase: FourPhase;
  /** 反事实相位 */
  counterfactualPhase: FourPhase;
  /** 实际结果（轨迹终点） */
  actualOutcome: TritVector;
  /** 反事实结果 */
  counterfactualOutcome: TritVector;
  /** 结果差异度 */
  divergence: number;
  /** 反事实问题描述 */
  question: string;
}

/** 梦境状态机状态 */
export enum DreamState {
  /** 清醒态：正常认知处理 */
  Wake = 'wake',
  /** 入梦境：过渡到梦境 */
  FallingAsleep = 'falling_asleep',
  /** 深度梦境：自主轨迹生成 */
  DeepDream = 'deep_dream',
  /** 觉醒态：从梦境恢复 */
  Waking = 'waking',
  /** 反事实整合：学习结果吸收 */
  Integration = 'integration'
}

/** ========== 梦境推理引擎 ========== */

/**
 * 梦境推理引擎
 * ─────────────────────────────────────────────────────────────
 * 在无外部数据输入时，生成自洽的认知轨迹，
 * 用于压力测试、边界发现和反事实学习。
 */
export class DreamReasoning {
  private config: DreamConfig;
  private state: DreamState = DreamState.Wake;
  private wakeCycle: number = 0;
  private dreamCycle: number = 0;
  private visitedStates: Set<number> = new Set();
  private lastDreamAnalysis: DreamAnalysis | null = null;

  constructor(config: Partial<DreamConfig> = {}) {
    this.config = { ...DEFAULT_DREAM_CONFIG, ...config };
  }

  /**
   * 检查是否应该进入梦境
   * ─────────────────────────────────────────────────────────────
   * 基于 dreamWakeRatio 和当前清醒周期步数
   */
  shouldDream(currentStep: number): boolean {
    if (!this.config.enabled) return false;
    this.wakeCycle = currentStep;

    // 每 N 步进入一次梦境，N = 1/R_dream/wake ≈ 4
    const cycleLength = Math.round(1 / this.config.dreamWakeRatio);
    return currentStep > 0 && currentStep % cycleLength === 0;
  }

  /**
   * 执行一轮梦境推理
   * ─────────────────────────────────────────────────────────────
   * 从当前状态出发，在 H_dream = H + α·R 驱动下生成自主轨迹
   */
  async dream(
    currentState: TritVector,
    phase: FourPhase,
    historicalStates: TritVector[] = []
  ): Promise<DreamAnalysis> {
    this.state = DreamState.FallingAsleep;
    this.dreamCycle++;

    // 初始化历史状态集
    for (const s of historicalStates) {
      this.visitedStates.add(TritVectorOps.toHexagramIndex(s));
    }

    const trajectory: DreamTrajectoryPoint[] = [];
    const discoveredBoundaries: TritVector[] = [];
    const unstableCouplings: { dim1: number; dim2: number; instability: number }[] = [];
    const counterfactuals: CounterfactualResult[] = [];

    this.state = DreamState.DeepDream;

    // 梦境轨迹生成
    let dreamState = currentState;
    for (let step = 0; step < this.config.dreamSteps; step++) {
      // 计算反事实奖励 R = novelty × coherence × predictiveConsistency
      const novelty = this.computeNovelty(dreamState);
      const coherence = this.computeCoherence(dreamState, trajectory);
      const predictiveConsistency = this.computePredictiveConsistency(
        dreamState, trajectory, step
      );

      const reward = this.config.noveltyWeight * novelty +
        this.config.coherenceWeight * coherence +
        this.config.predictiveWeight * predictiveConsistency;

      // 更新轨迹点
      const point: DreamTrajectoryPoint = {
        step,
        state: dreamState,
        reward,
        novelty,
        coherence,
        predictiveConsistency,
        hamiltonian: this.computeDreamHamiltonian(dreamState, reward)
      };
      trajectory.push(point);

      // 记录访问状态
      this.visitedStates.add(TritVectorOps.toHexagramIndex(dreamState));

      // 检测边界状态（未被历史数据访问过的区域）
      if (novelty > 0.7) {
        discoveredBoundaries.push(dreamState);
      }

      // 耦合不稳定性检测（每 10 步）
      if (step > 0 && step % 10 === 0) {
        const couplingTest = this.testCouplingStability(dreamState, trajectory);
        unstableCouplings.push(...couplingTest);
      }

      // 演化到下一状态：在梦境 Hamiltonian 驱动下
      dreamState = this.evolveDreamState(dreamState, reward, step);
    }

    // 反事实学习
    this.state = DreamState.Waking;
    counterfactuals.push(...this.generateCounterfactuals(
      currentState, phase, trajectory
    ));

    // 整合
    this.state = DreamState.Integration;

    const analysis: DreamAnalysis = {
      trajectory,
      totalSteps: this.config.dreamSteps,
      meanReward: trajectory.reduce((a, p) => a + p.reward, 0) / trajectory.length,
      discoveredBoundaries,
      unstableCouplings,
      counterfactuals,
      completed: true
    };

    this.lastDreamAnalysis = analysis;
    this.state = DreamState.Wake;

    return analysis;
  }

  /**
   * 计算新颖性
   * ─────────────────────────────────────────────────────────────
   * 基于当前状态是否被访问过及与已访问状态的距离
   */
  private computeNovelty(state: TritVector): number {
    const idx = TritVectorOps.toHexagramIndex(state);

    // 从未访问过 → 最大新颖性
    if (!this.visitedStates.has(idx)) return 1.0;

    // 已访问过 → 基于到最近未访问状态的距离衰减
    const arr = TritVectorOps.toArray(state);
    const activeDims = arr.filter(t => t !== 0).length;

    // 0 维度越多，越接近已探索区域
    return 0.5 * (1 - activeDims / 9);
  }

  /**
   * 计算一致性
   * ─────────────────────────────────────────────────────────────
   * 轨迹的自洽性：连续状态之间的平均距离较小 → 高一致性
   */
  private computeCoherence(
    state: TritVector,
    trajectory: DreamTrajectoryPoint[]
  ): number {
    if (trajectory.length < 2) return 1.0;

    // 最近几步的平均距离
    const recentSteps = trajectory.slice(-5);
    const distances = recentSteps.map(p =>
      TritVectorOps.manhattanDistance(p.state, state)
    );
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;

    // 距离越小，一致性越高（归一化到 [0,1]）
    return Math.max(0, 1 - avgDist / 18);
  }

  /**
   * 计算预测一致性
   * ─────────────────────────────────────────────────────────────
   * 当前状态与基于前一步的预测之间的匹配度
   */
  private computePredictiveConsistency(
    state: TritVector,
    trajectory: DreamTrajectoryPoint[],
    step: number
  ): number {
    if (trajectory.length < 1) return 0.5;

    // 简单预测：前一步状态 + 趋势方向
    const prevState = trajectory[trajectory.length - 1].state;
    const distance = TritVectorOps.manhattanDistance(prevState, state);

    // 距离在 1~3 之间为可预测的渐进变化
    if (distance <= 3) return 1.0 - distance / 6;
    if (distance <= 6) return 0.5;
    return 0.2; // 大幅跳跃 → 低预测一致性
  }

  /**
   * 计算梦境 Hamiltonian
   * ─────────────────────────────────────────────────────────────
   * H_dream(x,p) = H(x,p) + α·R(x,p)
   */
  private computeDreamHamiltonian(state: TritVector, reward: number): number {
    // 基础 H 近似：状态的活跃维度数（负值，0 态最低）
    const arr = TritVectorOps.toArray(state);
    const baseH = -arr.filter(t => t !== 0).length;

    // 梦境修正
    return baseH + this.config.alpha * reward;
  }

  /**
   * 梦境状态演化
   * ─────────────────────────────────────────────────────────────
   * 在 H_dream 驱动下，朝高奖励方向移动
   */
  private evolveDreamState(
    current: TritVector,
    reward: number,
    step: number
  ): TritVector {
    const arr = TritVectorOps.toArray(current);

    // 基于奖励和步数，决定如何改变状态
    const changeProbability = 0.3 + 0.4 * reward; // 高奖励→更可能变化
    const newArr = [...arr];

    for (let i = 0; i < 9; i++) {
      if (Math.random() < changeProbability) {
        // 随机翻转：向更极端或更中性方向
        const choices = [-1, 0, 1].filter(v => v !== arr[i]);
        newArr[i] = choices[Math.floor(Math.random() * choices.length)] as Trit;
      }
    }

    return TritVectorOps.fromArray(newArr as Trit[]);
  }

  /**
   * 测试耦合稳定性
   * ─────────────────────────────────────────────────────────────
   * 检查 J_ij 耦合在梦境轨迹中是否保持稳定
   */
  private testCouplingStability(
    state: TritVector,
    trajectory: DreamTrajectoryPoint[]
  ): { dim1: number; dim2: number; instability: number }[] {
    const results: { dim1: number; dim2: number; instability: number }[] = [];
    const arr = TritVectorOps.toArray(state);

    // 测试相邻维度的耦合（时间-空间-因果 三组三值）
    const groups = [
      [0, 1, 2],  // 时间维度
      [3, 4, 5],  // 空间维度
      [6, 7, 8]   // 因果维度
    ];

    for (const group of groups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const d1 = group[i];
          const d2 = group[j];

          // 计算耦合稳定性：值是否在梦境中频繁变化
          const recent = trajectory.slice(-5);
          const d1Values = recent.map(p => TritVectorOps.toArray(p.state)[d1]);
          const d2Values = recent.map(p => TritVectorOps.toArray(p.state)[d2]);

          // 不稳定性 = 两维度变化方向不一致的频率
          let mismatches = 0;
          for (let k = 1; k < d1Values.length; k++) {
            const d1Delta = d1Values[k] - d1Values[k - 1];
            const d2Delta = d2Values[k] - d2Values[k - 1];
            if (d1Delta !== 0 && d2Delta !== 0 && d1Delta * d2Delta < 0) {
              mismatches++;
            }
          }

          const instability = mismatches / Math.max(1, d1Values.length - 1);
          if (instability > 0.5) {
            results.push({ dim1: d1, dim2: d2, instability });
          }
        }
      }
    }

    return results;
  }

  /**
   * 生成反事实场景
   * ─────────────────────────────────────────────────────────────
   * "如果在相位 θ* 而非 θ 行动，会怎样？"
   */
  private generateCounterfactuals(
    currentState: TritVector,
    actualPhase: FourPhase,
    trajectory: DreamTrajectoryPoint[]
  ): CounterfactualResult[] {
    const results: CounterfactualResult[] = [];
    const currentArr = TritVectorOps.toArray(currentState);

    // 对每个相位生成一个反事实
    const phases = [FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang];
    const phaseNames: Record<FourPhase, string> = {
      [FourPhase.OldYang]: '老阳',
      [FourPhase.YoungYin]: '少阴',
      [FourPhase.OldYin]: '老阴',
      [FourPhase.YoungYang]: '少阳',
      [FourPhase.Void]: '空态'
    };

    const phaseActions: Record<FourPhase, (arr: number[]) => number[]> = {
      [FourPhase.OldYang]: (a) => { const n = [...a]; n[2] = 1; n[4] = 1; return n; },  // 未来+1，中+1
      [FourPhase.YoungYin]: (a) => { const n = [...a]; n[1] = 1; n[7] = 1; return n; },  // 现在+1，缘+1
      [FourPhase.OldYin]: (a) => { const n = [...a]; n[0] = -1; n[5] = -1; return n; },  // 过去-1，外-1
      [FourPhase.YoungYang]: (a) => { const n = [...a]; n[3] = 1; n[6] = 1; return n; }, // 内+1，因+1
      [FourPhase.Void]: (a) => a.map(() => 0)
    };

    for (const cfPhase of phases) {
      if (cfPhase === actualPhase) continue;

      const cfAction = phaseActions[cfPhase](currentArr);
      const cfOutcome = TritVectorOps.fromArray(cfAction as Trit[]);

      // 计算差异
      const divergence = TritVectorOps.manhattanDistance(currentState, cfOutcome);

      results.push({
        actualPhase,
        counterfactualPhase: cfPhase,
        actualOutcome: currentState,
        counterfactualOutcome: cfOutcome,
        divergence,
        question: `如果在 ${phaseNames[cfPhase]} 相位行动而非 ${phaseNames[actualPhase]} 相位，` +
          `认知状态会偏移 ${divergence} 个维度`
      });
    }

    return results;
  }

  /**
   * 获取访问状态数
   */
  getVisitedStateCount(): number {
    return this.visitedStates.size;
  }

  /**
   * 获取当前梦境状态
   */
  getDreamState(): DreamState {
    return this.state;
  }

  /**
   * 获取上次梦境分析
   */
  getLastDreamAnalysis(): DreamAnalysis | null {
    return this.lastDreamAnalysis;
  }

  /**
   * 重置梦境引擎
   */
  reset(): void {
    this.state = DreamState.Wake;
    this.wakeCycle = 0;
    this.dreamCycle = 0;
    this.visitedStates.clear();
    this.lastDreamAnalysis = null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DreamConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/** ========== 工具函数 ========== */

/**
 * 判断是否应该进入梦境
 * ─────────────────────────────────────────────────────────────
 * 基于步数和 dreamWakeRatio
 */
export function shouldDreamCycle(
  currentStep: number,
  ratio: number = DEFAULT_DREAM_CONFIG.dreamWakeRatio
): boolean {
  const cycleLength = Math.round(1 / ratio);
  return currentStep > 0 && currentStep % cycleLength === 0;
}

/**
 * 从梦境轨迹中提取关键洞察
 */
export function extractDreamInsights(analysis: DreamAnalysis): {
  boundaryCount: number;
  unstableCouplingCount: number;
  counterfactualCount: number;
  meanReward: number;
  topInsights: string[];
} {
  const insights: string[] = [];

  if (analysis.discoveredBoundaries.length > 0) {
    insights.push(`发现 ${analysis.discoveredBoundaries.length} 个新边界状态`);
  }

  if (analysis.unstableCouplings.length > 0) {
    insights.push(`检测到 ${analysis.unstableCouplings.length} 个不稳定耦合`);
  }

  for (const cf of analysis.counterfactuals) {
    if (cf.divergence > 5) {
      insights.push(cf.question);
    }
  }

  return {
    boundaryCount: analysis.discoveredBoundaries.length,
    unstableCouplingCount: analysis.unstableCouplings.length,
    counterfactualCount: analysis.counterfactuals.length,
    meanReward: analysis.meanReward,
    topInsights: insights.slice(0, 5)
  };
}