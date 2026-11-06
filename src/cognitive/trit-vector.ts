/**
 * Trit 九维认知向量
 * 时间（过去·现在·未来）· 空间（内·中·外）· 因果（因·缘·果）
 * 每个维度：-1 / 0 / +1
 */

export type Trit = -1 | 0 | 1;
export type TritDimension = 'past' | 'present' | 'future' | 'internal' | 'medial' | 'external' | 'cause' | 'condition' | 'effect';

export interface TritVector {
  past: Trit;
  present: Trit;
  future: Trit;
  internal: Trit;
  medial: Trit;
  external: Trit;
  cause: Trit;
  condition: Trit;
  effect: Trit;
}

export const ALL_DIMENSIONS: TritDimension[] = [
  'past', 'present', 'future',
  'internal', 'medial', 'external',
  'cause', 'condition', 'effect'
];

// ═══════════════════════════════════════════════════════════════
// 平衡三进制认知空间常量（与 Go cogspace 包对齐）
// ═══════════════════════════════════════════════════════════════

/** 认知空间维度数 */
export const DIM_NUM = 9;
/** 认知空间离散点位总数 3^9 = 19683 */
export const TOTAL_NUM = 19683;
/**
 * 平衡三进制偏移量，将 [-9841, 9841] 平移到 [0, 19682]
 * 计算：sum(3^0..3^8) = (3^9 - 1) / (3 - 1) = (19683 - 1) / 2 = 9841
 */
export const COG_OFFSET = 9841;

/** 预计算 3 的幂次缓存 [3^0, 3^1, ..., 3^8] */
const POW3_CACHE: number[] = (() => {
  const cache: number[] = new Array(DIM_NUM);
  cache[0] = 1;
  for (let i = 1; i < DIM_NUM; i++) {
    cache[i] = cache[i - 1] * 3;
  }
  return cache;
})();

export class TritVectorOps {
  static zero(): TritVector {
    return { past: 0, present: 0, future: 0, internal: 0, medial: 0, external: 0, cause: 0, condition: 0, effect: 0 };
  }

  static fromArray(arr: Trit[]): TritVector {
    if (arr.length !== 9) throw new Error('需要9个Trit值');
    return {
      past: arr[0], present: arr[1], future: arr[2],
      internal: arr[3], medial: arr[4], external: arr[5],
      cause: arr[6], condition: arr[7], effect: arr[8]
    };
  }

  static toArray(v: TritVector): Trit[] {
    return ALL_DIMENSIONS.map(d => v[d]);
  }

  /**
   * 多数态：+1=扩张，0=观察，-1=收缩
   */
  static majority(v: TritVector): Trit {
    const sum = TritVectorOps.toArray(v).reduce<number>((a, b) => a + b, 0);
    if (sum > 1) return 1;
    if (sum < -1) return -1;
    return 0;
  }

  /**
   * 卦象索引 (0~19682)：九维三态 → 3^9 = 19683 种状态
   */
  static toHexagramIndex(v: TritVector): number {
    const ternary = TritVectorOps.toArray(v).map(t => t + 1);
    let idx = 0;
    for (let i = 0; i < ternary.length; i++) {
      idx = idx * 3 + ternary[i];
    }
    return idx;
  }

  static fromHexagramIndex(idx: number): TritVector {
    if (idx < 0 || idx > 19682) throw new Error('卦象索引必须在0~19682之间');
    const ternary: number[] = [];
    let n = idx;
    for (let i = 0; i < 9; i++) {
      ternary.unshift(n % 3);
      n = Math.floor(n / 3);
    }
    return TritVectorOps.fromArray(ternary.map(t => (t - 1) as Trit));
  }

  // ═══════════════════════════════════════════════════════════════
  // 平衡三进制编码（与 Go cogspace 包完全对齐）
  // ═══════════════════════════════════════════════════════════════

  /**
   * 平衡三进制编码：向量 → 全局CogID [0, 19682]
   *
   * 编码公式：ID = Σ(v[i] × 3^(8-i)) + COG_OFFSET
   * 其中 v[i] ∈ {-1, 0, +1}（平衡三进制）
   *
   * 注意：与 toHexagramIndex 的偏移base-3编码不同，
   * toCogID 采用平衡三进制加权编码，与 Go cogspace.CogVector.Encode() 一致。
   */
  static toCogID(v: TritVector): number {
    const arr = TritVectorOps.toArray(v);
    let sum = 0;
    for (let i = 0; i < DIM_NUM; i++) {
      sum += arr[i] * POW3_CACHE[DIM_NUM - 1 - i];
    }
    return sum + COG_OFFSET;
  }

