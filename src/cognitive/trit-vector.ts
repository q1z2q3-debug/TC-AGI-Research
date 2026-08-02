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
  static shengLift(v: TritVector): { position: number[]; isVoid: boolean } {
    const arr = TritVectorOps.toArray(v);
    const norm = Math.sqrt(arr.reduce<number>((sum, x) => sum + x * x, 0));
    if (norm === 0) return { position: [0, 0, 0, 0, 0, 0, 0, 0, 0], isVoid: true };
    return { position: arr.map(x => x / norm), isVoid: false };
  }

  /**
   * 逆映射（round）— 从 S⁸ 球面坐标回到最近的离散三元向量
   */
  static roundFromSheng(position: number[]): TritVector {
    if (position.length !== 9) throw new Error('需要9维坐标');
    const arr: Trit[] = position.map(x => {
      if (x > 0.5) return 1;
      if (x < -0.5) return -1;
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