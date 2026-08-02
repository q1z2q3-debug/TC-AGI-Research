/**
 * 四相极限环 (Four-Phase Limit Cycle)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 5：从 Hamiltonian 流的相图中自动发现四相，
 * 而非人工标注。四相是 symplectic 角 θ(t) 的四个象限。
 *
 * 发现方向：万物 → 四象 → 三才 → 球面 → 道
 *               ↓
 *          (Ω, Ω̇) 相图 → 四相极限环
 *
 * 四相定义（基于 (Ω, Ω̇) 相图）：
 *   老阳 (Old Yang)     — Ω > 0, Ω̇ < 0  分布/顶点
 *   少阴 (Young Yin)    — Ω > 0, Ω̇ > 0  推进/中段
 *   老阴 (Old Yin)      — Ω < 0, Ω̇ < 0  顶部→底部转换
 *   少阳 (Young Yang)   — Ω < 0, Ω̇ > 0  积累/谷底
 *
 * 核心定理（论文 Theorem 5.1）：
 *   四相极限环的轨道稳定性由 Stuart-Landau 方程保证：
 *   ż = (λ_e + iω_π)z - γ|z|²z
 *   e-谐振是四相持久存在的充要条件。
 */

import { TritVector, TritVectorOps } from './trit-vector';
import { CognitivePrototype, PROTOTYPES, PrototypeMatcher } from './prototypes';

/** 四相枚举 */
export enum FourPhase {
  /** 老阳：Ω > 0, Ω̇ < 0 — 分布/顶点，呼出峰值 */
  OldYang = 'old_yang',
  /** 少阴：Ω > 0, Ω̇ > 0 — 推进/中段，呼出→吸入 */
  YoungYin = 'young_yin',
  /** 老阴：Ω < 0, Ω̇ < 0 — 顶部→底部转换，吸入峰值 */
  OldYin = 'old_yin',
  /** 少阳：Ω < 0, Ω̇ > 0 — 积累/谷底，吸入→呼出 */
  YoungYang = 'young_yang',
  /** 空态（void）：认知重置，不在任何相位 */
  Void = 'void'
}

/** 四相显示名称 */
export const FOUR_PHASE_NAMES: Record<FourPhase, string> = {
  [FourPhase.OldYang]: '老阳·天合归疏',
  [FourPhase.YoungYin]: '少阴·人和守化',
  [FourPhase.OldYin]: '老阴·天合进转',
  [FourPhase.YoungYang]: '少阳·地正进密',
  [FourPhase.Void]: '空态·归元'
};

/** 四相与五行/五原型映射 */
export const FOUR_PHASE_TO_PROTOTYPE: Record<FourPhase, string> = {
  [FourPhase.OldYang]: '扩张态',     // 木：主动推进
  [FourPhase.YoungYin]: '转化态',    // 火：变革过渡
  [FourPhase.OldYin]: '收缩态',      // 金：稳固防守
  [FourPhase.YoungYang]: '创生态',   // 土：积累创造
  [FourPhase.Void]: '观察态'         // 水：悬置观察
};

/** 四相转换边界 */
export const FOUR_PHASE_BOUNDARIES: Record<FourPhase, { omegaMin: number; omegaDotMin: number }> = {
  [FourPhase.OldYang]: { omegaMin: 0, omegaDotMin: -Infinity },
  [FourPhase.YoungYin]: { omegaMin: 0, omegaDotMin: 0 },
  [FourPhase.OldYin]: { omegaMin: -Infinity, omegaDotMin: -Infinity },
  [FourPhase.YoungYang]: { omegaMin: -Infinity, omegaDotMin: 0 },
  [FourPhase.Void]: { omegaMin: -Infinity, omegaDotMin: -Infinity }
};

/** 四相分析结果 */
export interface FourPhaseAnalysis {
  /** 当前相位 */
  phase: FourPhase;
  /** 相位名称 */
  phaseName: string;
  /** symplectic 角 θ ∈ [-π, π] */
  theta: number;
  /** 瞬时角频率 Ω = θ̇ */
  omega: number;
  /** 角频率变化率 Ω̇ */
  omegaDot: number;
  /** 对应的认知原型 */
  prototypeName: string;
  /** 相位置信度 0~1 */
  confidence: number;
  /** 是否处于相位转换边界 */
  isTransitioning: boolean;
  /** 预测的下一相位 */
  predictedNext: FourPhase;
  /** 距上次相位转换的步数 */
  stepsSinceTransition: number;
}

