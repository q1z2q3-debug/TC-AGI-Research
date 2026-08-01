import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('TritVectorOps', () => {
  test('toHexagramIndex / fromHexagramIndex 往返一致', () => {
    const v = TritVectorOps.fromArray([1, -1, 0, 1, 0, -1, 1, 1, -1]);
    const idx = TritVectorOps.toHexagramIndex(v);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(19682);
    const back = TritVectorOps.fromHexagramIndex(idx);
    expect(TritVectorOps.equals(back, v)).toBe(true);
  });

  test('majority 阈值', () => {
    expect(TritVectorOps.majority(TritVectorOps.fromArray([1, 1, 0, 0, 0, 0, 0, 0, 0]))).toBe(1);
    expect(TritVectorOps.majority(TritVectorOps.fromArray([-1, -1, 0, 0, 0, 0, 0, 0, 0]))).toBe(-1);
    expect(TritVectorOps.majority(TritVectorOps.zero())).toBe(0);
  });

  test('distance 为曼哈顿距离', () => {
    const a = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const b = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(TritVectorOps.distance(a, b)).toBe(2);
  });

  test('卦象空间容量 = 3^9 = 19683', () => {
    expect(Math.pow(3, 9)).toBe(19683);
  });
});
