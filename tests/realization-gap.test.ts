/**
 * 实现间隙/稀疏子流形单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 RealizationGap 引擎：H₄ 结构熵、禁带检测、约束传播、稀疏子流形
 */

import { RealizationGap, DEFAULT_REALIZATION_GAP_CONFIG, ConstraintRegion, CONSTRAINT_REGION_NAMES, suggestSearchStrategy, normalizedFourPhaseEntropy } from '../src/cognitive/realization-gap';
import { TritVectorOps } from '../src/cognitive/trit-vector';
import { FourPhase } from '../src/cognitive/four-phase';

describe('RealizationGap', () => {
  let gap: RealizationGap;

  beforeEach(() => {
    gap = new RealizationGap();
  });

  describe('初始化', () => {
    test('默认配置正确', () => {
      expect(gap.getLastAnalysis()).toBeNull();
    });
  });

  describe('computeH4Entropy', () => {
    test('空序列返回 0', () => {
      expect(gap.computeH4Entropy([])).toBe(0);
    });

    test('全部 Void 返回 0', () => {
      expect(gap.computeH4Entropy([FourPhase.Void, FourPhase.Void])).toBe(0);
    });

    test('单一相位返回 0（熵最小）', () => {
      const entropy = gap.computeH4Entropy([FourPhase.OldYang, FourPhase.OldYang, FourPhase.OldYang]);
      expect(entropy).toBe(0);
    });

    test('四相均匀分布熵接近 1', () => {
      const phases = [
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang
      ];
      const entropy = gap.computeH4Entropy(phases);
      expect(entropy).toBeGreaterThan(0.9);
      expect(entropy).toBeLessThanOrEqual(1);
    });

    test('两相均匀分布熵为 0.5', () => {
      const phases = [
        FourPhase.OldYang, FourPhase.YoungYin,
        FourPhase.OldYang, FourPhase.YoungYin
      ];
      const entropy = gap.computeH4Entropy(phases);
      // 两相均匀，p=0.5 each, H₄ = -(0.5*log₄0.5 + 0.5*log₄0.5) = -log₄0.5 = 0.5
      expect(entropy).toBeCloseTo(0.5, 1);
    });
  });

  describe('isInForbiddenBand', () => {
    test('禁带 [0.2, 0.3) 内的值返回 true', () => {
      expect(gap.isInForbiddenBand(0.25)).toBe(true);
      expect(gap.isInForbiddenBand(0.2)).toBe(true);
      expect(gap.isInForbiddenBand(0.29)).toBe(true);
    });

    test('禁带外的值返回 false', () => {
      expect(gap.isInForbiddenBand(0.1)).toBe(false);
      expect(gap.isInForbiddenBand(0.3)).toBe(false);
      expect(gap.isInForbiddenBand(0.5)).toBe(false);
      expect(gap.isInForbiddenBand(0.0)).toBe(false);
    });
  });

  describe('recordVisit', () => {
    test('记录访问后更新访问计数', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      const analysis = gap.analyze();
      expect(analysis.prior.totalVisits).toBe(1);
      expect(analysis.submanifoldSize).toBe(1);
    });

    test('重复访问不增加子流形大小', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      gap.recordVisit(v, FourPhase.OldYang);
      const analysis = gap.analyze();
      expect(analysis.prior.totalVisits).toBe(2);
      expect(analysis.submanifoldSize).toBe(1); // 同一个状态
    });

    test('不同状态增加子流形大小', () => {
      const v1 = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const v2 = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v1, FourPhase.OldYang);
      gap.recordVisit(v2, FourPhase.YoungYin);
      const analysis = gap.analyze();
      expect(analysis.submanifoldSize).toBe(2);
    });
  });

  describe('markConstraint', () => {
    test('标记排除区域', () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      gap.markConstraint(v, ConstraintRegion.Excluded, '测试排除');
      const analysis = gap.analyze();
      expect(analysis.constraintSummary.excluded).toBe(1);
    });

    test('标记禁止区域', () => {
      const v = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
      gap.markConstraint(v, ConstraintRegion.Forbidden, '测试禁止');
      const analysis = gap.analyze();
      expect(analysis.constraintSummary.forbidden).toBe(1);
    });

    test('Realized 和 Unexplored 标记被忽略', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.markConstraint(v, ConstraintRegion.Realized, '测试');
      gap.markConstraint(v, ConstraintRegion.Unexplored, '测试');
      const analysis = gap.analyze();
      expect(analysis.constraintSummary.realized).toBe(0);
    });
  });

  describe('analyze', () => {
    test('无记录时返回合理默认值', () => {
      const analysis = gap.analyze();
      expect(analysis.h4Entropy).toBe(0);
      expect(analysis.submanifoldSize).toBe(0);
      expect(analysis.fullSpaceSize).toBe(19683);
      expect(analysis.sparsityRatio).toBe(0);
      expect(analysis.suggestedStrategy).toBe('explore');
    });

    test('有记录时返回完整分析', () => {
      const v1 = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const v2 = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v1, FourPhase.OldYang);
      gap.recordVisit(v2, FourPhase.YoungYin);
      gap.recordVisit(v1, FourPhase.OldYang);
      gap.recordVisit(v2, FourPhase.YoungYin);

      const analysis = gap.analyze();
      expect(analysis.submanifoldSize).toBe(2);
      expect(analysis.prior.totalVisits).toBe(4);
      expect(analysis.suggestedStrategy).toBeDefined();
    });
  });

  describe('isInSubmanifold', () => {
    test('已访问状态在子流形中', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      expect(gap.isInSubmanifold(v)).toBe(true);
    });

    test('未访问状态不在子流形中', () => {
      const v1 = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const v2 = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v1, FourPhase.OldYang);
      expect(gap.isInSubmanifold(v2)).toBe(false);
    });
  });

  describe('getPriorProbability', () => {
    test('禁用先验时返回均匀分布', () => {
      const noPrior = new RealizationGap({ enablePrior: false });
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(noPrior.getPriorProbability(v)).toBeCloseTo(1 / 19683, 5);
    });

    test('已访问状态先验概率 > 0', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      const prob = gap.getPriorProbability(v);
      expect(prob).toBeGreaterThan(0);
    });
  });

  describe('getRecentPhases', () => {
    test('返回最近相位序列', () => {
      gap.recordVisit(TritVectorOps.zero(), FourPhase.OldYang);
      gap.recordVisit(TritVectorOps.zero(), FourPhase.YoungYin);
      gap.recordVisit(TritVectorOps.zero(), FourPhase.OldYin);
      const phases = gap.getRecentPhases(3);
      expect(phases.length).toBe(3);
      expect(phases[0]).toBe(FourPhase.OldYang);
      expect(phases[2]).toBe(FourPhase.OldYin);
    });
  });

  describe('reset', () => {
    test('重置后清空所有状态', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      gap.analyze();
      gap.reset();
      expect(gap.getLastAnalysis()).toBeNull();
      const analysis = gap.analyze();
      expect(analysis.submanifoldSize).toBe(0);
    });

    test('重置后 isInSubmanifold 返回 false', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      gap.recordVisit(v, FourPhase.OldYang);
      gap.reset();
      expect(gap.isInSubmanifold(v)).toBe(false);
    });
  });

  describe('updateConfig', () => {
    test('更新配置后禁带检测使用新值', () => {
      gap.updateConfig({ forbiddenBandLow: 0.3, forbiddenBandHigh: 0.5 });
      expect(gap.isInForbiddenBand(0.4)).toBe(true);
      expect(gap.isInForbiddenBand(0.2)).toBe(false);
    });
  });

  describe('pruneLedger', () => {
    test('修剪超过上限的约束记录', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      for (let i = 0; i < 10; i++) {
        gap.recordVisit(v, FourPhase.OldYang);
      }
      gap.pruneLedger(5);
      const ledger = gap.getConstraintLedger();
      expect(ledger.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('suggestSearchStrategy', () => {
  test('所有策略都有对应的说明', () => {
    const strategies = ['explore', 'exploit', 'reset', 'focus'];
    for (const s of strategies) {
      const text = suggestSearchStrategy({
        h4Entropy: 0.5,
        inForbiddenBand: s === 'reset',
        submanifoldSize: 100,
        fullSpaceSize: 19683,
        sparsityRatio: s === 'explore' ? 0.001 : 0.1,
        prior: { totalVisits: 0, visitCounts: new Map(), probabilities: new Map(), entropy: 0 },
        constraintSummary: { realized: 0, excluded: 0, forbidden: 0, unexplored: 19683 },
        suggestedStrategy: s as any
      });
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe('normalizedFourPhaseEntropy', () => {
  test('空序列返回 0', () => {
    expect(normalizedFourPhaseEntropy([])).toBe(0);
  });

  test('同一相位返回 0', () => {
    expect(normalizedFourPhaseEntropy([FourPhase.OldYang, FourPhase.OldYang])).toBe(0);
  });

  test('Void 被排除', () => {
    const entropy = normalizedFourPhaseEntropy([FourPhase.Void, FourPhase.Void]);
    expect(entropy).toBe(0);
  });
});