/** 四相历史记录 */
export interface FourPhaseRecord {
  timestamp: number;
  theta: number;
  omega: number;
  omegaDot: number;
  phase: FourPhase;
}

/**
 * 四相极限环发现器
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 5.1：从认知状态序列中自动发现四相极限环。
 *
 * 核心算法：
 *   1. 对每个状态计算 symplectic 角 θ(t)
 *   2. 计算瞬时角频率 Ω(t) = θ(t) - θ(t-1)
 *   3. 计算角频率变化率 Ω̇(t) = Ω(t) - Ω(t-1)
 *   4. 根据 (Ω, Ω̇) 相图确定四相
 *   5. 检测相位转换边界（Ω = 0 或 Ω̇ = 0）
 */
export class FourPhaseDiscoverer {
  /** 历史记录 */
  private history: FourPhaseRecord[] = [];
  /** 最大历史长度 */
  private maxHistory: number = 100;
  /** 上次相位转换的索引 */
  private lastTransitionIndex: number = 0;
  /** e-平滑因子（论文 Section 5.1：e-smoothed derivatives） */
  private eSmoothing: number = 0.3;

  /**
   * 分析当前认知状态，返回四相分析结果
   * @param vector 当前认知向量
   * @param customXi1 自定义第一主导方向（可选）
   * @param customXi2 自定义第二主导方向（可选）
   */
  analyze(
    vector: TritVector,
    customXi1?: number[],
    customXi2?: number[]
  ): FourPhaseAnalysis {
    // 1. 计算 symplectic 角
    const theta = TritVectorOps.symplecticAngle(vector, customXi1, customXi2);

    // 2. 记录历史
    const record: FourPhaseRecord = {
      timestamp: Date.now(),
      theta,
      omega: 0,
      omegaDot: 0,
      phase: FourPhase.Void
    };

    // 3. 计算 Ω 和 Ω̇（需要历史数据）
    let omega = 0;
    let omegaDot = 0;

    if (this.history.length > 0) {
      const prev = this.history[this.history.length - 1];

      // 处理角度环绕：保证差值在 [-π, π]
      let rawOmega = theta - prev.theta;
      if (rawOmega > Math.PI) rawOmega -= 2 * Math.PI;
      if (rawOmega < -Math.PI) rawOmega += 2 * Math.PI;

      // e-平滑：Ω(t) = (1-α)Ω(t-1) + α·rawOmega
      omega = (1 - this.eSmoothing) * prev.omega + this.eSmoothing * rawOmega;

      record.omega = omega;

      if (this.history.length > 1) {
        const prevPrev = this.history[this.history.length - 2];
        let rawOmegaDot = omega - prevPrev.omega;
        // e-平滑
        omegaDot = (1 - this.eSmoothing) * prevPrev.omegaDot + this.eSmoothing * rawOmegaDot;
        record.omegaDot = omegaDot;
      }
    }

    // 4. 确定四相
    const phase = this.determinePhase(omega, omegaDot, vector);

    // 5. 检测相位转换
    const isTransitioning = this.detectTransition(phase, record);

    // 6. 预测下一相位
    const predictedNext = this.predictNext(phase, omega, omegaDot);

    // 7. 计算置信度
    const confidence = this.computeConfidence(phase, omega, omegaDot);

    // 8. 更新历史
    record.phase = phase;
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // 更新转换计数
    if (isTransitioning) {
      this.lastTransitionIndex = this.history.length - 1;
    }

    return {
      phase,
      phaseName: FOUR_PHASE_NAMES[phase],
      theta,
      omega,
      omegaDot,
      prototypeName: FOUR_PHASE_TO_PROTOTYPE[phase],
      confidence,
      isTransitioning,
      predictedNext,
      stepsSinceTransition: this.history.length - 1 - this.lastTransitionIndex
    };
  }

