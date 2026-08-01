/**
 * 认知距离函数系统 (Cognitive Distance System)
 * ─────────────────────────────────────────────────────────────
 *
 * 九维三元认知空间中的距离度量集合。
 * 每种距离度量捕捉认知向量之间不同维度的"差异语义"：
 *
 *   Hamming   — 有几个维度不同（最朴素的分类距离）
 *   Manhattan — 每维差的绝对值之和（阴→和→阳的差异幅度）
 *   Euclidean — 欧几里得距离（阴阳对立比阴到和更远）
 *   Cosine    — 方向是否一致（忽略幅度，只看趋势）
 *   Weighted  — 按 π/e/γ 三组权重加权的曼哈顿距离
 *   Composite — 多距离加权融合（默认用于原型匹配）
 *
 * 数学常数权重：
 *   π (3.14159)  → 空间维度权重（空间展开的广度）
 *   e (2.71828)  → 时间维度权重（时间演化的连续性）
 *   γ (0.57722)  → 因果维度权重（欧拉常数，因果链的稀疏性）
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, TritDimension } from './trit-vector';

/** 加权距离选项 */
export interface WeightedDistanceOptions {
  /** 时间维度组权重（过去·现在·未来），默认 e ≈ 2.718 */
  timeWeight?: number;
  /** 空间维度组权重（内·中·外），默认 π ≈ 3.14159 */
  spaceWeight?: number;
  /** 因果维度组权重（因·缘·果），默认 γ ≈ 0.5772 */
  causeWeight?: number;
}

/** 复合距离选项 */
export interface CompositeDistanceOptions {
  /** 各距离分量的权重（默认等权），归一化后使用 */
  hamming?: number;
  manhattan?: number;
  euclidean?: number;
  cosine?: number; // 余弦分量使用 1 - similarity
}

/** 维度分组 */
const TIME_DIMS: TritDimension[] = ['past', 'present', 'future'];
const SPACE_DIMS: TritDimension[] = ['internal', 'medial', 'external'];
const CAUSE_DIMS: TritDimension[] = ['cause', 'condition', 'effect'];

/** 各距离度量的理论最大值（用于归一化到 0~1） */
export const MAX_HAMMING = 9;        // 9 个维度全不同
export const MAX_MANHATTAN = 18;     // 9 维 × |1-(-1)|=2
export const MAX_EUCLIDEAN = Math.sqrt(36); // √(9×4) = 6

export class CognitiveDistance {
  // ═══════════════════════════════════════════════════════════
  // 基础距离度量
  // ═══════════════════════════════════════════════════════════

  /** 汉明距离：有几个维度不同，范围 0~9 */
  static hamming(a: TritVector, b: TritVector): number {
    return TritVectorOps.hammingDistance(a, b);
  }

  /** 曼哈顿距离（L1）：每维 |a-b| 之和，范围 0~18 */
  static manhattan(a: TritVector, b: TritVector): number {
    return TritVectorOps.manhattanDistance(a, b);
  }

  /** 欧几里得距离（L2）：范围 0~6 */
  static euclidean(a: TritVector, b: TritVector): number {
    return TritVectorOps.euclideanDistance(a, b);
  }

  /** 余弦相似度：方向一致性，范围 -1~1（1=完全同向） */
  static cosineSimilarity(a: TritVector, b: TritVector): number {
    return TritVectorOps.cosineSimilarity(a, b);
  }

  /** 余弦距离：1 - 余弦相似度，范围 0~2（0=完全同向） */
  static cosineDistance(a: TritVector, b: TritVector): number {
    // 相同向量距离为0（包括全和向量，其余弦相似度未定义）
    if (TritVectorOps.equals(a, b)) return 0;
    return 1 - CognitiveDistance.cosineSimilarity(a, b);
  }

  // ═══════════════════════════════════════════════════════════
  // 加权距离
  // ═══════════════════════════════════════════════════════════

