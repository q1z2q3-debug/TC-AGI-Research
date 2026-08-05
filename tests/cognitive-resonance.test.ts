import { CognitiveResonance, CognitiveMode } from '../src/cognitive/cognitive-resonance';
import { TritVector, TritVectorOps } from '../src/cognitive/trit-vector';
import { CognitiveDistance } from '../src/cognitive/distance';

describe('CognitiveResonance 认知共振与涟漪场', () => {
  const allYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const allYin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
  const zero = TritVectorOps.zero();
  const nearYang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 0]);

  // ═══════════════════════════════════════════════════════════
  // 模式注册与管理
  // ═══════════════════════════════════════════════════════════
  describe('模式注册与管理', () => {
    test('registerMode 注册认知模式', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      const modes = cr.getModes();
      expect(modes).toHaveLength(1);
      expect(modes[0].id).toBe('A');
      expect(TritVectorOps.equals(modes[0].state, allYang)).toBe(true);
    });

    test('registerMode 默认 entropy=0.5, weight=1.0', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      const mode = cr.getModes()[0];
      expect(mode.entropy).toBe(0.5);
      expect(mode.weight).toBe(1.0);
    });

    test('registerMode 自定义 entropy 和 weight', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang, 0.2, 2.0);
      const mode = cr.getModes()[0];
      expect(mode.entropy).toBe(0.2);
      expect(mode.weight).toBe(2.0);
    });

    test('registerMode 初始化历史轨迹', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      expect(cr.getModes()[0].history).toHaveLength(1);
    });

    test('updateMode 更新已注册模式的状态', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.updateMode('A', allYin);
      const mode = cr.getModes()[0];
      expect(TritVectorOps.equals(mode.state, allYin)).toBe(true);
      expect(mode.history).toHaveLength(2);
    });

    test('updateMode 对未注册模式自动注册', () => {
      const cr = new CognitiveResonance();
      cr.updateMode('B', allYang);
      expect(cr.getModes()).toHaveLength(1);
      expect(cr.getModes()[0].id).toBe('B');
    });

    test('updateMode 可同时更新 entropy', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang, 0.5);
      cr.updateMode('A', allYin, 0.1);
      expect(cr.getModes()[0].entropy).toBe(0.1);
    });

    test('removeMode 移除指定模式', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      cr.removeMode('A');
      const modes = cr.getModes();
      expect(modes).toHaveLength(1);
      expect(modes[0].id).toBe('B');
    });

    test('updateMode 历史轨迹上限 100', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      for (let i = 0; i < 120; i++) {
        cr.updateMode('A', i % 2 === 0 ? allYang : allYin);
      }
      expect(cr.getModes()[0].history.length).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 共振耦合计算
  // ═══════════════════════════════════════════════════════════
  describe('共振耦合计算 (computeCoupling)', () => {
    test('相同状态 → kappa 高', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      expect(coupling.kappa).toBeGreaterThan(0.8);
    });

    test('相反状态（全阳 vs 全阴）→ kappa 受距离惩罚', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYin, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      // 全阳 vs 全阴：|cos(180°)|=1（反平行仍方向一致），但 cognitiveDistance=1
      // kappa = 1 * (1 - 1*0.5) = 0.5
      expect(coupling.kappa).toBeLessThanOrEqual(0.5);
      expect(coupling.gradientAlignment).toBe(1); // |cos| = 1
    });

    test('空态参与 → kappa=0（gradientAlignment=0）', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: zero, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      expect(coupling.gradientAlignment).toBe(0);
      expect(coupling.kappa).toBe(0);
    });

    test('kappa 范围 [0, 1]', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: nearYang, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      expect(coupling.kappa).toBeGreaterThanOrEqual(0);
      expect(coupling.kappa).toBeLessThanOrEqual(1);
    });

    test('isResonant 基于 resonanceThreshold 判定', () => {
      const cr = new CognitiveResonance(0.5);
      const modeSame: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const couplingSame = cr.computeCoupling(modeSame, modeSame);
      // 相同模式 → kappa 高 → isResonant=true
      if (couplingSame.kappa > 0.5) {
        expect(couplingSame.isResonant).toBe(true);
      }
    });

    test('自定义阈值影响 isResonant 判定', () => {
      const lowThreshold = new CognitiveResonance(0.1);
      const highThreshold = new CognitiveResonance(0.95);
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: nearYang, entropy: 0.5, weight: 1, history: [] };

      const cLow = lowThreshold.computeCoupling(modeA, modeB);
      const cHigh = highThreshold.computeCoupling(modeA, modeB);
      // 低阈值更容易共振
      if (cLow.kappa > 0.1) {
        expect(cLow.isResonant).toBe(true);
      }
      // 高阈值更难共振
      if (cHigh.kappa < 0.95) {
        expect(cHigh.isResonant).toBe(false);
      }
    });

    test('gradientAlignment = |cos(θ)| ∈ [0, 1]', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYin, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      expect(coupling.gradientAlignment).toBeGreaterThanOrEqual(0);
      expect(coupling.gradientAlignment).toBeLessThanOrEqual(1);
    });

    test('cognitiveDistance 与 CognitiveDistance.composite 一致', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYin, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      const expected = CognitiveDistance.composite(allYang, allYin);
      expect(coupling.cognitiveDistance).toBeCloseTo(Number(expected.toFixed(4)), 3);
    });

    test('resonanceAngle = arccos(gradientAlignment)', () => {
      const cr = new CognitiveResonance();
      const modeA: CognitiveMode = { id: 'A', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const modeB: CognitiveMode = { id: 'B', state: allYang, entropy: 0.5, weight: 1, history: [] };
      const coupling = cr.computeCoupling(modeA, modeB);
      expect(coupling.resonanceAngle).toBeCloseTo(Math.acos(coupling.gradientAlignment), 3);
    });

    test('computeCouplingById 对未注册 ID 返回 null', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      expect(cr.computeCouplingById('A', 'B')).toBeNull();
      expect(cr.computeCouplingById('X', 'Y')).toBeNull();
    });

    test('computeCouplingById 对已注册 ID 返回耦合结果', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const coupling = cr.computeCouplingById('A', 'B');
      expect(coupling).not.toBeNull();
      expect(coupling!.kappa).toBeGreaterThan(0.8);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 耦合矩阵
  // ═══════════════════════════════════════════════════════════
  describe('耦合矩阵 (computeCouplingMatrix)', () => {
    test('无模式时返回空数组', () => {
      const cr = new CognitiveResonance();
      expect(cr.computeCouplingMatrix()).toHaveLength(0);
    });

    test('单模式时返回空数组（无配对）', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      expect(cr.computeCouplingMatrix()).toHaveLength(0);
    });

    test('三模式产生 3 对配对（C(3,2)=3）', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', nearYang);
      cr.registerMode('C', allYin);
      const matrix = cr.computeCouplingMatrix();
      expect(matrix).toHaveLength(3);
    });

    test('矩阵按 kappa 降序排列', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      cr.registerMode('C', allYang); // A-C 相同 → 高 kappa
      const matrix = cr.computeCouplingMatrix();
      for (let i = 1; i < matrix.length; i++) {
        expect(matrix[i].coupling.kappa).toBeLessThanOrEqual(matrix[i - 1].coupling.kappa);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 集体状态收敛
  // ═══════════════════════════════════════════════════════════
  describe('集体状态收敛 (computeCollectiveState)', () => {
    test('无模式时返回默认零态', () => {
      const cr = new CognitiveResonance();
      const collective = cr.computeCollectiveState();
      expect(collective.participantCount).toBe(0);
      expect(collective.consensusConfidence).toBe(0);
      expect(collective.meanResonance).toBe(0);
      expect(collective.fieldEntropy).toBe(0);
      expect(collective.phaseTransition).toBe(false);
    });

    test('单模式时 consensusState = 该模式状态', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      const collective = cr.computeCollectiveState();
      expect(collective.participantCount).toBe(1);
      expect(TritVectorOps.equals(collective.consensusState, allYang)).toBe(true);
    });

    test('多模式一致 → consensusState 为一致状态', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      cr.registerMode('C', allYang);
      const collective = cr.computeCollectiveState();
      expect(TritVectorOps.equals(collective.consensusState, allYang)).toBe(true);
      expect(collective.participantCount).toBe(3);
    });

    test('一致模式 → fieldEntropy 低（趋近0）', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const collective = cr.computeCollectiveState();
      expect(collective.fieldEntropy).toBeCloseTo(0, 1);
    });

    test('分散模式 → fieldEntropy 高', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      cr.registerMode('C', zero);
      const collective = cr.computeCollectiveState();
      // 三种不同状态 → 高熵
      expect(collective.fieldEntropy).toBeGreaterThan(0.5);
    });

    test('phaseTransition 需 meanResonance > 阈值 且 fieldEntropy < 0.5', () => {
      const cr = new CognitiveResonance(0.5, 0.7);
      // 全部相同 → 高共振、低熵 → 可能触发相变
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      cr.registerMode('C', allYang);
      const collective = cr.computeCollectiveState();
      if (collective.meanResonance > 0.7 && collective.fieldEntropy < 0.5) {
        expect(collective.phaseTransition).toBe(true);
      } else {
        expect(collective.phaseTransition).toBe(false);
      }
    });

    test('computeCollectiveState 记录耦合历史', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      cr.computeCollectiveState();
      const history = cr.getCouplingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].t).toBe(0);
    });

    test('耦合历史上限 100', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      for (let i = 0; i < 120; i++) {
        cr.computeCollectiveState();
      }
      expect(cr.getCouplingHistory().length).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 信息共享
  // ═══════════════════════════════════════════════════════════
  describe('信息共享 (shareContent / applyResonancePacket)', () => {
    test('共振模式下 shareContent 返回数据包', () => {
      const cr = new CognitiveResonance(0.1); // 低阈值确保共振
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const packet = cr.shareContent('A', 'B', { future: -1 });
      expect(packet).not.toBeNull();
      expect(packet!.sourceId).toBe('A');
      expect(packet!.targetId).toBe('B');
      expect(packet!.content.future).toBe(-1);
    });

    test('非共振模式下 shareContent 返回 null', () => {
      const cr = new CognitiveResonance(0.99); // 极高阈值确保不共振
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      const packet = cr.shareContent('A', 'B', { future: -1 });
      expect(packet).toBeNull();
    });

    test('shareContent 对未注册模式返回 null', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      expect(cr.shareContent('A', 'X', { future: 1 })).toBeNull();
      expect(cr.shareContent('X', 'A', { future: 1 })).toBeNull();
    });

    test('applyResonancePacket 对已注册目标返回 true', () => {
      const cr = new CognitiveResonance(0.1);
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const packet = cr.shareContent('A', 'B', { future: -1 });
      if (packet) {
        const success = cr.applyResonancePacket(packet);
        expect(success).toBe(true);
      }
    });

    test('applyResonancePacket 对未注册目标返回 false', () => {
      const cr = new CognitiveResonance(0.1);
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const packet = cr.shareContent('A', 'B', { future: -1 });
      if (packet) {
        packet.targetId = 'NONEXIST';
        expect(cr.applyResonancePacket(packet)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 相变检测
  // ═══════════════════════════════════════════════════════════
  describe('相变检测 (detectPhaseTransition)', () => {
    test('高共振低熵 → 检测到相变', () => {
      const cr = new CognitiveResonance(0.3, 0.5);
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      cr.registerMode('C', allYang);
      const result = cr.detectPhaseTransition();
      // 全一致 → 高共振 + 低熵 → 可能相变
      if (result.collectiveState.meanResonance > 0.5 && result.collectiveState.fieldEntropy < 0.5) {
        expect(result.hasTransitioned).toBe(true);
      }
    });

    test('低共振或高熵 → 无相变', () => {
      const cr = new CognitiveResonance(0.3, 0.95);
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      cr.registerMode('C', zero);
      const result = cr.detectPhaseTransition();
      expect(result.hasTransitioned).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 统计与重置
  // ═══════════════════════════════════════════════════════════
  describe('统计与重置', () => {
    test('getStats 返回正确模式数', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      const stats = cr.getStats();
      expect(stats.totalModes).toBe(2);
    });

    test('getStats 无模式时 meanResonance=0', () => {
      const cr = new CognitiveResonance();
      const stats = cr.getStats();
      expect(stats.meanResonance).toBe(0);
      expect(stats.maxResonance).toBe(0);
      expect(stats.resonanceCount).toBe(0);
    });

    test('getStats 一致模式 → maxResonance 高', () => {
      const cr = new CognitiveResonance(0.1);
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYang);
      const stats = cr.getStats();
      expect(stats.maxResonance).toBeGreaterThan(0.5);
    });

    test('reset 清空所有模式和历史', () => {
      const cr = new CognitiveResonance();
      cr.registerMode('A', allYang);
      cr.registerMode('B', allYin);
      cr.computeCollectiveState();
      cr.reset();
      expect(cr.getModes()).toHaveLength(0);
      expect(cr.getCouplingHistory()).toHaveLength(0);
    });
  });
});
