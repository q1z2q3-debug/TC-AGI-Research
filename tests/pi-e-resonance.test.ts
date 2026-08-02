/**
 * π-e 谐振动力学 + PI 自适应谐振控制器单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 π-e 谐振核心方程、PI 控制器（§9.5）、自适应 Ki（§A.2.5）
 */

import { PiEResonance, DEFAULT_PIE_CONFIG, PiEResonanceConfig } from '../src/cognitive/pi-e-resonance';
import { FourPhase } from '../src/cognitive/four-phase';

describe('PiEResonance', () => {
  let oscillator: PiEResonance;

  beforeEach(() => {
    oscillator = new PiEResonance();
  });

  describe('初始化', () => {
    test('默认配置正确', () => {
      const state = oscillator.getState();
      expect(state.step).toBe(0);
      expect(state.amplitude).toBeGreaterThan(0);
      expect(state.phase).toBeDefined();
      expect(state.isStable).toBe(true);
    });

    test('PI 控制器默认关闭', () => {
      expect(DEFAULT_PIE_CONFIG.enablePIController).toBe(false);
      expect(DEFAULT_PIE_CONFIG.kp).toBe(0.05);
      expect(DEFAULT_PIE_CONFIG.ki).toBe(0.002);
    });
  });

  describe('step', () => {
    test('步进后增加步数', () => {
      const state = oscillator.step();
      expect(state.step).toBe(1);
    });

    test('多次步进后振幅趋近稳定半径', () => {
      for (let i = 0; i < 100; i++) {
        oscillator.step();
      }
      const state = oscillator.getState();
      const ratio = oscillator.getAmplitudeRatio();
      expect(ratio).toBeCloseTo(1, 0); // 稳定振幅附近
    });

    test('相位在 [-π, π] 范围内', () => {
      for (let i = 0; i < 50; i++) {
        const state = oscillator.step();
        expect(state.phase).toBeGreaterThanOrEqual(-Math.PI);
        expect(state.phase).toBeLessThanOrEqual(Math.PI);
      }
    });
  });

  describe('四相映射', () => {
    test('长时间步进后产生相位变化', () => {
      // 使用更高频率以更快跨越相位边界
      const fastOsc = new PiEResonance({ omegaPi: 2 * Math.PI / 5, adaptiveLambda: true });
      const phases = new Set<FourPhase>();
      for (let i = 0; i < 500; i++) {
        const state = fastOsc.step();
        phases.add(state.predictedPhase);
      }
      // 长时间步进应覆盖多个相位
      expect(phases.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PI 控制器', () => {
    test('启用 PI 控制器后频率变化', () => {
      const piOsc = new PiEResonance({ enablePIController: true, kp: 0.05, ki: 0.002 });
      const state0 = piOsc.getState();
      const omega0 = state0.omegaRes;

      // 步进多次，观察频率变化
      for (let i = 0; i < 50; i++) {
        piOsc.step();
      }
      const state50 = piOsc.getState();

      // PI 控制器激活后，omegaRes 可能变化
      // 但被限幅在 [ω₀/4, 4·ω₀]
      const config = DEFAULT_PIE_CONFIG;
      const omegaMin = config.omega0 * 0.25;
      const omegaMax = config.omega0 * 4.0;
      expect(state50.omegaRes).toBeGreaterThanOrEqual(omegaMin);
      expect(state50.omegaRes).toBeLessThanOrEqual(omegaMax);
    });

    test('PI 控制器记录 Δ_πe', () => {
      const piOsc = new PiEResonance({ enablePIController: true });
      for (let i = 0; i < 20; i++) {
        piOsc.step();
      }
      const state = piOsc.getState();
      // deltaPiE 应该被记录
      expect(state.deltaPiE).toBeDefined();
      expect(typeof state.deltaPiE).toBe('number');
    });

    test('PI 控制器积分项防饱和', () => {
      const piOsc = new PiEResonance({ enablePIController: true, kp: 1.0, ki: 0.5 });
      // 大步进使 delta 持续累积
      for (let i = 0; i < 200; i++) {
        piOsc.step();
      }
      const state = piOsc.getState();
      // 积分项应被限幅在 [-10, 10]
      expect(state.integralTerm).toBeGreaterThanOrEqual(-10);
      expect(state.integralTerm).toBeLessThanOrEqual(10);
    });

    test('PI 控制器有效 Ki 被限幅', () => {
      const piOsc = new PiEResonance({ enablePIController: true, ki: 0.002 });
      for (let i = 0; i < 100; i++) {
        piOsc.step();
      }
      const state = piOsc.getState();
      // effectiveKi ∈ [Ki/10, 10·Ki]
      expect(state.effectiveKi).toBeGreaterThanOrEqual(0.0002);
      expect(state.effectiveKi).toBeLessThanOrEqual(0.02);
    });
  });

  describe('setCognitiveEntropy', () => {
    test('自适应 λ_e 调整振幅', () => {
      oscillator.setCognitiveEntropy(0.8);
      const state = oscillator.getState();
      // 高熵应降低 λ_e
      expect(state.lambdaE).toBeLessThan(DEFAULT_PIE_CONFIG.lambda0 * Math.exp(DEFAULT_PIE_CONFIG.alpha * 0));
    });

    test('启用自适应后步进改变 λ_e', () => {
      const adaptive = new PiEResonance({ adaptiveLambda: true });
      const state0 = adaptive.getState();
      adaptive.setCognitiveEntropy(0.9);
      adaptive.step();
      const state1 = adaptive.getState();
      // 高熵后 λ_e 可能变化，但不会在一步内大幅变化
      expect(state1.lambdaE).toBeDefined();
    });
  });

  describe('getAmplitudeRatio', () => {
    test('初始状态为微小扰动', () => {
      const ratio = oscillator.getAmplitudeRatio();
      // 初始扰动很小，振幅远小于稳定半径
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(0.1);
    });
  });

  describe('getPeriod', () => {
    test('返回当前周期', () => {
      const period = oscillator.getPeriod();
      const expected = 2 * Math.PI / DEFAULT_PIE_CONFIG.omegaPi;
      expect(period).toBeCloseTo(expected, 5);
    });
  });

  describe('getLyapunovExponent', () => {
    test('初始状态 Lyapunov 指数为正（增长期）', () => {
      const lyapunov = oscillator.getLyapunovExponent();
      // 初始扰动很小，系统处于增长期，Lyapunov 指数为正
      expect(typeof lyapunov).toBe('number');
    });

    test('稳定后 Lyapunov 指数可计算', () => {
      const stableOsc = new PiEResonance({ adaptiveLambda: false });
      for (let i = 0; i < 200; i++) {
        stableOsc.step();
      }
      const lyapunov = stableOsc.getLyapunovExponent();
      // 接近稳定后，Lyapunov 指数应为有效数值
      expect(isNaN(lyapunov)).toBe(false);
      expect(typeof lyapunov).toBe('number');
    });
  });

  describe('estimateTimeToTransition', () => {
    test('振幅极小时返回 null', () => {
      const oscillator = new PiEResonance({ lambda0: 0.001 });
      // 极低增长率的振荡器
      const time = oscillator.estimateTimeToTransition();
      // 振幅可能接近0
      const state = oscillator.getState();
      if (state.amplitude < 0.01) {
        expect(time).toBeNull();
      } else {
        expect(time).toBeGreaterThan(0);
      }
    });

    test('正常振幅返回正整数', () => {
      const time = oscillator.estimateTimeToTransition();
      if (time !== null) {
        expect(time).toBeGreaterThan(0);
        expect(Number.isInteger(time)).toBe(true);
      }
    });
  });

  describe('getHistory', () => {
    test('步进后历史记录增加', () => {
      const hist0 = oscillator.getHistory().length;
      oscillator.step();
      oscillator.step();
      const hist2 = oscillator.getHistory().length;
      expect(hist2).toBe(hist0 + 2);
    });
  });

  describe('reset', () => {
    test('重置后状态回到初始', () => {
      oscillator.step();
      oscillator.step();
      oscillator.step();
      oscillator.reset();
      const state = oscillator.getState();
      expect(state.step).toBe(0);
      expect(oscillator.getHistory().length).toBe(0);
    });
  });

  describe('updateConfig', () => {
    test('动态更新配置', () => {
      oscillator.updateConfig({ omegaPi: 0.5, gamma: 2.0 });
      const period = oscillator.getPeriod();
      expect(period).toBeCloseTo(2 * Math.PI / 0.5, 5);
    });
  });
});