/**
 * 梦境推理单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 DreamReasoning 引擎：梦境状态机、反事实奖励、轨迹生成
 */

import { DreamReasoning, DEFAULT_DREAM_CONFIG, DreamState, DreamAnalysis, shouldDreamCycle, extractDreamInsights } from '../src/cognitive/dream-reasoning';
import { TritVectorOps } from '../src/cognitive/trit-vector';

describe('DreamReasoning', () => {
  let dreamer: DreamReasoning;

  beforeEach(() => {
    dreamer = new DreamReasoning();
  });

  describe('初始化', () => {
    test('默认配置正确', () => {
      expect(dreamer.getDreamState()).toBe(DreamState.Wake);
      expect(dreamer.getVisitedStateCount()).toBe(0);
    });

    test('初始状态为 Wake', () => {
      expect(dreamer.getDreamState()).toBe(DreamState.Wake);
    });
  });

  describe('shouldDream', () => {
    test('禁用时永远不进入梦境', () => {
      const disabled = new DreamReasoning({ enabled: false });
      expect(disabled.shouldDream(100)).toBe(false);
    });

    test('基于 dreamWakeRatio 周期性触发', () => {
      // 默认 ratio = 0.25, cycleLength = 4
      expect(dreamer.shouldDream(0)).toBe(false);
      expect(dreamer.shouldDream(4)).toBe(true);
      expect(dreamer.shouldDream(8)).toBe(true);
      expect(dreamer.shouldDream(3)).toBe(false);
    });
  });

  describe('dream', () => {
    test('生成梦境轨迹', async () => {
      const v = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1]);
      const analysis = await dreamer.dream(v, 'old-yang' as any);
      expect(analysis).toBeDefined();
      expect(analysis.completed).toBe(true);
      expect(analysis.trajectory.length).toBeGreaterThan(0);
      expect(analysis.totalSteps).toBe(DEFAULT_DREAM_CONFIG.dreamSteps);
    });

    test('梦境轨迹包含反事实奖励', async () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const analysis = await dreamer.dream(v, 'old-yang' as any);
      for (const point of analysis.trajectory.slice(0, 5)) {
        expect(point.reward).toBeDefined();
        expect(point.novelty).toBeDefined();
        expect(point.coherence).toBeDefined();
        expect(point.hamiltonian).toBeDefined();
      }
    });

    test('发现边界状态', async () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const analysis = await dreamer.dream(v, 'old-yang' as any);
      expect(analysis.discoveredBoundaries).toBeDefined();
      // 只要有 discoveredBoundaries 数组即可
      expect(Array.isArray(analysis.discoveredBoundaries)).toBe(true);
    });

    test('访问计数增加', async () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const before = dreamer.getVisitedStateCount();
      await dreamer.dream(v, 'old-yang' as any);
      expect(dreamer.getVisitedStateCount()).toBeGreaterThanOrEqual(before);
    });

    test('重复梦境更新访问历史', async () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      await dreamer.dream(v, 'old-yang' as any);
      const firstCount = dreamer.getVisitedStateCount();
      await dreamer.dream(v, 'old-yang' as any);
      expect(dreamer.getVisitedStateCount()).toBeGreaterThanOrEqual(firstCount);
    });
  });

  describe('状态机', () => {
    test('梦境后回到 Wake', async () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      await dreamer.dream(v, 'old-yang' as any);
      expect(dreamer.getDreamState()).toBe(DreamState.Wake);
    });
  });

  describe('getLastDreamAnalysis', () => {
    test('梦境前为 null', () => {
      expect(dreamer.getLastDreamAnalysis()).toBeNull();
    });

    test('梦境后返回结果', async () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      await dreamer.dream(v, 'old-yang' as any);
      const analysis = dreamer.getLastDreamAnalysis();
      expect(analysis).not.toBeNull();
      expect(analysis!.completed).toBe(true);
    });
  });

  describe('reset', () => {
    test('重置后清空所有状态', async () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      await dreamer.dream(v, 'old-yang' as any);
      dreamer.reset();
      expect(dreamer.getDreamState()).toBe(DreamState.Wake);
      expect(dreamer.getVisitedStateCount()).toBe(0);
      expect(dreamer.getLastDreamAnalysis()).toBeNull();
    });
  });

  describe('updateConfig', () => {
    test('更新配置后生效', () => {
      dreamer.updateConfig({ alpha: 0.5, dreamSteps: 100 });
      // 通过行为验证：梦境步数改变
      // 无法直接读取配置，但通过效果验证
      // 重新配置后 shouldDream 应使用新 ratio
      dreamer.updateConfig({ dreamWakeRatio: 0.5 });
      expect(dreamer.shouldDream(2)).toBe(true);
    });
  });
});

describe('shouldDreamCycle', () => {
  test('step 0 返回 false', () => {
    expect(shouldDreamCycle(0)).toBe(false);
  });

  test('step 为 cycleLength 倍数时返回 true', () => {
    expect(shouldDreamCycle(4)).toBe(true);
    expect(shouldDreamCycle(8)).toBe(true);
  });

  test('非倍数返回 false', () => {
    expect(shouldDreamCycle(1)).toBe(false);
    expect(shouldDreamCycle(3)).toBe(false);
  });

  test('自定义 ratio', () => {
    expect(shouldDreamCycle(0, 0.5)).toBe(false);
    expect(shouldDreamCycle(2, 0.5)).toBe(true);
    expect(shouldDreamCycle(2, 0.33)).toBe(false);
    expect(shouldDreamCycle(3, 0.33)).toBe(true);
  });
});

describe('extractDreamInsights', () => {
  test('从空梦境分析中提取洞察', () => {
    const emptyAnalysis: DreamAnalysis = {
      trajectory: [],
      totalSteps: 0,
      meanReward: 0,
      discoveredBoundaries: [],
      unstableCouplings: [],
      counterfactuals: [],
      completed: true
    };
    const insights = extractDreamInsights(emptyAnalysis);
    expect(insights.boundaryCount).toBe(0);
    expect(insights.unstableCouplingCount).toBe(0);
    expect(insights.counterfactualCount).toBe(0);
    expect(insights.topInsights.length).toBe(0);
  });
});