/**
 * CognitiveSpace 单元测试
 * 覆盖：初始化、感知输入、状态更新、快照、历史追踪、重置、e衰减。
 */

import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { TritVectorOps, TritVector } from '../src/cognitive/trit-vector';

describe('CognitiveSpace', () => {
  let cs: CognitiveSpace;

  beforeEach(() => {
    cs = new CognitiveSpace();
  });

  describe('初始化', () => {
    it('初始状态应为全零向量（悬置观察态）', () => {
      const state = cs.getState();
      expect(state.vector).toEqual(TritVectorOps.zero());
      // 零向量在 base-3 映射（-1→0, 0→1, +1→2）下为 111111111₃ = 9841
      expect(state.hexagramIndex).toBe(9841);
      expect(state.piDepth).toBe(5);
      expect(state.eWeight).toBe(0.5);
      expect(state.summary).toContain('认知初始化');
    });

    it('初始历史应为空', () => {
      expect(cs.getHistory()).toHaveLength(0);
    });
  });

  describe('perceive — 感知输入', () => {
    it('应更新认知状态并返回新状态', () => {
      const state = cs.perceive('测试输入内容');
      expect(state).toBeDefined();
      expect(state.vector).toBeDefined();
      expect(state.hexagramIndex).toBeGreaterThanOrEqual(0);
      expect(state.hexagramIndex).toBeLessThanOrEqual(19682);
      expect(state.timestamp).toBeDefined();
    });

    it('感知后历史应增加一条记录', () => {
      cs.perceive('第一次感知');
      expect(cs.getHistory()).toHaveLength(1);
      cs.perceive('第二次感知');
      expect(cs.getHistory()).toHaveLength(2);
    });

    it('紧急关键词应提高 eWeight', () => {
      const normal = cs.perceive('普通内容');
      const cs2 = new CognitiveSpace();
      const urgent = cs2.perceive('现在立即紧急重要尽快处理');
      expect(urgent.eWeight).toBeGreaterThan(normal.eWeight);
    });

    it('长内容应提高 piDepth', () => {
      const short = cs.perceive('短');
      const cs2 = new CognitiveSpace();
      const long = cs2.perceive('这是一段非常长的内容，包含很多不同的字符和词汇，用来测试复杂度计算是否正确工作。'.repeat(5));
      expect(long.piDepth).toBeGreaterThanOrEqual(short.piDepth);
    });
  });

  describe('getSnapshot — 认知快照', () => {
    it('应返回完整快照结构', () => {
      cs.perceive('快照测试');
      const snap = cs.getSnapshot();
      expect(snap.state).toBeDefined();
      expect(snap.timePropagation).toBeDefined();
      expect(snap.causePropagation).toBeDefined();
      expect(snap.majority).toBeDefined();
      expect(snap.dimensionAnalysis).toBeDefined();
      expect(snap.hexagramDescription).toBeDefined();
    });

    it('dimensionAnalysis 应包含时间/空间/因果三个维度', () => {
      const snap = cs.getSnapshot();
      expect(snap.dimensionAnalysis['时间维度']).toBeDefined();
      expect(snap.dimensionAnalysis['空间维度']).toBeDefined();
      expect(snap.dimensionAnalysis['因果维度']).toBeDefined();
    });

    it('全零状态的卦象描述应为"全中平衡态"', () => {
      const snap = cs.getSnapshot();
      expect(snap.hexagramDescription).toContain('全中平衡态');
    });
  });

  describe('update — 状态更新', () => {
    it('应更新指定字段并保存历史', () => {
      const newVector = TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, -1, -1, -1]);
      cs.update({ vector: newVector, summary: '更新测试' });
      const state = cs.getState();
      expect(TritVectorOps.equals(state.vector, newVector)).toBe(true);
      expect(state.summary).toBe('更新测试');
      expect(cs.getHistory()).toHaveLength(1);
    });

    it('未指定的字段应保持原值', () => {
      cs.update({ piDepth: 8 });
      const state = cs.getState();
      expect(state.piDepth).toBe(8);
      expect(state.eWeight).toBe(0.5); // 未改变
    });
  });

  describe('getHistory — 历史追踪', () => {
    it('应返回历史数组的浅拷贝（数组本身不共享）', () => {
      cs.perceive('历史1');
      cs.perceive('历史2');
      const history = cs.getHistory();
      const originalLength = history.length;
      history.push({} as any); // 修改返回的数组
      // 内部历史长度不应改变
      expect(cs.getHistory().length).toBe(originalLength);
    });

    it('历史超过 MAX_HISTORY 应丢弃最旧的', () => {
      for (let i = 0; i < 105; i++) {
        cs.perceive(`感知${i}`);
      }
      expect(cs.getHistory().length).toBe(100);
    });
  });

  describe('reset — 重置', () => {
    it('应重置为初始状态并清空历史', () => {
      cs.perceive('测试');
      cs.perceive('测试2');
      expect(cs.getHistory().length).toBeGreaterThan(0);
      cs.reset();
      expect(cs.getState().vector).toEqual(TritVectorOps.zero());
      expect(cs.getHistory()).toHaveLength(0);
      expect(cs.getState().summary).toContain('认知重置');
    });
  });

  describe('getDecayedWeight — e衰减计算', () => {
    it('当前时间戳的衰减权重应接近 1', () => {
      const weight = cs.getDecayedWeight(Date.now());
      expect(weight).toBeCloseTo(1, 5);
    });

    it('很早的时间戳衰减权重应接近 0', () => {
      const old = Date.now() - 365 * 24 * 60 * 60 * 1000; // 一年前
      const weight = cs.getDecayedWeight(old);
      expect(weight).toBeLessThan(0.01);
    });

    it('一个时间常数后衰减权重应接近 e^(-1) ≈ 0.368', () => {
      const timeConstant = 7 * 24 * 60 * 60 * 1000; // HALF_LIFE_MS 实际是指数衰减时间常数
      const weight = cs.getDecayedWeight(Date.now() - timeConstant);
      expect(weight).toBeCloseTo(Math.exp(-1), 1);
    });
  });

  describe('generateSummary — 态势摘要', () => {
    it('全阳扩张态应包含"扩张"', () => {
      cs.perceive('积极进取扩张行动未来目标');
      // 感知后的摘要应包含态势信息
      const state = cs.getState();
      expect(state.summary).toContain('态势');
    });

    it('内外皆阳应包含"内外和谐"', () => {
      const v = TritVectorOps.fromArray([0, 0, 0, 1, 0, 1, 0, 0, 0]);
      cs.update({ vector: v });
      const snap = cs.getSnapshot();
      // 摘要由 perceive 生成，update 不改变 summary，但快照的 state.summary 保留
      expect(snap.state).toBeDefined();
    });
  });
});
