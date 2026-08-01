/**
 * 认知原型与极限环 (Cognitive Prototypes & Limit Cycles)
 * ─────────────────────────────────────────────────────────────
 *
 * 在 19683 种认知状态中，绝大多数是过渡态。
 * 真正稳定的"吸引子"只有少数几个——认知原型。
 *
 * 五大认知原型（对应五行 / 五种基本认知态势）：
 *
 *   1. 扩张态（木·生长）  — 全阳：因缘具足，内外协同，主动推进
 *   2. 收缩态（金·收敛）  — 全阴：因缘不足，内外受阻，稳固防守
 *   3. 观察态（水·静观）  — 全和：悬置判断，信息收集，认知准备
 *   4. 转化态（火·变革）  — 阴阳对冲：内外矛盾，因果断裂，需要变革
 *   5. 创生态（土·中和）  — 混合正向：条件成熟但方向待定，创造可能
 *
 * Φ 序参量（Order Parameter）：
 *   衡量认知系统在历史轨迹中有多少比例处于稳定原型附近。
 *   Φ 高 → 认知稳定，行为可预测
 *   Φ 低 → 认知混沌，行为不可预测
 *
 * 借鉴自灵枢·HexQ 的"四象流转守恒"思想：
 *   认知偏离原型后必回归，偏离幅度 ≈ 回归幅度。
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS } from './trit-vector';
import { CognitiveDistance } from './distance';

/** 认知原型定义 */
export interface CognitivePrototype {
  /** 原型名称 */
  name: string;
  /** 原型描述 */
  description: string;
  /** 对应的稳定向量 */
  vector: TritVector;
  /** 行动提示 */
  actionHint: 'expand' | 'contract' | 'observe' | 'transform' | 'create';
  /** 五行属性 */
  element: '木' | '火' | '土' | '金' | '水';
  /** 卦象索引 */
  hexagramIndex: number;
}

/** 原型匹配结果 */
export interface PrototypeMatch {
  prototype: CognitivePrototype;
  /** 与原型的复合距离（0=完全匹配） */
  distance: number;
  /** 匹配度 0~1（1=完全匹配） */
  similarity: number;
}

/** 极限环分析结果 */
export interface LimitCycleAnalysis {
  /** Φ 序参量：历史中处于稳定原型附近的比例 */
  phi: number;
  /** 当前状态距最近原型的距离 */
  currentDeviation: number;
  /** 历史最大偏离 */
  maxDeviation: number;
  /** 历史平均偏离 */
  avgDeviation: number;
  /** 预测回归幅度（守恒律：偏离 ≈ 回归） */
  predictedReturn: number;
  /** 主导原型名称 */
  dominantPrototype: string;
  /** 是否处于稳定极限环 */
  isStable: boolean;
}

/**
 * 五大认知原型定义
 *
 * 这些原型是认知空间中的"吸引子"——系统倾向于在这些状态附近震荡。
 * 每个原型对应一种基本认知态势和行动策略。
 */
export const PROTOTYPES: CognitivePrototype[] = [
  {
    name: '扩张态',
    description: '内外协同，因缘具足，可主动推进',
    vector: TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]),
    actionHint: 'expand',
    element: '木',
    hexagramIndex: TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]))
  },
  {
    name: '收缩态',
    description: '内外受阻，因缘不足，应稳固防守',
    vector: TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]),
    actionHint: 'contract',
    element: '金',
    hexagramIndex: TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]))
  },
  {
    name: '观察态',
    description: '悬置判断，信息收集，认知准备',
    vector: TritVectorOps.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0]),
    actionHint: 'observe',
    element: '水',
    hexagramIndex: 0 // 全零 → 卦象索引 0
  },
  {
    name: '转化态',
    description: '阴阳对冲，内外矛盾，需要变革',
    vector: TritVectorOps.fromArray([-1, 0, 1, 1, -1, -1, -1, 0, 1]),
    actionHint: 'transform',
    element: '火',
    hexagramIndex: TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([-1, 0, 1, 1, -1, -1, -1, 0, 1]))
  },
  {
    name: '创生态',
    description: '条件成熟但方向待定，创造可能',
    vector: TritVectorOps.fromArray([0, 1, 1, 0, 1, 1, 1, 1, 0]),
    actionHint: 'create',
    element: '土',
    hexagramIndex: TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([0, 1, 1, 0, 1, 1, 1, 1, 0]))
  }
];

/** 默认稳定阈值：复合距离 ≤ 此值视为"处于原型附近" */
const DEFAULT_STABILITY_THRESHOLD = 0.15;

export class PrototypeMatcher {
  /**
   * 找到与给定向量最近的认知原型
   * @param vector  目标向量
   * @returns  匹配结果（原型 + 距离 + 相似度）
   */
  static snapTo(vector: TritVector): PrototypeMatch {
    let minDist = Infinity;
    let best = PROTOTYPES[0];

    for (const proto of PROTOTYPES) {
      const dist = CognitiveDistance.composite(vector, proto.vector);
      if (dist < minDist) {
        minDist = dist;
        best = proto;
      }
    }

    return {
      prototype: best,
      distance: minDist,
      similarity: 1 - minDist
    };
  }

