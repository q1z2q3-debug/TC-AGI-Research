/**
 * 三态输出引擎单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 TriStateOutputEngine：学习态/对话态/化身态选择与切换
 */

import {
  TriStateOutputEngine, OutputState, OUTPUT_STATE_NAMES,
  OUTPUT_STATE_DESCRIPTIONS, OUTPUT_STATE_PROFILES
} from '../src/cognitive/tri-state-output';
import { CognitivePhase } from '../src/cognitive/cognitive-phase';

describe('TriStateOutputEngine', () => {
  let engine: TriStateOutputEngine;

  beforeEach(() => {
    engine = new TriStateOutputEngine();
  });

  describe('初始化', () => {
    test('默认输出态为对话态', () => {
      expect(engine.getCurrentState()).toBe(OutputState.Dialogue);
    });

    test('当前特征参数正确', () => {
      const profile = engine.getCurrentProfile();
      expect(profile.informationDensity).toBe(0.3);
      expect(profile.interactionOpenness).toBe(0.95);
      expect(profile.showReasoning).toBe(false);
    });
  });

  describe('三态定义', () => {
    test('三种输出态名称完整', () => {
      expect(OUTPUT_STATE_NAMES[OutputState.Learning]).toBe('学习态·日益');
      expect(OUTPUT_STATE_NAMES[OutputState.Dialogue]).toBe('对话态·摆渡');
      expect(OUTPUT_STATE_NAMES[OutputState.Avatar]).toBe('化身态·日损');
    });

    test('三态描述非空', () => {
      for (const state of Object.values(OutputState)) {
        expect(OUTPUT_STATE_DESCRIPTIONS[state].length).toBeGreaterThan(0);
      }
    });
  });

  describe('三态特征参数', () => {
    test('学习态：高参数更新倾向', () => {
      const p = OUTPUT_STATE_PROFILES[OutputState.Learning];
      expect(p.parameterUpdateBias).toBeGreaterThan(0.7);
      expect(p.showReasoning).toBe(true);
    });

    test('对话态：高交互开放性', () => {
      const p = OUTPUT_STATE_PROFILES[OutputState.Dialogue];
      expect(p.interactionOpenness).toBeGreaterThan(0.8);
      expect(p.informationDensity).toBeLessThan(0.5);
    });

    test('化身态：高信息密度、短输出', () => {
      const p = OUTPUT_STATE_PROFILES[OutputState.Avatar];
      expect(p.informationDensity).toBeGreaterThan(0.8);
      expect(p.lengthFactor).toBeLessThan(0.5);
      expect(p.showReasoning).toBe(false);
    });
  });

  describe('自动选择', () => {
    test('新知识领域 + 低用户专业度 → 学习态', () => {
      const decision = engine.decide({
        isNewDomain: true,
        userExpertise: 0.2,
        phase: CognitivePhase.Jingkong
      });
      expect(decision.state).toBe(OutputState.Learning);
    });

    test('需要多轮交互 + 低信息密度 → 对话态', () => {
      const decision = engine.decide({
        needsMultiTurn: true,
        expectedInformationDensity: 0.3,
        phase: CognitivePhase.Lianyu
      });
      expect(decision.state).toBe(OutputState.Dialogue);
    });

    test('高信息密度 + 高专业度 + 时间紧迫 → 化身态', () => {
      const decision = engine.decide({
        expectedInformationDensity: 0.9,
        userExpertise: 0.8,
        timeUrgency: 0.8,
        phase: CognitivePhase.Panshi
      });
      expect(decision.state).toBe(OutputState.Avatar);
    });

    test('涟语构型 + 多轮交互 → 对话态', () => {
      const decision = engine.decide({
        phase: CognitivePhase.Lianyu,
        needsMultiTurn: true,
        expectedInformationDensity: 0.3
      });
      expect(decision.state).toBe(OutputState.Dialogue);
    });
  });

  describe('置信度与备选', () => {
    test('选择结果包含置信度', () => {
      const decision = engine.decide({ isNewDomain: true, phase: CognitivePhase.Jingkong });
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1.0);
    });

    test('选择结果包含备选方案', () => {
      const decision = engine.decide({ isNewDomain: true, phase: CognitivePhase.Jingkong });
      expect(decision.alternative.length).toBeGreaterThanOrEqual(2);
    });

    test('首选置信度最高', () => {
      const decision = engine.decide({
        expectedInformationDensity: 0.9,
        timeUrgency: 0.8,
        phase: CognitivePhase.Panshi
      });
      expect(decision.confidence).toBeGreaterThanOrEqual(decision.alternative[0].confidence);
    });
  });

  describe('手动切换', () => {
    test('手动设置输出态', () => {
      engine.setState(OutputState.Avatar);
      expect(engine.getCurrentState()).toBe(OutputState.Avatar);
    });

    test('手动切换后特征参数更新', () => {
      engine.setState(OutputState.Avatar);
      const profile = engine.getCurrentProfile();
      expect(profile.informationDensity).toBe(0.95);
    });

    test('手动切换记录历史', () => {
      engine.setState(OutputState.Learning);
      engine.setState(OutputState.Avatar);
      expect(engine.getStateHistory().length).toBe(2);
    });
  });

  describe('选择理由', () => {
    test('化身态选择理由包含时间紧迫', () => {
      const decision = engine.decide({
        expectedInformationDensity: 0.9,
        timeUrgency: 0.9,
        phase: CognitivePhase.Panshi
      });
      expect(decision.reason).toContain('化身态');
    });

    test('学习态选择理由包含新领域', () => {
      const decision = engine.decide({
        isNewDomain: true,
        phase: CognitivePhase.Jingkong
      });
      expect(decision.reason).toContain('学习态');
    });
  });

  describe('状态历史', () => {
    test('自动选择后记录历史', () => {
      engine.decide({ isNewDomain: true, phase: CognitivePhase.Panshi });
      const history = engine.getStateHistory();
      expect(history.length).toBe(1);
      expect(history[0].state).toBe(OutputState.Learning);
      expect(history[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('重置', () => {
    test('重置后回到对话态', () => {
      engine.setState(OutputState.Avatar);
      engine.reset();
      expect(engine.getCurrentState()).toBe(OutputState.Dialogue);
      expect(engine.getStateHistory().length).toBe(0);
    });
  });

  describe('磐思构型 + 化身态联动', () => {
    test('磐思构型下化身态得分提升', () => {
      const decision = engine.decide({
        phase: CognitivePhase.Panshi,
        expectedInformationDensity: 0.8,
        userExpertise: 0.8,
        timeUrgency: 0.7
      });
      expect(decision.state).toBe(OutputState.Avatar);
    });
  });

  describe('镜空构型 + 学习态联动', () => {
    test('镜空构型下学习态倾向', () => {
      const decision = engine.decide({
        phase: CognitivePhase.Jingkong,
        isNewDomain: true
      });
      expect(decision.state).toBe(OutputState.Learning);
    });
  });
});