  /**
   * 平衡三进制解码：CogID → 向量
   *
   * 修复要点：JavaScript 的 % 运算符对负数保留被除数符号，
   * 必须将余数归一化到 {-1, 0, +1} 后执行精确除法。
   *
   * 与 Go cogspace.Decode() 完全对齐。
   */
  static fromCogID(id: number): TritVector {
    if (id < 0 || id >= TOTAL_NUM) {
      throw new Error(`CogID 必须在 [0, ${TOTAL_NUM - 1}] 之间，收到 ${id}`);
    }
    let val = id - COG_OFFSET;
    const digits: Trit[] = new Array(DIM_NUM).fill(0);

    for (let i = 0; i < DIM_NUM; i++) {
      const pos = DIM_NUM - 1 - i;
      let r = val % 3;
      // 将余数转换为平衡三进制数字 {-1, 0, +1}
      if (r === 2) r = -1;
      else if (r === -2) r = 1;
      digits[pos] = r as Trit;
      // 精确除法：(val - r) 一定能被 3 整除
      val = (val - r) / 3;
    }

    return TritVectorOps.fromArray(digits);
  }

  /** 原点偏差距离（到全和向量的欧式距离），数值越大认知越极端，范围 [0, 6] */
  static biasToOrigin(v: TritVector): number {
    return TritVectorOps.euclideanDistance(v, TritVectorOps.zero());
  }

  /**
   * 阴阳和合融合算子
   *
   * 逐维取和：a[i]+b[i] > 0 → 阳(+1), < 0 → 阴(-1), == 0 → 和(0)
   * 用于极端偏激向量与原点中和，生成新的平衡认知。
   */
  static merge(a: TritVector, b: TritVector): TritVector {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    const result: Trit[] = [];
    for (let i = 0; i < DIM_NUM; i++) {
      const sum = arrA[i] + arrB[i];
      result.push((sum > 0 ? 1 : sum < 0 ? -1 : 0) as Trit);
    }
    return TritVectorOps.fromArray(result);
  }

  /**
   * 极端认知检测
   * @param v 认知向量
   * @param threshold 非中和维度数量阈值，默认7（9维中7维以上偏离平衡态则视为极端）
   * @returns true = 极端认知，需要中和
   */
  static isExtreme(v: TritVector, threshold: number = 7): boolean {
    const nonZero = TritVectorOps.toArray(v).filter(t => t !== 0).length;
    return nonZero >= threshold;
  }

  /** 与原点融合，中和极端偏激（阳+和=阳，阴+和=阴，和+和=和） */
  static neutralizeWithOrigin(v: TritVector): TritVector {
    return TritVectorOps.merge(v, TritVectorOps.zero());
  }

  /**
   * 曼哈顿距离（L1）：每维差的绝对值之和
   * 注意：这是原先被命名为 `distance` 的方法，实际计算的是曼哈顿距离。
   * 保留向后兼容别名，新代码请使用 CognitiveDistance.manhattan。
   */
  static distance(a: TritVector, b: TritVector): number {
    return TritVectorOps.manhattanDistance(a, b);
  }

  /** 曼哈顿距离（L1）：每维 |a-b| 之和，范围 0~18 */
  static manhattanDistance(a: TritVector, b: TritVector): number {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    let dist = 0;
    for (let i = 0; i < 9; i++) {
      dist += Math.abs(arrA[i] - arrB[i]);
    }
    return dist;
  }

  /** 汉明距离：有几个维度不同，范围 0~9 */
  static hammingDistance(a: TritVector, b: TritVector): number {
    return ALL_DIMENSIONS.filter(d => a[d] !== b[d]).length;
  }

  /** 欧式距离（L2）：考虑阴阳对立比阴到和更远 */
  static euclideanDistance(a: TritVector, b: TritVector): number {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    let sumSq = 0;
    for (let i = 0; i < 9; i++) {
      sumSq += Math.pow(arrA[i] - arrB[i], 2);
    }
    return Math.sqrt(sumSq);
  }