  /**
   * 加权曼哈顿距离：按 π/e/γ 三组权重加权
   *
   * 空间维度用 π（广度），时间维度用 e（连续性），因果维度用 γ（稀疏性）。
   * 这反映了认知空间中不同维度组的重要性差异：
   *   - 空间（内外环境）的失调对认知影响最大
   *   - 时间（过去未来）的断裂影响中等
   *   - 因果（因缘果）的偏差影响相对较小但不可忽略
   *
   * @returns 加权距离（非归一化，原始值）
   */
  static weighted(
    a: TritVector,
    b: TritVector,
    opts: WeightedDistanceOptions = {}
  ): number {
    const wTime = opts.timeWeight ?? Math.E;     // e ≈ 2.71828
    const wSpace = opts.spaceWeight ?? Math.PI;  // π ≈ 3.14159
    const wCause = opts.causeWeight ?? 0.5772;   // γ (Euler-Mascheroni) ≈ 0.57722

    let dist = 0;

    // 时间维度组
    for (const d of TIME_DIMS) {
      dist += wTime * Math.abs(a[d] - b[d]);
    }

    // 空间维度组
    for (const d of SPACE_DIMS) {
      dist += wSpace * Math.abs(a[d] - b[d]);
    }

    // 因果维度组
    for (const d of CAUSE_DIMS) {
      dist += wCause * Math.abs(a[d] - b[d]);
    }

    return dist;
  }

  /**
   * 归一化加权距离：归一化到 0~1
   * 最大值 = 2×(3×wTime + 3×wSpace + 3×wCause) = 6×(wTime+wSpace+wCause)
   */
  static weightedNormalized(
    a: TritVector,
    b: TritVector,
    opts: WeightedDistanceOptions = {}
  ): number {
    const wTime = opts.timeWeight ?? Math.E;
    const wSpace = opts.spaceWeight ?? Math.PI;
    const wCause = opts.causeWeight ?? 0.5772;
    const maxDist = 2 * (3 * wTime + 3 * wSpace + 3 * wCause);
    return CognitiveDistance.weighted(a, b, opts) / maxDist;
  }

  // ═══════════════════════════════════════════════════════════
  // 复合距离
  // ═══════════════════════════════════════════════════════════

  /**
   * 复合距离：多种距离度量加权融合，归一化到 0~1
   *
   * 默认权重分配：
   *   - Hamming:   0.2  （分类差异）
   *   - Manhattan: 0.3  （幅度差异，主信号）
   *   - Euclidean: 0.2  （对立差异）
   *   - Cosine:    0.3  （方向差异，与幅度互补）
   *
   * 这是原型匹配和记忆检索的默认距离度量。
   */
  static composite(
    a: TritVector,
    b: TritVector,
    opts: CompositeDistanceOptions = {}
  ): number {
    const wH = opts.hamming ?? 0.2;
    const wM = opts.manhattan ?? 0.3;
    const wE = opts.euclidean ?? 0.2;
    const wC = opts.cosine ?? 0.3;

    const totalW = wH + wM + wE + wC;
    if (totalW === 0) return 1;

    // 各分量归一化到 0~1
    const hammingNorm = CognitiveDistance.hamming(a, b) / MAX_HAMMING;
    const manhattanNorm = CognitiveDistance.manhattan(a, b) / MAX_MANHATTAN;
    const euclideanNorm = CognitiveDistance.euclidean(a, b) / MAX_EUCLIDEAN;
    const cosineNorm = CognitiveDistance.cosineDistance(a, b) / 2; // 0~2 → 0~1

    return (
      (wH * hammingNorm + wM * manhattanNorm + wE * euclideanNorm + wC * cosineNorm) /
      totalW
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 辅助：批量距离计算
  // ═══════════════════════════════════════════════════════════

  /**
   * 找到目标向量在一组候选中最近的 K 个
   * @param target  目标向量
   * @param candidates  候选向量数组
   * @param k  返回数量
   * @param metric  距离度量（默认 composite）
   */
  static nearestK(
    target: TritVector,
    candidates: TritVector[],
    k: number,
    metric: (a: TritVector, b: TritVector) => number = CognitiveDistance.composite
  ): { vector: TritVector; distance: number; index: number }[] {
    const scored = candidates.map((vec, index) => ({
      vector: vec,
      distance: metric(target, vec),
      index
    }));
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }

  /**
   * 距离度量摘要：一次计算所有距离度量，用于调试与可视化
   */
  static summary(a: TritVector, b: TritVector): Record<string, number> {
    return {
      hamming: CognitiveDistance.hamming(a, b),
      manhattan: CognitiveDistance.manhattan(a, b),
      euclidean: Number(CognitiveDistance.euclidean(a, b).toFixed(4)),
      cosineSimilarity: Number(CognitiveDistance.cosineSimilarity(a, b).toFixed(4)),
      cosineDistance: Number(CognitiveDistance.cosineDistance(a, b).toFixed(4)),
      weighted: Number(CognitiveDistance.weighted(a, b).toFixed(4)),
      weightedNormalized: Number(CognitiveDistance.weightedNormalized(a, b).toFixed(4)),
      composite: Number(CognitiveDistance.composite(a, b).toFixed(4))
    };
  }
}
