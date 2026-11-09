/**
 * 认知波函数 (Cognitive Wavefunction)
 * ─────────────────────────────────────────────────────────────
 * P2 升级：认知状态从"卦象点"升级为 19683 态空间上的概率分布。
 *
 * 现状瓶颈：
 *   - 当前认知态是单一卦象点，无法表达"我不确定自己处于哪种态势"
 *   - 主动推理输出最优行动而非后验信念，信念没有形式化载体
 *   - MID 门的"和态涌现"已暗示混合态，但只在确定性向量上定义
 *
 * 本模块提供分布化认知态 |ψ⟩ = Σ_s p(s)·|s⟩，s ∈ 0..19682：
 *   1. fromState / uniform / fromDimBeliefs / fromTrajectory：多种构造
 *   2. midMix：MID 门的分布推广——逐维 MID 卷积（平均场近似）
 *      mid(-1,+1)=0 的核：P(d'=0) = 1 - P_a(1)P_b(1) - P_a(-1)P_b(-1)
 *      两个对立即态混合后，质量自然涌向和态——和态涌现的分布形式化
 *   3. bayesUpdateDim / bayesUpdate：证据加权 + 归一化（统一主动推理）
 *   4. collapse：观测坍缩（采样）/ mode（最大后验）
 *   5. entropy / effectiveSupport / jsDistance：不确定性度量与分布距离
 *
 * 实现：密集 Float64Array(19683) ≈ 154KB，所有操作 O(N) 向量化。
 * 维度编码：dim i 对应卦象索引的三进制第 i 位（高位在前），trit = 位值 - 1。
 */

import { TritVector, TritVectorOps, TritDimension, ALL_DIMENSIONS } from './trit-vector';

/** 态空间大小 3⁹ */
export const STATE_COUNT = 19683;

/** 3 的幂表：dim i 的位权（高位在前） */
const POW3: number[] = ALL_DIMENSIONS.map((_, i) => Math.pow(3, 8 - i));

/** 每维的 trit 取值表（模块级惰性预计算，177KB Int8） */
let TRITS_TABLE: Int8Array | null = null;
function tritsTable(): Int8Array {
  if (!TRITS_TABLE) {
    TRITS_TABLE = new Int8Array(STATE_COUNT * 9);
    for (let s = 0; s < STATE_COUNT; s++) {
      for (let d = 0; d < 9; d++) {
        TRITS_TABLE[s * 9 + d] = Math.floor(s / POW3[d]) % 3 - 1;
      }
    }
  }
  return TRITS_TABLE;
}

/** 每维信念分布：[P(-1), P(0), P(+1)] */
export type DimBelief = [number, number, number];

export interface CollapseResult {
  vector: TritVector;
  hexagramIndex: number;
  probability: number;
}

export class CognitiveWavefunction {
  private probs: Float64Array;

  private constructor(probs: Float64Array) {
    this.probs = probs;
  }

  /** 从概率数组构造（自动归一化；零和 → 均匀分布） */
  static fromArray(probs: ArrayLike<number>): CognitiveWavefunction {
    if (probs.length !== STATE_COUNT) throw new Error(`需要 ${STATE_COUNT} 个概率值`);
    const arr = Float64Array.from(probs as ArrayLike<number>);
    let sum = 0;
    for (let i = 0; i < STATE_COUNT; i++) sum += arr[i];
    if (sum <= 0) return CognitiveWavefunction.uniform();
    for (let i = 0; i < STATE_COUNT; i++) arr[i] /= sum;
    return new CognitiveWavefunction(arr);
  }

  /** 点态（delta 分布）：完全确定处于某一卦象 */
  static fromState(state: TritVector | number): CognitiveWavefunction {
    const idx = typeof state === 'number' ? state : TritVectorOps.toHexagramIndex(state);
    const arr = new Float64Array(STATE_COUNT);
    arr[idx] = 1;
    return new CognitiveWavefunction(arr);
  }

  /** 均匀分布：完全不确定（最大熵态） */
  static uniform(): CognitiveWavefunction {
    const arr = new Float64Array(STATE_COUNT).fill(1 / STATE_COUNT);
    return new CognitiveWavefunction(arr);
  }

