/**
 * P1 自我实证闭环测试
 * 验证：H₄ 禁带检测、排列零假设、Φ 显著性、可复现性
 */
import { validateOwnTrajectories } from '../src/cognitive/self-validation';
import { TritVectorOps, TritVector, Trit } from '../src/cognitive/trit-vector';
import { PROTOTYPES } from '../src/cognitive/prototypes';

function vec(arr: number[]): TritVector {
  return TritVectorOps.fromArray(arr as Trit[]);
}

/** 结构化轨迹：三原型间确定性循环（含驻留） */
function structuredTrajectory(rounds: number): TritVector[] {
  const expand = PROTOTYPES[0].vector;
  const contract = PROTOTYPES[1].vector;
  const observe = PROTOTYPES[2].vector;
  const seq: TritVector[] = [];
  for (let i = 0; i < rounds; i++) {
    seq.push(observe, observe, expand, observe, contract);
  }
  return seq;
}

/** 伪随机轨迹（固定种子） */
function randomTrajectory(n: number, seed = 7): TritVector[] {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return Array.from({ length: n }, () =>
    vec(Array.from({ length: 9 }, () => Math.floor(rng() * 3) - 1))
  );
}

describe('P1 自我实证闭环', () => {
  test('结构化轨迹：转移结构显著且 Φ 原型聚集显著', () => {
    const report = validateOwnTrajectories(structuredTrajectory(20), {
      permutations: 100, seed: 42
    });

    expect(report.sampleSize).toBe(100);
    // 确定性循环的转移熵应远低于排列零假设
    expect(report.transitionEntropy.observed).toBeLessThan(report.transitionEntropy.nullMean);
    expect(report.transitionEntropy.significant).toBe(true);
    // 轨迹精确位于 3 个原型上 → Φ=1，远超均匀零假设
    expect(report.phi.observed).toBe(1);
    expect(report.phi.significant).toBe(true);
    // 驻留结构显著（双尾：结构化序列的驻留分布与洗牌零假设显著不同，
    // 方向不限——观察态占比 60%，洗牌后 observe-observe 邻接反而更多）
    expect(report.meanDwell.significant).toBe(true);
    // 解释完整
    expect(report.interpretations.length).toBe(4);
  });

  test('结构化轨迹的转移显著性强于随机轨迹', () => {
    const structured = validateOwnTrajectories(structuredTrajectory(20), { permutations: 100, seed: 42 });
    const random = validateOwnTrajectories(randomTrajectory(100), { permutations: 100, seed: 42 });
    expect(structured.transitionEntropy.pValue).toBeLessThan(random.transitionEntropy.pValue);
    // 随机轨迹的 Φ 应远低于结构化轨迹
    expect(random.phi.observed).toBeLessThan(structured.phi.observed);
  });

  test('禁带检测字段完整且 H₄ 落在合法范围 [0,1]', () => {
    const report = validateOwnTrajectories(structuredTrajectory(20), { permutations: 100, seed: 42 });
    expect(report.h4.observed).toBeGreaterThanOrEqual(0);
    expect(report.h4.observed).toBeLessThanOrEqual(1);
    expect(typeof report.h4.inForbiddenBand).toBe('boolean');
    expect(report.h4.nullForbiddenRate).toBeGreaterThanOrEqual(0);
    expect(report.h4.nullForbiddenRate).toBeLessThanOrEqual(1);
  });

  test('可复现性：相同种子产生相同 p 值', () => {
    const traj = structuredTrajectory(20);
    const r1 = validateOwnTrajectories(traj, { permutations: 50, seed: 123 });
    const r2 = validateOwnTrajectories(traj, { permutations: 50, seed: 123 });
    expect(r1.transitionEntropy.pValue).toBe(r2.transitionEntropy.pValue);
    expect(r1.h4.pValue).toBe(r2.h4.pValue);
    expect(r1.phi.pValue).toBe(r2.phi.pValue);
  });

  test('样本不足：拒绝验证并提示', () => {
    const report = validateOwnTrajectories(structuredTrajectory(1), { permutations: 50 });
    expect(report.passed).toBe(false);
    expect(report.interpretations[0]).toContain('样本不足');
  });

  test('空轨迹：安全返回', () => {
    const report = validateOwnTrajectories([], { permutations: 50 });
    expect(report.passed).toBe(false);
    expect(report.sampleSize).toBe(0);
  });
});
