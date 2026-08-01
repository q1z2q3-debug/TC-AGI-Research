import {
  tritNot, tritMin, tritMax, tritMid, tritShift, tritConsensus, tritBalance,
  vectorNot, vectorMin, vectorMax, vectorMid, vectorShift, vectorMerge, vectorConsensus,
  countHe, countYang, countYin, heDensity, polarization, yinYangBalance, isHeEmergent
} from '../src/cognitive/trit-gates';
import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('Trit Logic Gates (标量级)', () => {
  test('tritNot: 取反', () => {
    expect(tritNot(1)).toBe(-1);
    expect(tritNot(-1)).toBe(1);
    expect(tritNot(0)).toBe(0); // 和态自反
  });

  test('tritMin: 取小（阴主导）', () => {
    expect(tritMin(-1, 1)).toBe(-1);
    expect(tritMin(-1, 0)).toBe(-1);
    expect(tritMin(0, 1)).toBe(0);
    expect(tritMin(1, 1)).toBe(1);
  });

  test('tritMax: 取大（阳主导）', () => {
    expect(tritMax(1, -1)).toBe(1);
    expect(tritMax(1, 0)).toBe(1);
    expect(tritMax(0, -1)).toBe(0);
    expect(tritMax(-1, -1)).toBe(-1);
  });

  test('tritMid: 和态涌现门（核心创新）', () => {
    expect(tritMid(-1, 1)).toBe(0);  // 对立 → 和态涌现
    expect(tritMid(1, -1)).toBe(0);  // 对立 → 和态涌现
    expect(tritMid(0, 1)).toBe(0);
    expect(tritMid(0, -1)).toBe(0);
    expect(tritMid(0, 0)).toBe(0);
    expect(tritMid(1, 1)).toBe(1);
    expect(tritMid(-1, -1)).toBe(-1);
  });

  test('tritShift: 移位', () => {
    expect(tritShift(0, 1)).toBe(1);
    expect(tritShift(0, -1)).toBe(-1);
    expect(tritShift(1, 1)).toBe(1);  // 饱和
    expect(tritShift(-1, -1)).toBe(-1); // 饱和
    expect(tritShift(1, -1)).toBe(0);   // 阳被拉向和
    expect(tritShift(-1, 1)).toBe(0);   // 阴被推向和
  });

  test('tritConsensus: 三方投票', () => {
    expect(tritConsensus(1, 1, -1)).toBe(1);   // 多数阳
    expect(tritConsensus(-1, -1, 1)).toBe(-1);  // 多数阴
    expect(tritConsensus(1, -1, 0)).toBe(0);    // 无多数 → 和态
    expect(tritConsensus(0, 0, 0)).toBe(0);
  });

  test('tritBalance: 平衡态', () => {
    expect(tritBalance(1, 1)).toBe(1);
    expect(tritBalance(-1, -1)).toBe(-1);
    expect(tritBalance(1, -1)).toBe(0); // 对立 → 和态
    expect(tritBalance(0, 1)).toBe(0);
  });
});

describe('Trit Logic Gates (向量级)', () => {
  const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
  const zero = TritVectorOps.zero();

  test('vectorNot: 逐维取反', () => {
    const result = vectorNot(allYang);
    expect(TritVectorOps.equals(result, allYin)).toBe(true);
    const resultZero = vectorNot(zero);
    expect(TritVectorOps.equals(resultZero, zero)).toBe(true); // 和态自反
  });

  test('vectorMin: 逐维取小', () => {
    const result = vectorMin(allYang, allYin);
    expect(TritVectorOps.equals(result, allYin)).toBe(true);
  });

  test('vectorMax: 逐维取大', () => {
    const result = vectorMax(allYang, allYin);
    expect(TritVectorOps.equals(result, allYang)).toBe(true);
  });

  test('vectorMid: 和态涌现（全阳vs全阴→全和）', () => {
    const result = vectorMid(allYang, allYin);
    expect(TritVectorOps.equals(result, zero)).toBe(true); // 对立 → 全和涌现
  });

  test('vectorShift: 逐维移位', () => {
    const shiftBy = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = vectorShift(zero, shiftBy);
    expect(result.past).toBe(1);
    expect(result.present).toBe(0);
  });

  test('vectorMerge: 多向量融合', () => {
    const a = TritVectorOps.fromArray([1, 0, -1, 0, 0, 0, 0, 0, 0]);
    const b = TritVectorOps.fromArray([1, 0, 1, 0, 0, 0, 0, 0, 0]);
    const c = TritVectorOps.fromArray([-1, 0, 1, 0, 0, 0, 0, 0, 0]);
    const result = vectorMerge([a, b, c]);
    // 第一维：1,1,-1 → 对立 → 和态
    expect(result.past).toBe(0);
    // 第三维：-1,1,1 → 对立 → 和态
    expect(result.future).toBe(0);
  });
});

describe('和态分析', () => {
  test('countHe: 统计和态维度数', () => {
    const zero = TritVectorOps.zero();
    expect(countHe(zero)).toBe(9);

    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(countHe(allYang)).toBe(0);
  });

  test('countYang/countYin', () => {
    const v = TritVectorOps.fromArray([1, 1, -1, 0, 0, 0, 0, 0, 0]);
    expect(countYang(v)).toBe(2);
    expect(countYin(v)).toBe(1);
    expect(countHe(v)).toBe(6);
  });

  test('heDensity: 和态密度', () => {
    expect(heDensity(TritVectorOps.zero())).toBe(1);
    expect(heDensity(TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]))).toBe(0);
  });

  test('polarization: 极化度', () => {
    expect(polarization(TritVectorOps.zero())).toBe(0);
    expect(polarization(TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]))).toBe(1);
  });

  test('yinYangBalance: 阴阳平衡度', () => {
    const balanced = TritVectorOps.fromArray([1, -1, 0, 0, 0, 0, 0, 0, 0]);
    expect(yinYangBalance(balanced)).toBe(1); // 1阳1阴 → 完全平衡

    const unbalanced = TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(yinYangBalance(unbalanced)).toBeLessThan(1);
  });

  test('isHeEmergent: 和态涌现检测', () => {
    const zero = TritVectorOps.zero();
    const result = isHeEmergent(zero);
    expect(result.emergent).toBe(false); // 全和是初始态，非涌现

    const emergent = TritVectorOps.fromArray([1, -1, 0, 0, 1, -1, 0, 0, 0]);
    const result2 = isHeEmergent(emergent);
    expect(result2.density).toBeGreaterThan(0.3);
  });
});
