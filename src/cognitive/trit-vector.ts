/**
 * Trit 九维认知向量
 * 时间维度（过去·现在·未来）
 * 空间维度（内·中·外）
 * 因果维度（因·缘·果）
 *
 * 每个维度取值：-1 / 0 / +1
 */

export type Trit = -1 | 0 | 1;

export interface TritVector {
  // 时间维度
  past: Trit;
  present: Trit;
  future: Trit;

  // 空间维度
  internal: Trit;  // 内——核心自我
  medial: Trit;    // 中——通道桥梁
  external: Trit;  // 外——环境世界

  // 因果维度
  cause: Trit;      // 因——动机种子
  condition: Trit;  // 缘——外部条件
  effect: Trit;     // 果——实际结果
}

export type TritDimension = keyof TritVector;

export const ALL_DIMENSIONS: TritDimension[] = [
  'past', 'present', 'future',
  'internal', 'medial', 'external',
  'cause', 'condition', 'effect'
];

export class TritVectorOps {
  /**
   * 创建一个全零向量（认知悬置态）
   */
  static zero(): TritVector {
    return {
      past: 0, present: 0, future: 0,
      internal: 0, medial: 0, external: 0,
      cause: 0, condition: 0, effect: 0
    };
  }

  /**
   * 从数组创建向量
   */
  static fromArray(arr: Trit[]): TritVector {
    if (arr.length !== 9) throw new Error('需要9个Trit值');
    return {
      past: arr[0], present: arr[1], future: arr[2],
      internal: arr[3], medial: arr[4], external: arr[5],
      cause: arr[6], condition: arr[7], effect: arr[8]
    };
  }

  /**
   * 转为数组
   */
  static toArray(v: TritVector): Trit[] {
    return ALL_DIMENSIONS.map(d => v[d]);
  }

  /**
   * 计算多数态（用于全局态势判断）
   * +1 = 扩张态, 0 = 观察态, -1 = 收缩态
   */
  static majority(v: TritVector): Trit {
    const arr = TritVectorOps.toArray(v);
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum > 1) return 1;
    if (sum < -1) return -1;
    return 0;
  }

  /**
   * 计算卦象索引 (0~19682)
   * 基于九维向量映射到三进制空间
   */
  static toHexagramIndex(v: TritVector): number {
    const arr = TritVectorOps.toArray(v);
    const ternary = arr.map(t => t + 1);
    let idx = 0;
    for (let i = 0; i < ternary.length; i++) {
      idx = idx * 3 + ternary[i];
    }
    return idx;
  }

  /**
   * 从卦象索引反推向量
   */
  static fromHexagramIndex(idx: number): TritVector {
    if (idx < 0 || idx > 19682) throw new Error('卦象索引必须在0~19682之间');
    const ternary: number[] = [];
    let n = idx;
    for (let i = 0; i < 9; i++) {
      ternary.unshift(n % 3);
      n = Math.floor(n / 3);
    }
    const trits = ternary.map(t => (t - 1) as Trit);
    return TritVectorOps.fromArray(trits);
  }

  /**
   * 计算两个向量的距离（用于认知迁移）
   */
  static distance(a: TritVector, b: TritVector): number {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    let dist = 0;
    for (let i = 0; i < 9; i++) {
      dist += Math.abs(arrA[i] - arrB[i]);
    }
    return dist;
  }

  /**
   * 更新单个维度
   */
  static update(v: TritVector, dim: TritDimension, value: Trit): TritVector {
    return { ...v, [dim]: value };
  }

  /**
   * 时间链传递：过去→现在→未来
   */
  static propagateTime(v: TritVector): TritVector {
    let future: Trit = 0;
    if (v.past === 1 && v.present === 1) future = 1;
    else if (v.past === -1 && v.present === -1) future = -1;
    return { ...v, future };
  }

  /**
   * 因果链计算：因+缘→果
   */
  static propagateCause(v: TritVector): TritVector {
    let effect: Trit = 0;
    if (v.cause === 1 && v.condition === 1) effect = 1;
    else if (v.cause === -1 || v.condition === -1) effect = -1;
    return { ...v, effect };
  }
}
