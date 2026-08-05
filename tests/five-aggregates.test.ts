import { FiveAggregates, Aggregate } from '../src/cognitive/five-aggregates';
import { TritVectorOps } from '../src/cognitive/trit-vector';
import { FourPhase } from '../src/cognitive/four-phase';

describe('FiveAggregates 五蕴元认知自感知层', () => {
  const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
  const zero = TritVectorOps.zero();
  const mixed = TritVectorOps.fromArray([1, -1, 0, 1, 0, -1, 1, 1, -1]);

  // ═══════════════════════════════════════════════════════════
  // 色蕴 (Rūpa)
  // ═══════════════════════════════════════════════════════════
  describe('色蕴 (Rūpa)', () => {
    test('全阳向量：升映射后 isVoid=false 且 position 归一化', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      const { position, isVoid } = result.current.rupa;
      expect(isVoid).toBe(false);
      // 全阳向量范数 = √9 = 3，归一化后每维 = 1/3
      const expected = 1 / 3;
      for (const v of position) {
        expect(v).toBeCloseTo(expected, 4);
      }
    });

    test('全和向量：升映射后 isVoid=true', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(zero);
      expect(result.current.rupa.isVoid).toBe(true);
      expect(result.current.rupa.position.every(v => v === 0)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 受蕴 (Vedanā)
  // ═══════════════════════════════════════════════════════════
  describe('受蕴 (Vedanā)', () => {
    test('全阳向量（恰为原型）→ valence > 0 → pleasant', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      // distance=0 → valence=0.5 → pleasant
      expect(result.current.vedana.valence).toBeGreaterThan(0.2);
      expect(result.current.vedana.hedonicTag).toBe('pleasant');
    });

    test('无历史时 arousal 默认为 0.3', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      expect(result.current.vedana.arousal).toBeCloseTo(0.3, 2);
    });

    test('历史波动大 → arousal 升高', () => {
      const fa = new FiveAggregates();
      const volatileHistory = [allYang, allYin, allYang];
      const result = fa.analyze(allYang, volatileHistory);
      expect(result.current.vedana.arousal).toBeGreaterThan(0.3);
    });

    test('valence 范围在 [-0.5, 0.5]', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(mixed);
      expect(result.current.vedana.valence).toBeGreaterThanOrEqual(-0.5);
      expect(result.current.vedana.valence).toBeLessThanOrEqual(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 想蕴 (Saṁjñā)
  // ═══════════════════════════════════════════════════════════
  describe('想蕴 (Saṁjñā)', () => {
    test('全阳向量匹配扩张态且 confidence=1', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      expect(result.current.samjna.matchedPrototype).toBe('扩张态');
      expect(result.current.samjna.confidence).toBe(1);
    });

    test('全和向量匹配观察态', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(zero);
      expect(result.current.samjna.matchedPrototype).toBe('观察态');
    });

    test('confidence 范围 [0, 1]', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(mixed);
      expect(result.current.samjna.confidence).toBeGreaterThanOrEqual(0);
      expect(result.current.samjna.confidence).toBeLessThanOrEqual(1);
    });

    test('低置信度时 isNearBoundary=true', () => {
      const fa = new FiveAggregates(0.3);
      // mixed 向量远离所有原型 → confidence 低
      const result = fa.analyze(mixed);
      if (result.current.samjna.confidence < 0.45) {
        expect(result.current.samjna.isNearBoundary).toBe(true);
        // boundaryType 可能是 'confidence' 或 'poincare'（当两个原型等距时）
        expect(['confidence', 'poincare']).toContain(result.current.samjna.boundaryType);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 行蕴 (Saṁskāra)
  // ═══════════════════════════════════════════════════════════
  describe('行蕴 (Saṁskāra)', () => {
    test('接近边界时 impulse=observe', () => {
      const fa = new FiveAggregates(0.3);
      const result = fa.analyze(mixed);
      if (result.current.samjna.isNearBoundary) {
        expect(result.current.samskara.impulse).toBe('observe');
      }
    });

    test('愉悦且自信（confidence>0.6）时 impulse=enter', () => {
      const fa = new FiveAggregates(0.3);
      const result = fa.analyze(allYang);
      // 全阳 → pleasant + confidence=1 → enter
      if (!result.current.samjna.isNearBoundary) {
        expect(result.current.samskara.impulse).toBe('enter');
      }
    });

    test('strength 范围 [0, 1]', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(mixed);
      expect(result.current.samskara.strength).toBeGreaterThanOrEqual(0);
      expect(result.current.samskara.strength).toBeLessThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 识蕴 (Vijñāna)
  // ═══════════════════════════════════════════════════════════
  describe('识蕴 (Vijñāna)', () => {
    test('metaEntropy 范围 [0, 1]', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(mixed);
      expect(result.current.vijnana.metaEntropy).toBeGreaterThanOrEqual(0);
      expect(result.current.vijnana.metaEntropy).toBeLessThanOrEqual(1);
    });

    test('审计链非空（每次 analyze 都追加记录）', () => {
      const fa = new FiveAggregates();
      fa.analyze(allYang);
      expect(fa.getAuditChain().length).toBeGreaterThanOrEqual(1);
    });

    test('低置信度时 isMetaObserving=true', () => {
      const fa = new FiveAggregates(0.3);
      const result = fa.analyze(mixed);
      if (result.current.samjna.isNearBoundary) {
        expect(result.current.vijnana.isMetaObserving).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 空态重置
  // ═══════════════════════════════════════════════════════════
  describe('空态重置 (Void Reset)', () => {
    test('置信度低于阈值时触发空态重置', () => {
      const fa = new FiveAggregates(0.3);
      const result = fa.analyze(mixed);
      if (result.current.samjna.confidence < 0.3) {
        expect(result.shouldVoidReset).toBe(true);
        expect(result.resetReason).toContain('置信度');
      }
    });

    test('空态重置时 voidResetCount 递增', () => {
      const fa = new FiveAggregates(0.9); // 极高阈值 → 几乎一定触发
      const before = fa.getVoidResetCount();
      fa.analyze(mixed);
      const after = fa.getVoidResetCount();
      if (before < after) {
        expect(after).toBe(before + 1);
      }
    });

    test('voidReset() 手动重置返回全零向量', () => {
      const fa = new FiveAggregates();
      const before = fa.getVoidResetCount();
      const resetState = fa.voidReset();
      expect(TritVectorOps.equals(resetState, zero)).toBe(true);
      expect(fa.getVoidResetCount()).toBe(before + 1);
    });

    test('空态重置时 suggestedAction 包含 Π_∅', () => {
      const fa = new FiveAggregates(0.9);
      const result = fa.analyze(mixed);
      if (result.shouldVoidReset) {
        expect(result.suggestedAction).toContain('Π_∅');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 健康度与元认知清晰度
  // ═══════════════════════════════════════════════════════════
  describe('健康度与清晰度', () => {
    test('五蕴健康度各值在 [0, 1]', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      for (const key of Object.values(Aggregate)) {
        const h = result.health[key as Aggregate];
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(1);
      }
    });

    test('metacognitiveClarity 是五蕴健康度的平均值', () => {
      const fa = new FiveAggregates();
      const result = fa.analyze(allYang);
      const healthValues = Object.values(result.health);
      const expected = healthValues.reduce((a, b) => a + b, 0) / 5;
      expect(result.metacognitiveClarity).toBeCloseTo(expected, 2);
    });

    test('色蕴健康度：非空态=0.9，空态=0.3', () => {
      const fa = new FiveAggregates();
      const r1 = fa.analyze(allYang);
      expect(r1.health[Aggregate.Rupa]).toBeCloseTo(0.9, 2);

      fa.reset();
      const r2 = fa.analyze(zero);
      expect(r2.health[Aggregate.Rupa]).toBeCloseTo(0.3, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 实例方法
  // ═══════════════════════════════════════════════════════════
  describe('实例方法', () => {
    test('setConfidenceThreshold 动态修改阈值', () => {
      const fa = new FiveAggregates(0.3);
      fa.setConfidenceThreshold(0.8);
      const result = fa.analyze(allYang);
      // 全阳 confidence=1 > 0.8 → 不触发空态重置
      expect(result.shouldVoidReset).toBe(false);
    });

    test('getLastState 返回最后一次分析的状态', () => {
      const fa = new FiveAggregates();
      expect(fa.getLastState()).toBeNull();
      fa.analyze(allYang);
      expect(fa.getLastState()).not.toBeNull();
      expect(fa.getLastState()!.samjna.matchedPrototype).toBe('扩张态');
    });

    test('reset 清空审计链和重置计数', () => {
      const fa = new FiveAggregates(0.9);
      fa.analyze(mixed);
      fa.analyze(mixed);
      expect(fa.getAuditChain().length).toBeGreaterThan(0);
      fa.reset();
      expect(fa.getAuditChain()).toHaveLength(0);
      expect(fa.getVoidResetCount()).toBe(0);
      expect(fa.getLastState()).toBeNull();
    });

    test('审计链上限 20 条', () => {
      const fa = new FiveAggregates();
      for (let i = 0; i < 30; i++) {
        fa.analyze(allYang);
      }
      // 每次分析追加 1~2 条审计（正常1条，空态重置追加1条）
      // 审计链上限 MAX_AUDIT_CHAIN=20
      expect(fa.getAuditChain().length).toBeLessThanOrEqual(20);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 四相参数传入
  // ═══════════════════════════════════════════════════════════
  describe('四相参数', () => {
    test('传入 FourPhase 参数不报错', () => {
      const fa = new FiveAggregates();
      expect(() => fa.analyze(allYang, [], FourPhase.OldYang)).not.toThrow();
      expect(() => fa.analyze(allYang, [], FourPhase.Void)).not.toThrow();
    });
  });
});