  /**
   * 从逐维信念构造乘积分布（维度独立假设）。
   * 未指定的维度取均匀信念 [1/3, 1/3, 1/3]。
   */
  static fromDimBeliefs(beliefs: Partial<Record<TritDimension, DimBelief>>): CognitiveWavefunction {
    const b: DimBelief[] = ALL_DIMENSIONS.map(d => beliefs[d] ?? [1 / 3, 1 / 3, 1 / 3]);
    const table = tritsTable();
    const arr = new Float64Array(STATE_COUNT);
    for (let s = 0; s < STATE_COUNT; s++) {
      let p = 1;
      for (let d = 0; d < 9; d++) {
        p *= b[d][table[s * 9 + d] + 1];
      }
      arr[s] = p;
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /** 从稀疏概率图构造（桥接 RealizationGap 的实现先验） */
  static fromProbabilityMap(map: Map<number, number>): CognitiveWavefunction {
    const arr = new Float64Array(STATE_COUNT);
    for (const [idx, p] of map) {
      if (idx >= 0 && idx < STATE_COUNT) arr[idx] = p;
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /**
   * 从轨迹构造经验分布（可选新近度衰减）。
   * @param decay 每步衰减因子（1=等权，0.9=越近权重越高）
   */
  static fromTrajectory(vectors: TritVector[], decay: number = 1): CognitiveWavefunction {
    const arr = new Float64Array(STATE_COUNT);
    const n = vectors.length;
    for (let i = 0; i < n; i++) {
      const idx = TritVectorOps.toHexagramIndex(vectors[i]);
      arr[idx] += Math.pow(decay, n - 1 - i);
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /** 某卦象的概率 */
  getProbability(state: TritVector | number): number {
    const idx = typeof state === 'number' ? state : TritVectorOps.toHexagramIndex(state);
    return this.probs[idx];
  }

  /** Shannon 熵（bits） */
  entropy(): number {
    let h = 0;
    for (let i = 0; i < STATE_COUNT; i++) {
      const p = this.probs[i];
      if (p > 0) h -= p * Math.log2(p);
    }
    return h;
  }

  /** 归一化熵 0~1（1=完全不确定） */
  normalizedEntropy(): number {
    return this.entropy() / Math.log2(STATE_COUNT);
  }

  /** 有效支持态数（perplexity，2^H）：分布"实际占据"多少状态 */
  effectiveSupport(): number {
    return Math.pow(2, this.entropy());
  }

  /** 集中度：最大单态概率 */
  concentration(): number {
    let max = 0;
    for (let i = 0; i < STATE_COUNT; i++) if (this.probs[i] > max) max = this.probs[i];
    return max;
  }

  /** 逐维边际分布 */
  dimMarginals(): Record<TritDimension, DimBelief> {
    const table = tritsTable();
    const marginals = {} as Record<TritDimension, DimBelief>;
    for (let d = 0; d < 9; d++) {
      const m: DimBelief = [0, 0, 0];
      for (let s = 0; s < STATE_COUNT; s++) {
        const p = this.probs[s];
        if (p > 0) m[table[s * 9 + d] + 1] += p;
      }
      marginals[ALL_DIMENSIONS[d]] = m;
    }
    return marginals;
  }

  /** 逐维期望值（连续向量 ∈ [-1,1]⁹）：分布的"质心" */
  expectation(): Record<TritDimension, number> {
    const marginals = this.dimMarginals();
    const exp = {} as Record<TritDimension, number>;
    for (const d of ALL_DIMENSIONS) {
      exp[d] = marginals[d][2] - marginals[d][0]; // E = P(+1) - P(-1)
    }
    return exp;
  }

  /** 最大后验态（MAP） */
  mode(): CollapseResult {
    let best = 0;
    for (let i = 1; i < STATE_COUNT; i++) {
      if (this.probs[i] > this.probs[best]) best = i;
    }
    return {
      vector: TritVectorOps.fromHexagramIndex(best),
      hexagramIndex: best,
      probability: this.probs[best]
    };
  }

  /** 观测坍缩：按分布采样一个卦象 */
  collapse(rng: () => number = Math.random): CollapseResult {
    const r = rng();
    let cum = 0;
    for (let i = 0; i < STATE_COUNT; i++) {
      cum += this.probs[i];
      if (r < cum) {
        return {
          vector: TritVectorOps.fromHexagramIndex(i),
          hexagramIndex: i,
          probability: this.probs[i]
        };
      }
    }
    const last = STATE_COUNT - 1;
    return {
      vector: TritVectorOps.fromHexagramIndex(last),
      hexagramIndex: last,
      probability: this.probs[last]
    };
  }

  /** top-K 最可能状态（降序） */
  topK(k: number): CollapseResult[] {
    const indexed: [number, number][] = [];
    for (let i = 0; i < STATE_COUNT; i++) {
      if (this.probs[i] > 0) indexed.push([i, this.probs[i]]);
    }
    indexed.sort((a, b) => b[1] - a[1]);
    return indexed.slice(0, k).map(([idx, p]) => ({
      vector: TritVectorOps.fromHexagramIndex(idx),
      hexagramIndex: idx,
      probability: p
    }));
  }

  /**
   * MID 门的分布推广（平均场近似）
   *
   * 逐维 MID 卷积核：
   *   P(d'=+1) = P_a(+1)·P_b(+1)        （同阳保持）
   *   P(d'=-1) = P_a(-1)·P_b(-1)        （同阴保持）
   *   P(d'= 0) = 1 - 上两项              （对立/含和 → 和态涌现）
   *
   * 两个对立即态（+1 ⊗ -1）混合后质量全部涌向 0——
   * 这是 tritMid 和态涌现在分布层面的形式化。
   */
  midMix(other: CognitiveWavefunction): CognitiveWavefunction {
    const ma = this.dimMarginals();
    const mb = other.dimMarginals();
    const beliefs = {} as Record<TritDimension, DimBelief>;
    for (const d of ALL_DIMENSIONS) {
      const pPos = ma[d][2] * mb[d][2];
      const pNeg = ma[d][0] * mb[d][0];
      beliefs[d] = [pNeg, 1 - pPos - pNeg, pPos];
    }
    return CognitiveWavefunction.fromDimBeliefs(beliefs);
  }

  /** 凸混合：α·this + (1-α)·other（软状态叠加） */
  mix(other: CognitiveWavefunction, alpha: number = 0.5): CognitiveWavefunction {
    const arr = new Float64Array(STATE_COUNT);
    for (let i = 0; i < STATE_COUNT; i++) {
      arr[i] = alpha * this.probs[i] + (1 - alpha) * other.probs[i];
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /**
   * 逐维贝叶斯更新：用维度证据 [L(-1), L(0), L(+1)] 加权。
   * 统一主动推理的信念更新：posterior ∝ likelihood × prior。
   */
  bayesUpdateDim(dim: TritDimension, likelihood: DimBelief): CognitiveWavefunction {
    const d = ALL_DIMENSIONS.indexOf(dim);
    const table = tritsTable();
    const arr = new Float64Array(STATE_COUNT);
    for (let s = 0; s < STATE_COUNT; s++) {
      arr[s] = this.probs[s] * likelihood[table[s * 9 + d] + 1];
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /** 全联合贝叶斯更新：任意似然函数（逐态求值） */
  bayesUpdate(likelihood: (v: TritVector, hexagramIndex: number) => number): CognitiveWavefunction {
    const arr = new Float64Array(STATE_COUNT);
    for (let s = 0; s < STATE_COUNT; s++) {
      if (this.probs[s] > 0) {
        arr[s] = this.probs[s] * likelihood(TritVectorOps.fromHexagramIndex(s), s);
      }
    }
    return CognitiveWavefunction.fromArray(arr);
  }

  /** Jensen-Shannon 散度（bits）：对称分布距离，0=相同 */
  jsDistance(other: CognitiveWavefunction): number {
    let js = 0;
    for (let i = 0; i < STATE_COUNT; i++) {
      const p = this.probs[i];
      const q = other.probs[i];
      const m = (p + q) / 2;
      if (p > 0 && m > 0) js += 0.5 * p * Math.log2(p / m);
      if (q > 0 && m > 0) js += 0.5 * q * Math.log2(q / m);
    }
    return js;
  }

  /** 稀疏化导出（桥接/序列化） */
  toSparse(threshold: number = 1e-12): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 0; i < STATE_COUNT; i++) {
      if (this.probs[i] > threshold) map.set(i, this.probs[i]);
    }
    return map;
  }
}
