import { CognitiveDistance } from '../src/cognitive/distance';
import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('CognitiveDistance', () => {
  const zero = TritVectorOps.zero();
  const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
  const mixed = TritVectorOps.fromArray([1, -1, 0, 1, 0, -1, 1, 1, -1]);

  test('hamming: 相同向量距离为0', () => {
    expect(CognitiveDistance.hamming(zero, zero)).toBe(0);
    expect(CognitiveDistance.hamming(allYang, allYang)).toBe(0);
  });

  test('hamming: 全阳vs全阴距离为9', () => {
    expect(CognitiveDistance.hamming(allYang, allYin)).toBe(9);
  });

  test('hamming: 全阳vs全和距离为9', () => {
    expect(CognitiveDistance.hamming(allYang, zero)).toBe(9);
  });

  test('manhattan: 相同向量距离为0', () => {
    expect(CognitiveDistance.manhattan(zero, zero)).toBe(0);
  });

  test('manhattan: 全阳vs全阴距离为18', () => {
    expect(CognitiveDistance.manhattan(allYang, allYin)).toBe(18);
  });

  test('manhattan: 全阳vs全和距离为9', () => {
    expect(CognitiveDistance.manhattan(allYang, zero)).toBe(9);
  });

  test('euclidean: 相同向量距离为0', () => {
    expect(CognitiveDistance.euclidean(zero, zero)).toBe(0);
  });

  test('euclidean: 全阳vs全阴距离为6', () => {
    expect(CognitiveDistance.euclidean(allYang, allYin)).toBeCloseTo(6, 4);
  });

  test('cosineSimilarity: 相同向量相似度为1', () => {
    expect(CognitiveDistance.cosineSimilarity(allYang, allYang)).toBeCloseTo(1, 4);
  });

  test('cosineSimilarity: 全阳vs全阴相似度为-1', () => {
    expect(CognitiveDistance.cosineSimilarity(allYang, allYin)).toBeCloseTo(-1, 4);
  });

  test('cosineSimilarity: 全和向量的相似度为0（零向量）', () => {
    expect(CognitiveDistance.cosineSimilarity(zero, allYang)).toBe(0);
  });

  test('cosineDistance: 相同向量距离为0', () => {
    expect(CognitiveDistance.cosineDistance(allYang, allYang)).toBeCloseTo(0, 4);
  });

  test('weighted: 默认权重计算', () => {
    const dist = CognitiveDistance.weighted(allYang, allYin);
    expect(dist).toBeGreaterThan(0);
    // 全阳vs全阴：每维差2，9维
    // 时间3维×e×2 + 空间3维×π×2 + 因果3维×γ×2
    const expected = 2 * (3 * Math.E + 3 * Math.PI + 3 * 0.5772);
    expect(dist).toBeCloseTo(expected, 2);
  });

  test('weightedNormalized: 归一化到0~1', () => {
    const dist = CognitiveDistance.weightedNormalized(allYang, allYin);
    expect(dist).toBeCloseTo(1, 4); // 最大差异 → 1

    const distZero = CognitiveDistance.weightedNormalized(zero, zero);
    expect(distZero).toBe(0); // 相同 → 0
  });

  test('composite: 相同向量距离为0', () => {
    expect(CognitiveDistance.composite(zero, zero)).toBe(0);
    expect(CognitiveDistance.composite(allYang, allYang)).toBe(0);
  });

  test('composite: 全阳vs全阴距离为1（最大差异）', () => {
    expect(CognitiveDistance.composite(allYang, allYin)).toBeCloseTo(1, 4);
  });

  test('composite: 范围在0~1之间', () => {
    const dist = CognitiveDistance.composite(mixed, allYang);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(dist).toBeLessThanOrEqual(1);
  });

  test('nearestK: 返回最近的K个', () => {
    const candidates = [allYin, zero, allYang, mixed];
    const result = CognitiveDistance.nearestK(allYang, candidates, 2);
    expect(result).toHaveLength(2);
    expect(TritVectorOps.equals(result[0].vector, allYang)).toBe(true); // 最近的是自己
  });

  test('summary: 返回所有距离度量', () => {
    const s = CognitiveDistance.summary(allYang, allYin);
    expect(s.hamming).toBe(9);
    expect(s.manhattan).toBe(18);
    expect(s).toHaveProperty('euclidean');
    expect(s).toHaveProperty('cosineSimilarity');
    expect(s).toHaveProperty('weighted');
    expect(s).toHaveProperty('composite');
  });
});
