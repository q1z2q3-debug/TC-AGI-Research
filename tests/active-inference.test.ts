import { ActiveInference } from '../src/cognitive/active-inference';
import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('ActiveInference', () => {
  test('infer: 全阳态应建议hold（已在原型上）', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const result = ActiveInference.infer(allYang, [], { freeEnergyThreshold: 0.1 });
    expect(result.bestAction).toBe('hold');
    expect(result.currentFreeEnergy).toBe(0);
  });

  test('infer: 全和态应建议hold', () => {
    const zero = TritVectorOps.zero();
    const result = ActiveInference.infer(zero, [], { freeEnergyThreshold: 0.1 });
    expect(result.bestAction).toBe('hold');
  });

  test('infer: 偏离原型时应建议行动', () => {
    const deviating = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, -1]);
    const result = ActiveInference.infer(deviating, [], { freeEnergyThreshold: 0.05 });
    expect(result.evaluations.length).toBeGreaterThan(0);
    // 最佳行动的自由能应低于当前自由能
    expect(result.expectedFreeEnergy).toBeLessThanOrEqual(result.currentFreeEnergy);
  });

  test('infer: 返回所有候选评估', () => {
    const v = TritVectorOps.fromArray([1, 0, -1, 0, 0, 0, 0, 0, 0]);
    const result = ActiveInference.infer(v, [], { freeEnergyThreshold: 0.01 });
    expect(result.evaluations.length).toBeGreaterThanOrEqual(6); // 6种候选行动
    // 评估按自由能升序排列
    for (let i = 1; i < result.evaluations.length; i++) {
      expect(result.evaluations[i].freeEnergy).toBeGreaterThanOrEqual(result.evaluations[i - 1].freeEnergy);
    }
  });

  test('infer: freeEnergyReduction 应为非负', () => {
    const v = TritVectorOps.fromArray([1, 0, -1, 0, 1, 0, -1, 0, 1]);
    const result = ActiveInference.infer(v, [], { freeEnergyThreshold: 0.01 });
    expect(result.freeEnergyReduction).toBeGreaterThanOrEqual(0);
  });

  test('multiStepPredict: 预测未来轨迹', () => {
    const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = ActiveInference.multiStepPredict(v, 5, { freeEnergyThreshold: 0.05 });
    expect(result.trajectory.length).toBeGreaterThanOrEqual(1);
    expect(result.trajectory.length).toBeLessThanOrEqual(6); // 初始 + 最多5步
  });

  test('multiStepPredict: 从全阳态出发应立即收敛', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const result = ActiveInference.multiStepPredict(allYang, 5, { freeEnergyThreshold: 0.1 });
    expect(result.converged).toBe(true);
    expect(result.trajectory.length).toBe(1);
  });

  test('analyzeFreeEnergyHistory: 空历史', () => {
    const result = ActiveInference.analyzeFreeEnergyHistory([]);
    expect(result.freeEnergies).toHaveLength(0);
    expect(result.trend).toBe('stable');
  });

  test('analyzeFreeEnergyHistory: 全在原型上的历史', () => {
    const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
    const history = [allYang, allYang, allYang, allYin, allYang];
    const result = ActiveInference.analyzeFreeEnergyHistory(history);
    expect(result.minFreeEnergy).toBe(0);
    expect(result.converged).toBe(true); // 最后3步有在原型上的
  });

  test('analyzeFreeEnergyHistory: 远离原型的历史趋势稳定', () => {
    const mixed = TritVectorOps.fromArray([1, -1, 0, 1, -1, 0, 1, -1, 0]);
    const history = [mixed, mixed, mixed, mixed];
    const result = ActiveInference.analyzeFreeEnergyHistory(history);
    expect(result.trend).toBe('stable');
    expect(result.avgFreeEnergy).toBeGreaterThan(0);
  });
});
