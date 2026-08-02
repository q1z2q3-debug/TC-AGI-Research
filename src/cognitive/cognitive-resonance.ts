/**
 * 认知共振与涟漪场 (Cognitive Resonance & Ripple Field)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 6.4：19683 态认知场的共振现象。
 *
 * 共振耦合 κ(σ₁, σ₂) = |⟨∇H₁, ∇H₂⟩| / (‖∇H₁‖·‖∇H₂‖)
 *   κ = 1 → 完美共振（相同动力学方向）
 *   κ = 0 → 正交认知模式
 *
 * 共振使能：
 *   1. 集体状态收敛：多个认知模式自然收敛到附近卦象
 *   2. 信息共享：共振态通过辛平行传输交换认知内容
 *   3. 认知相变：在临界共振密度，场发生相变到新集体认知状态
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS } from './trit-vector';
import { CognitiveDistance } from './distance';

/** 共振耦合结果 */
export interface ResonanceCoupling {
  /** 共振耦合度 κ ∈ [0, 1] */
  kappa: number;
  /** 是否处于共振状态（κ > 阈值） */
  isResonant: boolean;
  /** 哈密顿梯度方向一致性 */
  gradientAlignment: number;
  /** 认知模式之间的距离 */
  cognitiveDistance: number;
  /** 共振角度（弧度） */
  resonanceAngle: number;
}

/** 集体状态收敛结果 */
export interface CollectiveState {
  /** 收敛后的共识卦象向量 */
  consensusState: TritVector;
  /** 共识置信度 */
  consensusConfidence: number;
  /** 参与共振的个体数 */
  participantCount: number;
  /** 平均共振度 */
  meanResonance: number;
  /** 认知场熵 */
  fieldEntropy: number;
  /** 是否达到相变阈值 */
  phaseTransition: boolean;
}

/** 信息共享包 */
export interface ResonancePacket {
  /** 源认知模式 ID */
  sourceId: string;
  /** 目标认知模式 ID */
  targetId: string;
  /** 共享的认知内容（卦象 delta） */
  content: Partial<TritVector>;
  /** 共享置信度 */
  confidence: number;
  /** 共振耦合度 */
  coupling: ResonanceCoupling;
}

/** 认知模式接口 */
export interface CognitiveMode {
  /** 模式 ID */
  id: string;
  /** 当前认知状态 */
  state: TritVector;
  /** 认知熵（不确定性度量） */
  entropy: number;
  /** 权重（共识时使用） */
  weight: number;
  /** 历史轨迹 */
  history: TritVector[];
}

/** 默认共振阈值 */
const DEFAULT_RESONANCE_THRESHOLD = 0.5;

/** 默认相变阈值 */
const DEFAULT_PHASE_TRANSITION_THRESHOLD = 0.7;

/**
 * 认知共振引擎
 * ─────────────────────────────────────────────────────────────
 * 管理多个认知模式之间的共振耦合、集体状态收敛和信息共享。
 */
