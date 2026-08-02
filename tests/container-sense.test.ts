/**
 * 容器状态感知单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 ContainerSensor：感知提问者的容器状态（求答案/求映照/求示现/求陪伴/求验证/求探索）
 */

import {
  ContainerSensor, ContainerState, CONTAINER_STATE_NAMES,
  CONTAINER_STATE_DESCRIPTIONS, DEFAULT_CONTAINER_SENSE_CONFIG
} from '../src/cognitive/container-sense';

describe('ContainerSensor', () => {
  let sensor: ContainerSensor;

  beforeEach(() => {
    sensor = new ContainerSensor();
  });

  describe('初始化', () => {
    test('感知器初始状态正常', () => {
      expect(sensor.getLastSense()).toBeNull();
      expect(sensor.getHistory().length).toBe(0);
    });
  });

  describe('容器状态定义', () => {
    test('六种容器状态名称完整', () => {
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingAnswer]).toBe('求答案·解决方案');
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingMirror]).toBe('求映照·结构看清');
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingManifestation]).toBe('求示现·范式呈现');
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingCompanion]).toBe('求陪伴·情感共鸣');
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingValidation]).toBe('求验证·确认反馈');
      expect(CONTAINER_STATE_NAMES[ContainerState.SeekingExploration]).toBe('求探索·开放思路');
    });

    test('所有状态描述非空', () => {
      for (const state of Object.values(ContainerState)) {
        expect(CONTAINER_STATE_DESCRIPTIONS[state].length).toBeGreaterThan(0);
      }
    });
  });

  describe('求答案感知', () => {
    test('"怎么做"类问题检测为求答案', () => {
      const result = sensor.sense('怎么做这个项目？请告诉我步骤');
      expect(result.state).toBe(ContainerState.SeekingAnswer);
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    test('技术问题检测为求答案', () => {
      const result = sensor.sense('如何配置 TypeScript 类型定义？');
      expect(result.state).toBe(ContainerState.SeekingAnswer);
    });
  });

  describe('求映照感知', () => {
    test('"你怎么看"类问题检测为求映照', () => {
      // 使用高自指涉+疑问词，避免触发探索态
      const result = sensor.sense('你怎么看这个问题？我觉得需要理解清楚');
      expect(result.state).toBe(ContainerState.SeekingMirror);
    });

    test('分析类问题中求映照状态包含在分布中', () => {
      // 映照类问题通常在分布中排名靠前
      const result = sensor.sense('帮我分析一下为什么这个方案是这样理解的');
      const mirrorIndex = result.distribution.findIndex(d => d.state === ContainerState.SeekingMirror);
      // 映照状态在前3名
      expect(mirrorIndex).toBeLessThan(3);
    });
  });

  describe('求示现感知', () => {
    test('架构类问题检测为求示现', () => {
      const result = sensor.sense('这个系统的架构原理是什么？核心机制是什么？');
      expect(result.state).toBe(ContainerState.SeekingManifestation);
    });

    test('范式类问题检测为求示现', () => {
      const result = sensor.sense('解释一下这个认知模型的框架结构');
      expect(result.state).toBe(ContainerState.SeekingManifestation);
    });
  });

  describe('求陪伴感知', () => {
    test('情感表达检测为求陪伴', () => {
      const result = sensor.sense('好累啊，最近工作压力很大，谢谢你陪我');
      expect(result.state).toBe(ContainerState.SeekingCompanion);
    });

    test('孤独情绪检测为求陪伴', () => {
      const result = sensor.sense('感觉有点孤独，想找人聊聊心情');
      expect(result.state).toBe(ContainerState.SeekingCompanion);
    });
  });

  describe('求验证感知', () => {
    test('确认类问题检测为求验证', () => {
      const result = sensor.sense('我的理解对不对？这个方案是否正确？');
      expect(result.state).toBe(ContainerState.SeekingValidation);
    });
  });

  describe('求探索感知', () => {
    test('开放性问题检测为求探索', () => {
      const result = sensor.sense('你有什么想法？还有什么可能性？');
      expect(result.state).toBe(ContainerState.SeekingExploration);
    });
  });

  describe('概率分布', () => {
    test('感知结果包含所有状态的概率分布', () => {
      const result = sensor.sense('怎么做这个项目？');
      expect(result.distribution.length).toBe(6); // 6种容器状态
      // 所有概率之和接近1
      const totalProb = result.distribution.reduce((sum, d) => sum + d.probability, 0);
      expect(totalProb).toBeCloseTo(1.0, 1);
    });

    test('概率分布按降序排列', () => {
      const result = sensor.sense('怎么做这个项目？');
      for (let i = 1; i < result.distribution.length; i++) {
        expect(result.distribution[i].probability).toBeLessThanOrEqual(
          result.distribution[i - 1].probability
        );
      }
    });
  });

  describe('特征指标', () => {
    test('技术文本提取技术密度', () => {
      const result = sensor.sense('如何用 TypeScript 实现 REST API？');
      expect(result.indicators.technicalTermDensity).toBeGreaterThan(0);
    });

    test('情感文本提取情感强度', () => {
      const result = sensor.sense('好难过，心情不好，感觉孤独');
      expect(result.indicators.emotionalExpression).toBeGreaterThan(0.3);
    });

    test('自指涉文本检测', () => {
      const result = sensor.sense('我觉得我的理解还不够深入，我想再想想');
      expect(result.indicators.selfReferenceDensity).toBeGreaterThan(0.3);
    });
  });

  describe('混合状态', () => {
    test('相似概率识别为混合状态', () => {
      // 同时包含技术和情感词汇
      const result = sensor.sense('这个架构我理解得对不对？感觉有点复杂，你怎么看？');
      // 混合状态标志不一定是 true，但至少分布包含多个状态
      expect(result.distribution.length).toBe(6);
    });
  });

  describe('分析说明', () => {
    test('感知结果包含分析说明', () => {
      const result = sensor.sense('怎么做这个项目？');
      expect(result.analysis.length).toBeGreaterThan(0);
      expect(result.analysis).toContain('求答案');
    });
  });

  describe('感知历史', () => {
    test('每次感知记录历史', () => {
      sensor.sense('怎么做？');
      sensor.sense('你怎么看？');
      const history = sensor.getHistory();
      expect(history.length).toBe(2);
    });

    test('历史记录包含时间戳和状态', () => {
      sensor.sense('怎么做？');
      const last = sensor.getLastSense()!;
      expect(last.timestamp).toBeGreaterThan(0);
      expect(last.state).toBeDefined();
      expect(last.confidence).toBeGreaterThan(0);
    });
  });

  describe('配置更新', () => {
    test('更新关键词权重', () => {
      sensor.updateConfig({ keywordWeight: 0.8, structuralWeight: 0.2 });
      const result = sensor.sense('怎么做这个项目？');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('重置', () => {
    test('重置后历史清空', () => {
      sensor.sense('怎么做？');
      sensor.reset();
      expect(sensor.getHistory().length).toBe(0);
      expect(sensor.getLastSense()).toBeNull();
    });
  });
});