  /** 余弦相似度：方向是否一致，范围 -1~1 */
  static cosineSimilarity(a: TritVector, b: TritVector): number {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 9; i++) {
      dot += arrA[i] * arrB[i];
      normA += arrA[i] * arrA[i];
      normB += arrB[i] * arrB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 时间链：过去→现在→未来
   */
  static propagateTime(v: TritVector): TritVector {
    let future: Trit = v.future;
    if (v.past === 1 && v.present === 1) future = 1;
    else if (v.past === -1 && v.present === -1) future = -1;
    return { ...v, future };
  }

  /**
   * 因果链：因+缘→果
   */
  static propagateCause(v: TritVector): TritVector {
    let effect: Trit = v.effect;
    if (v.cause === 1 && v.condition === 1) effect = 1;
    else if (v.cause === -1 || v.condition === -1) effect = -1;
    return { ...v, effect };
  }

  /**
   * 更新单个维度
   */
  static update(v: TritVector, dim: TritDimension, value: Trit): TritVector {
    return { ...v, [dim]: value };
  }

  /**
   * 克隆
   */
  static clone(v: TritVector): TritVector {
    return { ...v };
  }

  /**
   * 相等判断
   */
  static equals(a: TritVector, b: TritVector): boolean {
    return ALL_DIMENSIONS.every(d => a[d] === b[d]);
  }

  /**
   * 升映射（Sheng Lift）— 将离散三元向量规范嵌入到 S⁸ 球面
   *
   * 论文 Section 4.1：将三元状态 (+1/0/−1) 通过规范嵌入映射到连续流形，
   * 使得离散的认知状态可以在连续几何空间中演化。
   * 映射公式：x(s) = ι(s) / ‖ι(s)‖₂ ∈ S⁸ ⊂ ℝ⁹
   * 零向量（void state）保持为原点，isVoid = true。
   */
  static shengLift(v: TritVector): { position: number[]; isVoid: boolean; nonzeroMask: boolean[] } {
    const arr = TritVectorOps.toArray(v);
    const norm = Math.sqrt(arr.reduce<number>((sum, x) => sum + x * x, 0));
    if (norm === 0) return { position: [0, 0, 0, 0, 0, 0, 0, 0, 0], isVoid: true, nonzeroMask: [false, false, false, false, false, false, false, false, false] };
    return {
      position: arr.map(x => x / norm),
      isVoid: false,
      // 记录非零维掩码：升映射是 x -> x/||x||，逆映射需知道哪些维原本非零，
      // 否则归一化后的分量（如全+1向量每维=1/√9≈0.333）会被固定阈值 0.5 误判为零。
      nonzeroMask: arr.map(x => x !== 0)
    };
  }

  /**
   * 逆映射（round）— 从 S⁸ 球面坐标回到最近的离散三元向量
   *
   * 修复：旧实现用固定阈值 0.5，但归一化后分量最大只有 1/√k（k=非零维数），
   * 全+1 扩张态（每维 0.333）会被错误坍缩为全零。现在优先使用 shengLift 的
   * nonzeroMask 精确还原；无掩码时（外部直接传入数组）用自适应阈值 0.5×max|分量|。
   */
  static roundFromSheng(position: number[], nonzeroMask?: boolean[]): TritVector {
    if (position.length !== 9) throw new Error('需要9维坐标');
    const arr: Trit[] = position.map((x, i) => {
      if (nonzeroMask) {
        if (!nonzeroMask[i]) return 0;
        return x >= 0 ? 1 : -1;
      }
      // 自适应阈值：以最大绝对值为基准（保证至少最大分量能还原）
      const maxAbs = Math.max(...position.map(Math.abs), 1e-9);
      const threshold = maxAbs * 0.5;
      if (x > threshold) return 1;
      if (x < -threshold) return -1;
      return 0;
    }) as Trit[];
    return TritVectorOps.fromArray(arr);
  }

  /**
   * 球面距离（测地线距离）— 在 S⁸ 上的最短弧长，范围 0~π
   */
  static sphericalDistance(a: TritVector, b: TritVector): number {
    const liftedA = TritVectorOps.shengLift(a);
    const liftedB = TritVectorOps.shengLift(b);
    if (liftedA.isVoid || liftedB.isVoid) return Math.PI / 2;
    let dot = 0;
    for (let i = 0; i < 9; i++) dot += liftedA.position[i] * liftedB.position[i];
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  /**
   * 辛角（Symplectic Angle）— 在 S⁸ 上的投影相位
   * 将认知状态投影到两个主导振荡方向 (ξ₁, ξ₂) 上，
   * 计算相位角 θ(t) = arg(⟨x̂, ξ₁⟩ + i⟨x̂, ξ₂⟩)。
   * 这是四相极限环发现的核心——四相就是辛角 θ 的四个象限。
   */
  static symplecticAngle(v: TritVector, xi1?: number[], xi2?: number[]): number {
    const lifted = TritVectorOps.shengLift(v);
    if (lifted.isVoid) return 0;
    const e1 = xi1 || [0.5, 0, -0.5, 0, 0, 0, 0, 0, 0];
    const e2 = xi2 || [0, 0, 0, 0, 0, 0, 0.5, 0, -0.5];
    let proj1 = 0, proj2 = 0;
    for (let i = 0; i < 9; i++) { proj1 += lifted.position[i] * e1[i]; proj2 += lifted.position[i] * e2[i]; }
    return Math.atan2(proj2, proj1);
  }
}