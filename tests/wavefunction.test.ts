/**
 * P2 认知波函数测试
 * 验证：分布构造、MID 分布推广（和态涌现）、贝叶斯更新、坍缩、距离
 */
import { CognitiveWavefunction, STATE_COUNT } from '../src/cognitive/wavefunction';
import { TritVectorOps, Trit } from '../src/cognitive/trit-vector';
import { PROTOTYPES } from '../src/cognitive/prototypes';

const expand = PROTOTYPES[0].vector;   // 全+1
const contract = PROTOTYPES[1].vector; // 全-1
const observe = PROTOTYPES[2].vector;  // 全0

describe('P2 CognitiveWavefunction 认知波函数', () => {
  test('点态：delta 分布熵为 0，mode 即自身', () => {
    const psi = CognitiveWavefunction.fromState(expand);
    expect(psi.entropy()).toBe(0);
    expect(psi.concentration()).toBe(1);
    expect(psi.effectiveSupport()).toBe(1);
    expect(psi.mode().hexagramIndex).toBe(TritVectorOps.toHexagramIndex(expand));
  });

  test('均匀分布：熵最大，有效支持态数 = 19683', () => {
    const psi = CognitiveWavefunction.uniform();
    expect(psi.normalizedEntropy()).toBeCloseTo(1, 9);
    expect(psi.effectiveSupport()).toBeCloseTo(STATE_COUNT, 0);
    expect(psi.concentration()).toBeCloseTo(1 / STATE_COUNT, 12);
  });

  test('逐维信念乘积分布：past 确定 +1，其余均匀', () => {
    const psi = CognitiveWavefunction.fromDimBeliefs({ past: [0, 0, 1] });
    const marginals = psi.dimMarginals();
    expect(marginals.past[0]).toBeCloseTo(0, 9);
    expect(marginals.past[1]).toBeCloseTo(0, 9);
    expect(marginals.past[2]).toBeCloseTo(1, 9);
    expect(marginals.present[1]).toBeCloseTo(1 / 3, 9);
    const exp = psi.expectation();
    expect(exp.past).toBeCloseTo(1, 9);
    expect(exp.present).toBeCloseTo(0, 9);
  });

  test('MID 分布推广：全阳 ⊗ 全阴 → 质量全部涌向和态（和态涌现）', () => {
    const psiA = CognitiveWavefunction.fromState(expand);
    const psiB = CognitiveWavefunction.fromState(contract);
    const mixed = psiA.midMix(psiB);

    // 每维 mid(+1, -1) = 0 → 乘积分布全部集中在全零向量
    const mode = mixed.mode();
    expect(mode.hexagramIndex).toBe(TritVectorOps.toHexagramIndex(observe));
    expect(mode.probability).toBeCloseTo(1, 9);
    expect(mixed.entropy()).toBeCloseTo(0, 9);
  });

  test('MID 同向保持：+1 ⊗ +1 → 仍为 +1', () => {
    const psi = CognitiveWavefunction.fromDimBeliefs({ past: [0, 0, 1] });
    const mixed = psi.midMix(psi);
    const m = mixed.dimMarginals().past;
    expect(m[0]).toBeCloseTo(0, 9);
    expect(m[1]).toBeCloseTo(0, 9);
    expect(m[2]).toBeCloseTo(1, 9);
  });

  test('MID 部分对立：past +1 ⊗ -1 → past 和态，future 不受影响', () => {
    const psiA = CognitiveWavefunction.fromDimBeliefs({ past: [0, 0, 1], future: [0, 0, 1] });
    const psiB = CognitiveWavefunction.fromDimBeliefs({ past: [1, 0, 0], future: [0, 0, 1] });
    const mixed = psiA.midMix(psiB);
    const m = mixed.dimMarginals();
    expect(m.past[1]).toBeCloseTo(1, 9);   // 对立 → 和态
    expect(m.future[2]).toBeCloseTo(1, 9); // 同向 → 保持
  });

  test('贝叶斯逐维更新：均匀先验 + 强证据 → 后验集中', () => {
    const prior = CognitiveWavefunction.uniform();
    const posterior = prior.bayesUpdateDim('external', [1, 0, 0]); // 只支持 external=-1
    const me = posterior.dimMarginals().external;
    expect(me[0]).toBeCloseTo(1, 9);
    expect(me[1]).toBeCloseTo(0, 9);
    expect(me[2]).toBeCloseTo(0, 9);
    expect(posterior.expectation().external).toBeCloseTo(-1, 9);
    // 其他维度不受影响
    expect(posterior.dimMarginals().cause[1]).toBeCloseTo(1 / 3, 9);
  });

  test('贝叶斯全联合更新：似然过滤后只在支持集上', () => {
    const prior = CognitiveWavefunction.uniform();
    const expandIdx = TritVectorOps.toHexagramIndex(expand);
    const posterior = prior.bayesUpdate((_v, idx) => idx === expandIdx ? 1 : 0);
    expect(posterior.mode().hexagramIndex).toBe(expandIdx);
    expect(posterior.entropy()).toBe(0);
  });

  test('坍缩：delta 分布总是坍缩到自身；信念分布采样在支持集内', () => {
    const delta = CognitiveWavefunction.fromState(observe);
    expect(delta.collapse().hexagramIndex).toBe(TritVectorOps.toHexagramIndex(observe));

    const psi = CognitiveWavefunction.fromDimBeliefs({ past: [0, 0, 1] });
    let s = 42;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 20; i++) {
      expect(psi.collapse(rng).vector.past).toBe(1 as Trit);
    }
  });

  test('JS 距离：相同分布为 0，对称，delta vs 均匀 > 0', () => {
    const a = CognitiveWavefunction.fromState(expand);
    const b = CognitiveWavefunction.fromState(expand);
    const c = CognitiveWavefunction.uniform();
    expect(a.jsDistance(b)).toBe(0);
    expect(a.jsDistance(c)).toBeCloseTo(c.jsDistance(a), 12);
    expect(a.jsDistance(c)).toBeGreaterThan(0);
  });

  test('轨迹经验分布：频次即概率', () => {
    const psi = CognitiveWavefunction.fromTrajectory([expand, expand, contract]);
    expect(psi.getProbability(expand)).toBeCloseTo(2 / 3, 9);
    expect(psi.getProbability(contract)).toBeCloseTo(1 / 3, 9);
  });

  test('topK：降序返回最可能状态', () => {
    const psi = CognitiveWavefunction.fromTrajectory([expand, expand, contract, observe]);
    const top2 = psi.topK(2);
    expect(top2.length).toBe(2);
    expect(top2[0].hexagramIndex).toBe(TritVectorOps.toHexagramIndex(expand));
    expect(top2[0].probability).toBeCloseTo(0.5, 9);
    expect(top2[1].probability).toBeCloseTo(0.25, 9);
  });

  test('凸混合 mix：α 加权叠加', () => {
    const a = CognitiveWavefunction.fromState(expand);
    const b = CognitiveWavefunction.fromState(contract);
    const m = a.mix(b, 0.75);
    expect(m.getProbability(expand)).toBeCloseTo(0.75, 9);
    expect(m.getProbability(contract)).toBeCloseTo(0.25, 9);
    // H = -0.75·log2(0.75) - 0.25·log2(0.25) ≈ 0.811 bits → 2^H ≈ 1.755
    expect(m.effectiveSupport()).toBeCloseTo(1.7548, 3);
  });

  test('fromProbabilityMap 与 toSparse 互逆（实现先验桥接）', () => {
    const map = new Map<number, number>([[100, 0.3], [200, 0.7]]);
    const psi = CognitiveWavefunction.fromProbabilityMap(map);
    expect(psi.getProbability(100)).toBeCloseTo(0.3, 9);
    const sparse = psi.toSparse();
    expect(sparse.size).toBe(2);
    expect(sparse.get(200)).toBeCloseTo(0.7, 9);
  });
});