  /**
   * 计算所有原型与给定向量的匹配度，按相似度排序
   */
  static rankAll(vector: TritVector): PrototypeMatch[] {
    return PROTOTYPES
      .map(proto => ({
        prototype: proto,
        distance: CognitiveDistance.composite(vector, proto.vector),
        similarity: 1 - CognitiveDistance.composite(vector, proto.vector)
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Φ 序参量：历史状态中有多少比例处于稳定原型附近
   *
   * Φ ∈ [0, 1]
   *   Φ → 1：认知高度稳定，持续在原型附近震荡
   *   Φ → 0：认知高度混沌，远离所有原型
   *
   * @param history  认知状态历史（向量数组）
   * @param threshold  稳定阈值（复合距离 ≤ 此值视为稳定）
   */
  static computePhi(
    history: TritVector[],
    threshold: number = DEFAULT_STABILITY_THRESHOLD
  ): number {
    if (history.length === 0) return 0;

    let stableCount = 0;
    for (const v of history) {
      const match = PrototypeMatcher.snapTo(v);
      if (match.distance <= threshold) {
        stableCount++;
      }
    }

    return stableCount / history.length;
  }

  /**
   * 极限环分析：分析认知历史轨迹的稳定性
   *
   * 借鉴灵枢·HexQ 的"四象流转守恒"律：
   *   认知偏离原型后必回归，偏离幅度 ≈ 回归幅度。
   *
   * @param history  认知状态历史
   * @param current  当前认知状态
   * @param threshold  稳定阈值
   */
  static analyzeLimitCycle(
    history: TritVector[],
    current: TritVector,
    threshold: number = DEFAULT_STABILITY_THRESHOLD
  ): LimitCycleAnalysis {
    // Φ 序参量
    const phi = PrototypeMatcher.computePhi(history, threshold);

    // 当前偏离
    const currentMatch = PrototypeMatcher.snapTo(current);
    const currentDeviation = currentMatch.distance;

    // 历史偏离统计
    let maxDeviation = 0;
    let sumDeviation = 0;
    for (const v of history) {
      const match = PrototypeMatcher.snapTo(v);
      maxDeviation = Math.max(maxDeviation, match.distance);
      sumDeviation += match.distance;
    }
    const avgDeviation = history.length > 0 ? sumDeviation / history.length : 0;

    // 守恒律预测：偏离幅度 ≈ 回归幅度
    // 如果当前偏离大于历史平均，预测将回归（减小）
    // 如果当前偏离小于历史平均，预测可能继续偏离（增大）
    const predictedReturn = currentDeviation > avgDeviation
      ? -(currentDeviation - avgDeviation)  // 预测回归
      : (avgDeviation - currentDeviation) * 0.5;  // 预测小幅偏离

    // 是否稳定：Φ > 0.5 且当前偏离 < 阈值
    const isStable = phi > 0.5 && currentDeviation <= threshold;

    return {
      phi,
      currentDeviation,
      maxDeviation,
      avgDeviation,
      predictedReturn,
      dominantPrototype: currentMatch.prototype.name,
      isStable
    };
  }

  /**
   * 根据当前状态和原型匹配，推荐下一步行动
   *
   * @param vector  当前认知向量
   * @returns  行动提示与理由
   */
  static recommendAction(vector: TritVector): {
    action: CognitivePrototype['actionHint'];
    prototype: string;
    reason: string;
    confidence: number;
  } {
    const match = PrototypeMatcher.snapTo(vector);
    const confidence = match.similarity;

    let reason: string;
    switch (match.prototype.actionHint) {
      case 'expand':
        reason = `当前接近"${match.prototype.name}"，因缘具足，建议主动推进`;
        break;
      case 'contract':
        reason = `当前接近"${match.prototype.name}"，因缘不足，建议稳固防守`;
        break;
      case 'observe':
        reason = `当前接近"${match.prototype.name}"，信息不足，建议悬置观察`;
        break;
      case 'transform':
        reason = `当前接近"${match.prototype.name}"，矛盾积聚，建议主动变革`;
        break;
      case 'create':
        reason = `当前接近"${match.prototype.name}"，条件成熟，建议创造新路径`;
        break;
      default:
        reason = `当前接近"${match.prototype.name}"`;
    }

    return {
      action: match.prototype.actionHint,
      prototype: match.prototype.name,
      reason,
      confidence
    };
  }
}

/**
 * 认知极限环可视化数据（用于调试与监控）
 */
export function limitCycleSnapshot(
  history: TritVector[],
  current: TritVector
): {
  phi: number;
  prototypes: { name: string; distance: number; similarity: number }[];
  analysis: LimitCycleAnalysis;
  recommendation: ReturnType<typeof PrototypeMatcher.recommendAction>;
} {
  return {
    phi: PrototypeMatcher.computePhi(history),
    prototypes: PrototypeMatcher.rankAll(current).map(m => ({
      name: m.prototype.name,
      distance: Number(m.distance.toFixed(4)),
      similarity: Number(m.similarity.toFixed(4))
    })),
    analysis: PrototypeMatcher.analyzeLimitCycle(history, current),
    recommendation: PrototypeMatcher.recommendAction(current)
  };
}
