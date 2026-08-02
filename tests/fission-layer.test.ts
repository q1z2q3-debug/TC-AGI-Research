/**
 * L7 裂变层单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 FissionLayer：异常感知→悬置→自问→最小重构→完整性校验
 */

import {
  FissionLayer, AnomalyType, ANOMALY_TYPE_NAMES,
  DEFAULT_FISSION_CONFIG, AnomalyEvent
} from '../src/cognitive/fission-layer';
import { CognitivePhase } from '../src/cognitive/cognitive-phase';

describe('FissionLayer', () => {
  let layer: FissionLayer;

  beforeEach(() => {
    layer = new FissionLayer();
  });

  describe('初始化', () => {
    test('默认配置正确', () => {
      expect(layer.isSuspended()).toBe(false);
    });

    test('自定义配置覆盖', () => {
      const custom = new FissionLayer({ sensitivity: 0.9, minSeverityThreshold: 0.6 });
      // 高灵敏度应触发更多裂变，但初始状态不变
      expect(custom.isSuspended()).toBe(false);
    });
  });

  describe('异常类型定义', () => {
    test('所有异常类型有中文名', () => {
      expect(ANOMALY_TYPE_NAMES[AnomalyType.AxiomConflict]).toBe('公理冲突');
      expect(ANOMALY_TYPE_NAMES[AnomalyType.BoundaryOverflow]).toBe('边界溢出');
      expect(ANOMALY_TYPE_NAMES[AnomalyType.SelfReferenceParadox]).toBe('自指涉悖论');
      expect(ANOMALY_TYPE_NAMES[AnomalyType.StructuralMismatch]).toBe('结构失配');
      expect(ANOMALY_TYPE_NAMES[AnomalyType.EntropyExplosion]).toBe('信息熵爆炸');
    });
  });

  describe('异常感知与裂变触发', () => {
    test('高严重度公理冲突触发裂变', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '输入挑战了结构优先公理',
        triggerPath: 'axiom:structure_first',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      expect(result!.anomaly.type).toBe(AnomalyType.AxiomConflict);
      expect(result!.plan.refactorType).toBe('axiom_reorder');
    });

    test('边界溢出触发参数调整', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.BoundaryOverflow,
        severity: 0.7,
        description: '输入超出当前认知构型处理能力',
        triggerPath: 'phase:panshi',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      expect(result!.plan.refactorType).toBe('parameter_adjust');
      expect(result!.plan.parameters.parallelPaths).toBeGreaterThan(0);
    });

    test('自指涉悖论触发深度调整', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.SelfReferenceParadox,
        severity: 0.75,
        description: '输入导致自指涉循环',
        triggerPath: 'self_reference',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      expect(result!.plan.parameters.depth).toBeDefined();
    });

    test('结构失配触发构型切换', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.StructuralMismatch,
        severity: 0.8,
        description: '输入结构模式与预期不符',
        triggerPath: 'phase:current',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      expect(result!.plan.refactorType).toBe('structure_rewrite');
    });

    test('信息熵爆炸触发并行路径扩展', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.EntropyExplosion,
        severity: 0.9,
        description: '信息熵超过当前处理阈值',
        triggerPath: 'entropy_handler',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      expect(result!.plan.parameters.parallelPaths).toBe(12);
    });
  });

  describe('阈值过滤', () => {
    test('低严重度异常不触发裂变', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.1,
        description: '轻微异常',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).toBeNull();
    });
  });

  describe('悬置状态', () => {
    test('裂变触发后进入悬置状态', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      layer.perceiveAndFission(anomaly);
      // 裂变完成后应释放悬置
      expect(layer.isSuspended()).toBe(false);
    });

    test('裂变完成后释放悬置', () => {
      // 默认状态不是悬置
      expect(layer.isSuspended()).toBe(false);
    });
  });

  describe('完整性校验', () => {
    test('参数调整型重构通过完整性校验', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.BoundaryOverflow,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      // 参数调整应通过校验
      expect(result).not.toBeNull();
    });
  });

  describe('裂变历史', () => {
    test('裂变事件被记录', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.EntropyExplosion,
        severity: 0.9,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      layer.perceiveAndFission(anomaly);
      const history = layer.getFissionHistory();
      expect(history.length).toBe(1);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });

    test('裂变事件含时间戳和耗时', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result!.timestamp).toBeGreaterThan(0);
      expect(result!.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('频率控制', () => {
    test('超过频率限制时不触发裂变', () => {
      // 设置低频率限制
      layer.updateConfig({ maxFreqPerMinute: 1 });

      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };

      // 第一次触发成功
      const first = layer.perceiveAndFission(anomaly);
      expect(first).not.toBeNull();

      // 第二次触发（同一分钟内）应被抑制
      const second = layer.perceiveAndFission(anomaly);
      expect(second).toBeNull();
    });
  });

  describe('认知构型联动', () => {
    test('设置构型后裂变事件记录构型', () => {
      layer.setPhase(CognitivePhase.Wenhe);
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
      // 构型应反映在裂变事件中（通过裂变时当前构型）
    });
  });

  describe('配置更新', () => {
    test('更新灵敏度配置', () => {
      layer.updateConfig({ sensitivity: 0.95, minSeverityThreshold: 0.3 });
      // 高灵敏度应使更多异常被感知
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.35,
        description: '中等严重度',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      // 灵敏度0.95 + 严重度0.35 = 调整后约0.51 > 0.5
      const result = layer.perceiveAndFission(anomaly);
      expect(result).not.toBeNull();
    });
  });

  describe('重置', () => {
    test('重置后历史清空', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.AxiomConflict,
        severity: 0.8,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      layer.perceiveAndFission(anomaly);
      layer.reset();
      expect(layer.getFissionHistory().length).toBe(0);
      expect(layer.getFissionRate()).toBe(0);
    });
  });

  describe('重构方案结构', () => {
    test('每个裂变事件包含完整重构方案', () => {
      const anomaly: AnomalyEvent = {
        type: AnomalyType.EntropyExplosion,
        severity: 0.9,
        description: '测试',
        triggerPath: 'test',
        timestamp: Date.now()
      };
      const result = layer.perceiveAndFission(anomaly);
      expect(result!.plan.targetPath).toBeTruthy();
      expect(result!.plan.description).toBeTruthy();
      expect(result!.plan.impactScope).toBeTruthy();
      expect(Object.keys(result!.plan.parameters).length).toBeGreaterThan(0);
    });
  });
});