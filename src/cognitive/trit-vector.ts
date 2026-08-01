/**
 * Trit 九维认知向量
 * 时间维度（过去·现在·未来）
 * 空间维度（内·中·外）
 * 因果维度（因·缘·果）
 */

export type Trit = -1 | 0 | 1;

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

export type TritDimension = keyof TritVector;

export const ALL_DIMENSIONS: TritDimension[] = [
  'past', 'present', 'future',
  'internal', 'medial', 'external',
  'cause', 'condition', 'effect'
];

export class TritVectorOps {
  static zero(): TritVector {
    return {
      past: 0, present: 0, future: 0,
      internal: 0, medial: 0, external: 0,
      cause: 0, condition: 0, effect: 0
    };
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

  static majority(v: TritVector): Trit {
    const arr = TritVectorOps.toArray(v);
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum > 1) return 1;
    if (sum < -1) return -1;
    return 0;
  }

  static toHexagramIndex(v: TritVector): number {
    const arr = TritVectorOps.toArray(v);
    const ternary = arr.map(t => t + 1);
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
    const trits = ternary.map(t => (t - 1) as Trit);
    return TritVectorOps.fromArray(trits);
  }

  static distance(a: TritVector, b: TritVector): number {
    const arrA = TritVectorOps.toArray(a);
    const arrB = TritVectorOps.toArray(b);
    let dist = 0;
    for (let i = 0; i < 9; i++) {
      dist += Math.abs(arrA[i] - arrB[i]);
    }
    return dist;
  }

  static update(v: TritVector, dim: TritDimension, value: Trit): TritVector {
    return { ...v, [dim]: value };
  }

  static propagateTime(v: TritVector): TritVector {
    let future: Trit = 0;
    if (v.past === 1 && v.present === 1) future = 1;
    else if (v.past === -1 && v.present === -1) future = -1;
    return { ...v, future };
  }

  static propagateCause(v: TritVector): TritVector {
    let effect: Trit = 0;
    if (v.cause === 1 && v.condition === 1) effect = 1;
    else if (v.cause === -1 || v.condition === -1) effect = -1;
    return { ...v, effect };
  }
}
