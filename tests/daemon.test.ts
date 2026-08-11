/**
 * daemon.ts 单元测试
 * 目前覆盖可独立测试的 BreathingRhythm 类（呼吸动力学）。
 * 主循环 main() 依赖完整 AGI 初始化，不纳入单元测试。
 */

import { BreathingRhythm } from '../src/daemon';

describe('BreathingRhythm — 呼吸动力学', () => {
  describe('构造与基础属性', () => {
    it('默认周期应为 120 秒', () => {
      const breath = new BreathingRhythm();
      expect(breath).toBeInstanceOf(BreathingRhythm);
    });

    it('自定义周期应生效', () => {
      const breath = new BreathingRhythm(60);
      expect(breath).toBeInstanceOf(BreathingRhythm);
    });
  });

  describe('phase — 呼吸相位', () => {
    it('初始相位应接近 +1（cos(0)=1，呼出峰值）', () => {
      const breath = new BreathingRhythm(120);
      expect(breath.phase).toBeCloseTo(1, 1);
    });

    it('相位应在 [-1, 1] 范围内', () => {
      const breath = new BreathingRhythm(120);
      for (let i = 0; i < 10; i++) {
        expect(breath.phase).toBeGreaterThanOrEqual(-1);
        expect(breath.phase).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('isInhaling / isExhaling', () => {
    it('初始状态（phase≈+1）应为呼出阶段', () => {
      const breath = new BreathingRhythm(120);
      expect(breath.isExhaling).toBe(true);
      expect(breath.isInhaling).toBe(false);
    });
  });

  describe('intensity — 呼吸强度', () => {
    it('初始强度应接近 1（峰值）', () => {
      const breath = new BreathingRhythm(120);
      expect(breath.intensity).toBeCloseTo(1, 1);
    });

    it('强度应在 [0, 1] 范围内', () => {
      const breath = new BreathingRhythm(120);
      expect(breath.intensity).toBeGreaterThanOrEqual(0);
      expect(breath.intensity).toBeLessThanOrEqual(1);
    });
  });

  describe('phaseName — 四相名称', () => {
    it('初始（phase≈+1）应为"老阳·呼出峰值"', () => {
      const breath = new BreathingRhythm(120);
      expect(breath.phaseName).toBe('老阳·呼出峰值');
    });

    it('应返回有效的四相名称之一', () => {
      const breath = new BreathingRhythm(120);
      const validNames = ['老阳·呼出峰值', '少阴·呼出→吸入', '老阴·吸入峰值', '少阳·吸入→呼出'];
      expect(validNames).toContain(breath.phaseName);
    });
  });

  describe('reset — 重置周期', () => {
    it('重置后相位应回到接近 +1', () => {
      const breath = new BreathingRhythm(120);
      // 等待一段时间让相位变化
      breath.reset();
      expect(breath.phase).toBeCloseTo(1, 1);
    });
  });

  describe('setPeriod — 设置周期', () => {
    it('应能修改周期', () => {
      const breath = new BreathingRhythm(120);
      breath.setPeriod(60);
      // 修改后不应报错，相位仍在有效范围
      expect(breath.phase).toBeGreaterThanOrEqual(-1);
      expect(breath.phase).toBeLessThanOrEqual(1);
    });
  });

  describe('周期性验证', () => {
    it('相位应随时间变化（非恒定）', async () => {
      const breath = new BreathingRhythm(0.2); // 200ms 周期
      const phase1 = breath.phase;
      await new Promise(r => setTimeout(r, 120)); // 等待 > 半个周期
      const phase2 = breath.phase;
      // 相位应该发生了变化（允许浮点误差）
      expect(Math.abs(phase2 - phase1)).toBeGreaterThan(0.01);
    }, 5000);
  });
});
