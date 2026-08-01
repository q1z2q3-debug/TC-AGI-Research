/**
 * 三元逻辑门 (Trit Logic Gates) — "和"态涌现
 * ─────────────────────────────────────────────────────────────
 *
 * 在二元逻辑（0/1）中，AND/OR 只能产生 0 或 1，中间状态不可能涌现。
 * 但在三元逻辑（-1/0/+1）中，"和"态（0）可以作为对立力量的平衡而涌现。
 *
 * 三元逻辑门的核心理念：
 *
 *   阴 (-1) = 否定 / 收缩 / 抑制
 *   和 ( 0) = 平衡 / 悬置 / 涌现  ← 二元逻辑中不存在
 *   阳 (+1) = 肯定 / 扩张 / 激活
 *
 * 基本门：
 *   NOT  — 取反：阳↔阴，和→和（和态自反，不可否定）
 *   MIN  — 取小：阴主导（类似 AND，但阴+阳→阴）
 *   MAX  — 取大：阳主导（类似 OR，但阴+阳→阳）
 *   MID  — 取中：和态涌现门（阴+阳→和，这是核心创新）
 *   SHIFT — 移位：整体向某个方向偏移
 *   MERGE — 融合：多向量按维度合并
 *
 * "和"态涌现的关键门是 MID（取中门）：
 *   当阴(-1)和阳(+1)同时输入时，MID 产生和(0)——
 *   这模拟了"对立力量达到平衡时涌现出新的中间态"。
 *
 * 在认知层面，这意味着：
 *   当内心想推进(+1)但外部受阻(-1)时，MID门产生"和"态——
 *   不是放弃也不是强推，而是悬置、观察、等待新信息。
 */

import { Trit, TritVector, TritVectorOps, ALL_DIMENSIONS, TritDimension } from './trit-vector';

// ═══════════════════════════════════════════════════════════
// 基本三元逻辑门（标量级）
// ═══════════════════════════════════════════════════════════

/**
 * NOT 门（取反）：阳↔阴，和→和
 * 和态自反——"和"不可被否定，它是对立的平衡点。
 */
export function tritNot(a: Trit): Trit {
  if (a === 1) return -1;
  if (a === -1) return 1;
  return 0;
}

/**
 * MIN 门（取小/阴主导）：类似 AND
 *   min(-1, anything) = -1  （阴主导）
 *   min(0, 0) = 0
 *   min(0, 1) = 0
 *   min(1, 1) = 1
 */
export function tritMin(a: Trit, b: Trit): Trit {
  return Math.min(a, b) as Trit;
}

/**
 * MAX 门（取大/阳主导）：类似 OR
 *   max(1, anything) = 1  （阳主导）
 *   max(0, 0) = 0
 *   max(0, -1) = 0
 *   max(-1, -1) = -1
 */
export function tritMax(a: Trit, b: Trit): Trit {
  return Math.max(a, b) as Trit;
}

/**
 * MID 门（取中/和态涌现）：核心创新
 *
 *   mid(-1, +1) = 0   ← 和态涌现！对立力量平衡
 *   mid(-1,  0) = -1
 *   mid(-1, -1) = -1
 *   mid( 0, +1) = 0
 *   mid( 0,  0) = 0
 *   mid(+1, +1) = +1
 *
 * 这是三元逻辑独有的门——当阴和阳同时输入时，涌现出"和"。
 * 模拟认知中"矛盾达到平衡时产生新认知"的过程。
 */
export function tritMid(a: Trit, b: Trit): Trit {
  // 对立输入 → 和态涌现
  if (a === -1 && b === 1) return 0;
  if (a === 1 && b === -1) return 0;
  // 非对立 → 取平均值方向
  if (a === 0 || b === 0) return 0;
  // 同向 → 保持
  return a; // a === b at this point
}

/**
 * SHIFT 门（移位）：整体向某方向偏移
 *   shift(a, delta) 将 a 向 delta 方向偏移，但不超过 [-1, 1]
 *
 *   shift(0, +1) = +1
 *   shift(0, -1) = -1
 *   shift(+1, +1) = +1  （饱和）
 *   shift(-1, -1) = -1  （饱和）
 *   shift(+1, -1) = 0   （阳被拉向和）
 *   shift(-1, +1) = 0   （阴被推向和）
 */
export function tritShift(a: Trit, delta: Trit): Trit {
  const result = a + delta;
  if (result > 1) return 1;
  if (result < -1) return -1;
  return result as Trit;
}

/**
 * CONSENSUS 门（共识）：三方投票
 *   当三个输入中有两个以上同向时，取该方向
 *   否则取和态（0）
 *
 *   consensus(1, 1, -1) = 1   （多数阳）
 *   consensus(-1, -1, 1) = -1  （多数阴）
 *   consensus(1, -1, 0) = 0    （无多数 → 和态涌现）
 */
export function tritConsensus(a: Trit, b: Trit, c: Trit): Trit {
  const posCount = [a, b, c].filter(v => v === 1).length;
  const negCount = [a, b, c].filter(v => v === -1).length;
  if (posCount >= 2) return 1;
  if (negCount >= 2) return -1;
  return 0;
}

/**
 * BALANCE 门（平衡）：两个输入的平衡态
 *   如果两输入相同 → 保持
 *   如果两输入对立 → 和态涌现
 *   如果一端为和 → 和态
 */