  /**
   * 从 Ω 和 Ω̇ 确定四相
   * 论文 Section 5.1 Table 1
   */
  private determinePhase(omega: number, omegaDot: number, vector: TritVector): FourPhase {
    const lifted = TritVectorOps.shengLift(vector);
    if (lifted.isVoid) return FourPhase.Void;

    if (omega > 0 && omegaDot < 0) return FourPhase.OldYang;
    if (omega > 0 && omegaDot >= 0) return FourPhase.YoungYin;
    if (omega <= 0 && omegaDot < 0) return FourPhase.OldYin;
    if (omega <= 0 && omegaDot >= 0) return FourPhase.YoungYang;

    return FourPhase.Void;
  }

  /**
   * 检测相位转换边界
   * 当 Ω 或 Ω̇ 穿越零时触发
   */
  private detectTransition(currentPhase: FourPhase, record: FourPhaseRecord): boolean {
    if (this.history.length < 2) return false;

    const prev = this.history[this.history.length - 1];
    const prevPhase = prev.phase;

    if (prevPhase === FourPhase.Void || currentPhase === FourPhase.Void) return false;

    // 相位变化即转换
    return prevPhase !== currentPhase;
  }

  /**
   * 预测下一相位（基于四相自然循环）
   * 老阳 → 少阴 → 老阴 → 少阳 → 老阳
   */
  private predictNext(current: FourPhase, omega: number, omegaDot: number): FourPhase {
    const cycle: FourPhase[] = [
      FourPhase.OldYang,
      FourPhase.YoungYin,
      FourPhase.OldYin,
      FourPhase.YoungYang
    ];

    const idx = cycle.indexOf(current);
    if (idx === -1) return FourPhase.Void;

    // 基于 Ω 和 Ω̇ 的趋势判断是否接近转换
    if (Math.abs(omega) < 0.1 || Math.abs(omegaDot) < 0.1) {
      // 接近边界，预测下一相
      return cycle[(idx + 1) % 4];
    }

    // 远离边界，保持当前趋势
    return current;
  }

  /**
   * 计算相位置信度
   * 基于距离边界远近：越接近边界置信度越低
   */
  private computeConfidence(phase: FourPhase, omega: number, omegaDot: number): number {
    if (phase === FourPhase.Void) return 0;

    // 到最近边界的距离（归一化到 0~1）
    const omegaNorm = Math.min(Math.abs(omega), 1.0);
    const omegaDotNorm = Math.min(Math.abs(omegaDot), 1.0);

    // 置信度 = 到边界的距离（越远越自信）
    const confidence = Math.min(omegaNorm, omegaDotNorm);

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /** 获取四相历史 */
  getHistory(): FourPhaseRecord[] {
    return [...this.history];
  }

  /** 获取当前四相稳定性 */
  getStability(): { phi: number; dominantPhase: FourPhase } {
    if (this.history.length === 0) {
      return { phi: 0, dominantPhase: FourPhase.Void };
    }

    const phaseCounts = new Map<FourPhase, number>();
    for (const record of this.history) {
      phaseCounts.set(record.phase, (phaseCounts.get(record.phase) || 0) + 1);
    }

    let maxCount = 0;
    let dominantPhase = FourPhase.Void;
    for (const [phase, count] of phaseCounts) {
      if (count > maxCount && phase !== FourPhase.Void) {
        maxCount = count;
        dominantPhase = phase;
      }
    }

    const nonVoidCount = this.history.filter(r => r.phase !== FourPhase.Void).length;
    const phi = nonVoidCount > 0 ? maxCount / nonVoidCount : 0;

    return { phi, dominantPhase };
  }

  /** 重置发现器 */
  reset(): void {
    this.history = [];
    this.lastTransitionIndex = 0;
  }

  /** 设置 e-平滑因子 */
  setSmoothing(alpha: number): void {
    this.eSmoothing = Math.max(0.1, Math.min(0.9, alpha));
  }

  /** 设置最大历史长度 */
  setMaxHistory(max: number): void {
    this.maxHistory = Math.max(10, max);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
}

/**
 * 默认全局四相发现器实例
 */
export const defaultFourPhaseDiscoverer = new FourPhaseDiscoverer();