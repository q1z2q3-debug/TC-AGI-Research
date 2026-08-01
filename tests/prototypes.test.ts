import { PrototypeMatcher, PROTOTYPES } from '../src/cognitive/prototypes';
import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('Cognitive Prototypes', () => {
  test('五个原型已定义', () => {
    expect(PROTOTYPES).toHaveLength(5);
    const names = PROTOTYPES.map(p => p.name);
    expect(names).toContain('扩张态');
    expect(names).toContain('收缩态');
    expect(names).toContain('观察态');
    expect(names).toContain('转化态');
    expect(names).toContain('创生态');
  });

  test('每个原型有正确的五行属性', () => {
    const elements = PROTOTYPES.map(p => p.element);
    expect(elements).toContain('木');
    expect(elements).toContain('火');
    expect(elements).toContain('土');
    expect(elements).toContain('金');
    expect(elements).toContain('水');
  });

  test('snapTo: 全阳向量匹配扩张态', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const match = PrototypeMatcher.snapTo(allYang);
    expect(match.prototype.name).toBe('扩张态');
    expect(match.distance).toBe(0);
    expect(match.similarity).toBe(1);
  });

  test('snapTo: 全阴向量匹配收缩态', () => {
    const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
    const match = PrototypeMatcher.snapTo(allYin);
    expect(match.prototype.name).toBe('收缩态');
    expect(match.distance).toBe(0);
  });

  test('snapTo: 全和向量匹配观察态', () => {
    const zero = TritVectorOps.zero();
    const match = PrototypeMatcher.snapTo(zero);
    expect(match.prototype.name).toBe('观察态');
    expect(match.distance).toBe(0);
  });

  test('rankAll: 返回所有原型按距离排序', () => {
    const v = TritVectorOps.fromArray([1, 1, 0, 0, 0, 0, 0, 0, 0]);
    const ranked = PrototypeMatcher.rankAll(v);
    expect(ranked).toHaveLength(5);
    // 第一个应该是距离最近的
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].distance).toBeGreaterThanOrEqual(ranked[i - 1].distance);
    }
  });

  test('computePhi: 空历史返回0', () => {
    expect(PrototypeMatcher.computePhi([])).toBe(0);
  });

  test('computePhi: 全在原型上的历史返回1', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
    const history = [allYang, allYin, allYang, allYin];
    const phi = PrototypeMatcher.computePhi(history);
    expect(phi).toBe(1); // 全部在原型上
  });

  test('computePhi: 远离原型时Φ低', () => {
    const mixed = TritVectorOps.fromArray([1, -1, 0, 1, -1, 0, 1, -1, 0]);
    const history = [mixed, mixed, mixed, mixed];
    const phi = PrototypeMatcher.computePhi(history);
    expect(phi).toBeLessThan(0.5);
  });

  test('analyzeLimitCycle: 分析极限环', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const history = [allYang, allYang, allYang];
    const analysis = PrototypeMatcher.analyzeLimitCycle(history, allYang);
    expect(analysis.phi).toBe(1);
    expect(analysis.currentDeviation).toBe(0);
    expect(analysis.isStable).toBe(true);
    expect(analysis.dominantPrototype).toBe('扩张态');
  });

  test('recommendAction: 扩张态推荐expand', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const rec = PrototypeMatcher.recommendAction(allYang);
    expect(rec.action).toBe('expand');
    expect(rec.confidence).toBeGreaterThan(0.5);
  });

  test('recommendAction: 观察态推荐observe', () => {
    const zero = TritVectorOps.zero();
    const rec = PrototypeMatcher.recommendAction(zero);
    expect(rec.action).toBe('observe');
  });
});