export function tritBalance(a: Trit, b: Trit): Trit {
  if (a === b) return a;
  if (a === 0 || b === 0) return 0;
  // a !== b 且都非0 → 对立 → 和态
  return 0;
}

// ═══════════════════════════════════════════════════════════
// 向量级三元逻辑门（对九维向量操作）
// ═══════════════════════════════════════════════════════════

/** 向量 NOT：逐维取反 */
export function vectorNot(v: TritVector): TritVector {
  const result = { ...v };
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritNot(v[d]);
  }
  return result;
}

/** 向量 MIN：逐维取小 */
export function vectorMin(a: TritVector, b: TritVector): TritVector {
  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritMin(a[d], b[d]);
  }
  return result;
}

/** 向量 MAX：逐维取大 */
export function vectorMax(a: TritVector, b: TritVector): TritVector {
  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritMax(a[d], b[d]);
  }
  return result;
}

/**
 * 向量 MID：逐维取中（和态涌现门）
 *
 * 这是认知融合的核心操作——
 * 当两个认知向量的同一维度对立时，该维度涌现"和"态。
 * 模拟"两个不同视角融合后，对立维度达成平衡"。
 */
export function vectorMid(a: TritVector, b: TritVector): TritVector {
  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritMid(a[d], b[d]);
  }
  return result;
}

/** 向量 SHIFT：逐维移位 */
export function vectorShift(v: TritVector, delta: TritVector): TritVector {
  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritShift(v[d], delta[d]);
  }
  return result;
}

/**
 * 向量 MERGE：多向量融合
 *
 * 对每个维度，统计所有输入向量在该维度的值：
 *   - 如果全部同向 → 取该方向
 *   - 如果有对立 → 和态涌现
 *   - 如果有和态且无对立 → 和态
 *
 * 这模拟了"多方视角融合"——当所有视角一致时保持方向，
 * 当存在分歧时产生"和"态（悬置判断）。
 */
export function vectorMerge(vectors: TritVector[]): TritVector {
  if (vectors.length === 0) return TritVectorOps.zero();
  if (vectors.length === 1) return { ...vectors[0] };

  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    const values = vectors.map(v => v[d]);
    const hasPositive = values.includes(1);
    const hasNegative = values.includes(-1);

    if (hasPositive && hasNegative) {
      // 对立 → 和态涌现
      result[d] = 0;
    } else if (hasPositive) {
      result[d] = 1;
    } else if (hasNegative) {
      result[d] = -1;
    } else {
      result[d] = 0;
    }
  }
  return result;
}

/** 向量 CONSENSUS：三方投票 */
export function vectorConsensus(a: TritVector, b: TritVector, c: TritVector): TritVector {
  const result = {} as TritVector;
  for (const d of ALL_DIMENSIONS) {
    result[d] = tritConsensus(a[d], b[d], c[d]);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// 和态分析
// ═══════════════════════════════════════════════════════════

/** 统计向量中"和"态维度的数量 */
export function countHe(v: TritVector): number {
  return ALL_DIMENSIONS.filter(d => v[d] === 0).length;
}

/** 统计向量中"阳"态维度的数量 */
export function countYang(v: TritVector): number {
  return ALL_DIMENSIONS.filter(d => v[d] === 1).length;
}

/** 统计向量中"阴"态维度的数量 */
export function countYin(v: TritVector): number {
  return ALL_DIMENSIONS.filter(d => v[d] === -1).length;
}

/**
 * 和态密度：向量中"和"态维度的比例
 *   0 = 完全极化（全阴或全阳）
 *   1 = 完全中和（全和）
 */
export function heDensity(v: TritVector): number {
  return countHe(v) / 9;
}

/**
 * 极化度：向量中非"和"态维度的比例
 *   0 = 完全中和
 *   1 = 完全极化
 */
export function polarization(v: TritVector): number {
  return 1 - heDensity(v);
}

/**
 * 阴阳平衡度：阳态和阴态数量的接近程度
 *   1 = 完全平衡（阳=阴）
 *   0 = 完全不平衡（全阳或全阴）
 */
export function yinYangBalance(v: TritVector): number {
  const yang = countYang(v);
  const yin = countYin(v);
  const total = yang + yin;
  if (total === 0) return 1; // 全和 → 视为平衡
  return 1 - Math.abs(yang - yin) / total;
}

/**
 * 和态涌现分析：检测一个向量是否处于"和态涌现"状态
 *
 * 和态涌现的标志：
 *   1. 和态密度高（多个维度处于和态）
 *   2. 阴阳平衡（非和态的维度中阴阳接近）
 *   3. 不是全和（全和是初始态，不是涌现态）
 */
export function isHeEmergent(v: TritVector): {
  emergent: boolean;
  density: number;
  balance: number;
  description: string;
} {
  const density = heDensity(v);
  const balance = yinYangBalance(v);
  const heCount = countHe(v);

  const emergent = heCount >= 3 && heCount < 9 && balance > 0.5;

  let description: string;
  if (heCount === 9) {
    description = '全和态（初始悬置态，非涌现）';
  } else if (emergent) {
    description = `和态涌现（${heCount}维中和，阴阳平衡度${balance.toFixed(2)}）`;
  } else if (heCount === 0) {
    description = '完全极化态（无和态）';
  } else {
    description = `部分中和（${heCount}维中和，平衡度${balance.toFixed(2)}）`;
  }

  return { emergent, density, balance, description };
}