export class CognitiveResonance {
  private modes: Map<string, CognitiveMode> = new Map();
  private resonanceThreshold: number;
  private phaseTransitionThreshold: number;
  private couplingHistory: { t: number; meanKappa: number }[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(
    resonanceThreshold: number = DEFAULT_RESONANCE_THRESHOLD,
    phaseTransitionThreshold: number = DEFAULT_PHASE_TRANSITION_THRESHOLD
  ) {
    this.resonanceThreshold = resonanceThreshold;
    this.phaseTransitionThreshold = phaseTransitionThreshold;
  }

  /**
   * 注册一个认知模式
   */
  registerMode(id: string, state: TritVector, entropy: number = 0.5, weight: number = 1.0): void {
    this.modes.set(id, {
      id,
      state,
      entropy,
      weight,
      history: [{ ...state }]
    });
  }

  /**
   * 更新认知模式的状态
   */
  updateMode(id: string, state: TritVector, entropy?: number): void {
    const mode = this.modes.get(id);
    if (!mode) {
      this.registerMode(id, state);
      return;
    }

    mode.state = { ...state };
    if (entropy !== undefined) mode.entropy = entropy;
    mode.history.push({ ...state });
    // 限制历史长度
    if (mode.history.length > 100) mode.history.shift();
  }

  /**
   * 移除认知模式
   */
  removeMode(id: string): void {
    this.modes.delete(id);
  }

  /**
   * 获取所有注册的认知模式
   */
  getModes(): CognitiveMode[] {
    return Array.from(this.modes.values());
  }

  /**
   * 计算两个认知模式之间的共振耦合度
   * κ(σ₁, σ₂) = |⟨∇H₁, ∇H₂⟩| / (‖∇H₁‖·‖∇H₂‖)
   *
   * 在离散三元空间中，梯度近似为：
   *   ∇H ≈ (s - 目标原型方向) 在球面上的投影
   * 用辛角差代替梯度内积：
   *   κ = |cos(θ₁ - θ₂)| 其中 θ 是辛角
   *
   * 这等价于：两个认知模式在 S⁸ 上的方向一致性。
   */
  computeCoupling(modeA: CognitiveMode, modeB: CognitiveMode): ResonanceCoupling {
    const a = modeA.state;
    const b = modeB.state;

    // 计算 S⁸ 上的方向一致性
    const liftedA = TritVectorOps.shengLift(a);
    const liftedB = TritVectorOps.shengLift(b);

    let gradientAlignment = 0;
    if (!liftedA.isVoid && !liftedB.isVoid) {
      // 在 S⁸ 上的点积 = 方向余弦
      let dot = 0;
      for (let i = 0; i < 9; i++) {
        dot += liftedA.position[i] * liftedB.position[i];
      }
      gradientAlignment = Math.abs(dot); // |cos(θ_AB)| ∈ [0, 1]
    }

    // 认知距离（归一化到 0~1）
    const cognitiveDist = CognitiveDistance.composite(a, b);

    // 共振耦合度：方向一致性 × (1 - 距离)
    // 方向越一致、距离越近 → 共振越强
    const kappa = gradientAlignment * (1 - cognitiveDist * 0.5);

    const resonanceAngle = Math.acos(Math.max(-1, Math.min(1, gradientAlignment)));

    return {
      kappa: Number(kappa.toFixed(4)),
      isResonant: kappa > this.resonanceThreshold,
      gradientAlignment: Number(gradientAlignment.toFixed(4)),
      cognitiveDistance: Number(cognitiveDist.toFixed(4)),
      resonanceAngle: Number(resonanceAngle.toFixed(4))
    };
  }

  /**
   * 计算指定 ID 的共振耦合
   */
  computeCouplingById(idA: string, idB: string): ResonanceCoupling | null {
    const modeA = this.modes.get(idA);
    const modeB = this.modes.get(idB);
    if (!modeA || !modeB) return null;
    return this.computeCoupling(modeA, modeB);
  }

  /**
   * 计算所有配对共振耦合矩阵
   * 返回对称矩阵（上三角）
   */
  computeCouplingMatrix(): { idA: string; idB: string; coupling: ResonanceCoupling }[] {
    const modeList = Array.from(this.modes.entries());
    const results: { idA: string; idB: string; coupling: ResonanceCoupling }[] = [];

    for (let i = 0; i < modeList.length; i++) {
      for (let j = i + 1; j < modeList.length; j++) {
        const [idA, modeA] = modeList[i];
        const [idB, modeB] = modeList[j];
        results.push({
          idA, idB,
          coupling: this.computeCoupling(modeA, modeB)
        });
      }
    }

    // 按共振度降序排列
    results.sort((a, b) => b.coupling.kappa - a.coupling.kappa);
    return results;
  }

  /**
   * 计算集体状态收敛
   * ─────────────────────────────────────────────────────────────
   * 加权认知中位数（Fermat-Weber 点）：
   *   g* = argmin Σ w_i · d(g, g_i)
   *   权重 w_i = exp(-β·ε_c) 其中 ε_c 是认知熵
   *
   * 论文 Definition 7.1：置信度高的 agent 主导，不确定的 agent 被衰减
   */
  computeCollectiveState(): CollectiveState {
    const modeList = Array.from(this.modes.values());
    if (modeList.length === 0) {
      return {
        consensusState: TritVectorOps.zero(),
        consensusConfidence: 0,
        participantCount: 0,
        meanResonance: 0,
        fieldEntropy: 0,
        phaseTransition: false
      };
    }

    // 计算加权共识
    const consensusState = this.weightedCognitiveMedian(modeList);

    // 计算共识置信度：加权平均到共识的距离
    let totalWeight = 0;
    let weightedDist = 0;
    for (const mode of modeList) {
      const w = mode.weight * Math.exp(-2 * mode.entropy);
      const dist = CognitiveDistance.composite(mode.state, consensusState);
      weightedDist += w * (1 - dist);
      totalWeight += w;
    }
    const consensusConfidence = totalWeight > 0 ? weightedDist / totalWeight : 0;

    // 计算平均共振度
    const pairResults = this.computeCouplingMatrix();
    const meanResonance = pairResults.length > 0
      ? pairResults.reduce((s, r) => s + r.coupling.kappa, 0) / pairResults.length
      : 0;

    // 计算认知场熵
    const fieldEntropy = this.computeFieldEntropy(modeList);

    // 检测相变
    const phaseTransition = meanResonance > this.phaseTransitionThreshold
      && fieldEntropy < 0.5;

    // 记录历史
    this.couplingHistory.push({
      t: this.couplingHistory.length,
      meanKappa: meanResonance
    });
    if (this.couplingHistory.length > this.MAX_HISTORY) {
      this.couplingHistory.shift();
    }

    return {
      consensusState,
      consensusConfidence: Number(consensusConfidence.toFixed(4)),
      participantCount: modeList.length,
      meanResonance: Number(meanResonance.toFixed(4)),
      fieldEntropy: Number(fieldEntropy.toFixed(4)),
      phaseTransition
    };
  }

  /**
   * 加权认知中位数（Fermat-Weber 点）
   * 在离散三元空间中，逐维取加权中位数
   */
  private weightedCognitiveMedian(modes: CognitiveMode[]): TritVector {
    const result: Partial<TritVector> = {};

    for (const dim of ALL_DIMENSIONS) {
      // 收集该维度的所有 trit 值及其权重
      const values = modes.map(m => ({
        value: m.state[dim],
        weight: m.weight * Math.exp(-2 * m.entropy)
      }));

      // 加权中位数：按值排序，累加权重，找到中位数位置
      values.sort((a, b) => a.value - b.value);
      const totalWeight = values.reduce((s, v) => s + v.weight, 0);
      let cumulative = 0;
      let medianValue: -1 | 0 | 1 = 0;

      for (const v of values) {
        cumulative += v.weight;
        if (cumulative >= totalWeight / 2) {
          medianValue = v.value;
          break;
        }
      }

      result[dim] = medianValue;
    }

    return result as TritVector;
  }

  /**
   * 计算认知场熵
   * 基于所有模式在各维度的分布计算香农熵
   */
  private computeFieldEntropy(modes: CognitiveMode[]): number {
    if (modes.length === 0) return 0;

    let totalEntropy = 0;

    for (const dim of ALL_DIMENSIONS) {
      const counts: Record<string, number> = { '-1': 0, '0': 0, '1': 0 };
      for (const mode of modes) {
        counts[String(mode.state[dim])]++;
      }

      let dimEntropy = 0;
      for (const key of ['-1', '0', '1']) {
        const p = counts[key] / modes.length;
        if (p > 0) dimEntropy -= p * Math.log2(p);
      }

      totalEntropy += dimEntropy;
    }

    // 归一化到 0~1（最大熵 = 9 * log₂(3) ≈ 14.27）
    return totalEntropy / (9 * Math.log2(3));
  }

  /**
   * 通过辛平行传输共享认知内容
   * ─────────────────────────────────────────────────────────────
   * 当两个认知模式处于共振状态时，可以通过辛平行传输交换认知内容。
   * 在离散语义中，这等价于在共振方向上做归元加法传输。
   */
  shareContent(sourceId: string, targetId: string, content: Partial<TritVector>): ResonancePacket | null {
    const source = this.modes.get(sourceId);
    const target = this.modes.get(targetId);
    if (!source || !target) return null;

    const coupling = this.computeCoupling(source, target);
    if (!coupling.isResonant) return null;

    // 共振度越高，传输置信度越高
    const confidence = coupling.kappa;
    const packet: ResonancePacket = {
      sourceId,
      targetId,
      content: { ...content },
      confidence: Number(confidence.toFixed(4)),
      coupling
    };

    return packet;
  }

  /**
   * 应用共振传输：将内容原子地融合到目标模式
   */
  applyResonancePacket(packet: ResonancePacket): boolean {
    const target = this.modes.get(packet.targetId);
    if (!target) return false;

    // 基于共振度加权融合内容
    const newState = { ...target.state };
    for (const [dim, value] of Object.entries(packet.content)) {
      const d = dim as keyof TritVector;
      const oldVal = target.state[d];
      const newVal = value as -1 | 0 | 1;

      // 共振度低时，内容衰减
      const effectiveValue = packet.confidence > 0.7 ? newVal
        : packet.confidence > 0.5 ? (Math.random() > 0.3 ? newVal : oldVal)
        : (Math.random() > 0.5 ? newVal : oldVal);

      newState[d] = effectiveValue;
    }

    target.state = newState;
    target.history.push({ ...newState });
    if (target.history.length > 100) target.history.shift();

    return true;
  }

  /**
   * 检测认知相变
   * ─────────────────────────────────────────────────────────────
   * 在临界共振密度，认知场发生相变到新集体认知状态。
   * 相变条件：平均共振度 > 阈值 且 场熵 < 阈值
   *
   * @returns 是否发生相变，以及相变后的新集体状态
   */
  detectPhaseTransition(): { hasTransitioned: boolean; collectiveState: CollectiveState } {
    const collective = this.computeCollectiveState();
    return {
      hasTransitioned: collective.phaseTransition,
      collectiveState: collective
    };
  }

  /**
   * 获取共振历史
   */
  getCouplingHistory(): { t: number; meanKappa: number }[] {
    return [...this.couplingHistory];
  }

  /**
   * 获取共振统计
   */
  getStats(): {
    totalModes: number;
    meanResonance: number;
    maxResonance: number;
    resonanceCount: number;
    fieldEntropy: number;
  } {
    const modes = this.getModes();
    const matrix = this.computeCouplingMatrix();
    const collective = this.computeCollectiveState();

    const kappas = matrix.map(r => r.coupling.kappa);
    const meanResonance = kappas.length > 0
      ? kappas.reduce((a, b) => a + b, 0) / kappas.length
      : 0;
    const maxResonance = kappas.length > 0 ? Math.max(...kappas) : 0;
    const resonanceCount = matrix.filter(r => r.coupling.isResonant).length;

    return {
      totalModes: modes.length,
      meanResonance: Number(meanResonance.toFixed(4)),
      maxResonance: Number(maxResonance.toFixed(4)),
      resonanceCount,
      fieldEntropy: Number(collective.fieldEntropy.toFixed(4))
    };
  }

  /**
   * 重置共振引擎
   */
  reset(): void {
    this.modes.clear();
    this.couplingHistory = [];
  }
}

/**
 * 默认全局认知共振引擎实例
 */
export const defaultCognitiveResonance = new CognitiveResonance();