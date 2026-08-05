import {
  EmpiricalValidation,
  BENCHMARK_SYSTEMS,
  ABLATION_STUDIES,
  PermutationTestResult,
  FactorAlphaResult,
  DistributionShiftResult,
} from '../src/cognitive/empirical-validation';
import { FourPhase } from '../src/cognitive/four-phase';

describe('EmpiricalValidation 实证验证框架', () => {

  // ═══════════════════════════════════════════════════════════
  // 常量与配置
  // ═══════════════════════════════════════════════════════════
  describe('常量与配置', () => {
    test('BENCHMARK_SYSTEMS 包含 11 个系统', () => {
      expect(BENCHMARK_SYSTEMS.length).toBeGreaterThanOrEqual(11);
    });

    test('每个系统有 FRED 代码和资产类别', () => {
      for (const sys of BENCHMARK_SYSTEMS) {
        expect(sys.fredCode).toBeTruthy();
        expect(sys.assetClass).toBeTruthy();
        expect(sys.observations).toBeGreaterThan(0);
      }
    });

    test('ABLATION_STUDIES 包含 4 项消融研究', () => {
      expect(ABLATION_STUDIES).toHaveLength(4);
      const ids = ABLATION_STUDIES.map(a => a.id);
      expect(ids).toContain('A1');
      expect(ids).toContain('A2');
      expect(ids).toContain('A3');
      expect(ids).toContain('A4');
    });

    test('每项消融研究有移除组件和预期下降', () => {
      for (const study of ABLATION_STUDIES) {
        expect(study.componentRemoved).toBeTruthy();
        expect(study.expectedDrop).toBeTruthy();
        expect(study.mechanism).toBeTruthy();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 排列空检验 (Permutation Test)
  // ═══════════════════════════════════════════════════════════
  describe('排列空检验 (permutationTest)', () => {
    test('标签长度不匹配时抛出错误', () => {
      const predicted = [FourPhase.OldYang, FourPhase.YoungYin];
      const actual = [FourPhase.OldYang];
      expect(() => EmpiricalValidation.permutationTest(predicted, actual, 'test')).toThrow('不匹配');
    });

    test('完美预测 → observedAccuracy=1', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'perfect', 100);
      expect(result.observedAccuracy).toBe(1);
    });

    test('pValue 在有效范围 (0, 1]', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'test', 100);
      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    });

    test('isSignificant 与 pValue <= 0.05 一致', () => {
      const labels: FourPhase[] = Array(30).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'test', 200);
      expect(result.isSignificant).toBe(result.pValue <= 0.05);
    });

    test('permutations 字段记录排列次数', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'test', 50);
      expect(result.permutations).toBe(50);
    });

    test('nullMean 和 nullStd 为有限非负数', () => {
      const labels: FourPhase[] = Array(15).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'test', 100);
      expect(result.nullMean).toBeGreaterThanOrEqual(0);
      expect(result.nullMean).toBeLessThanOrEqual(1);
      expect(result.nullStd).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.nullStd)).toBe(true);
    });

    test('systemName 正确传递', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.permutationTest(labels, labels, 'S&P 500', 50);
      expect(result.systemName).toBe('S&P 500');
    });

    test('强信号预测 → isSignificant=true（p值应很低）', () => {
      // 使用多样化标签，使排列检验能区分信号与噪声
      const predicted: FourPhase[] = [
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
        FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang,
      ];
      const result = EmpiricalValidation.permutationTest(predicted, predicted, 'strong', 500);
      // 完美预测 + 多样化标签 → p值低 → 显著
      expect(result.isSignificant).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 因子 alpha 检验 (Factor Alpha Test)
  // ═══════════════════════════════════════════════════════════
  describe('因子 alpha 检验 (factorAlphaTest)', () => {
    test('标签和收益率长度不匹配时抛出错误', () => {
      const labels: FourPhase[] = [FourPhase.OldYang, FourPhase.YoungYin];
      const returns = [0.01];
      expect(() => EmpiricalValidation.factorAlphaTest(labels, returns, 'test')).toThrow('不匹配');
    });

    test('活跃天数 < 5 → 返回零值且 isSignificant=false', () => {
      // OldYang=+1(活跃), 其余=0(观望)
      // 只有2个OldYang → activeDays=2 < 5
      const labels: FourPhase[] = [
        FourPhase.OldYang, FourPhase.YoungYin,
        FourPhase.OldYang, FourPhase.YoungYin,
        FourPhase.YoungYin, FourPhase.YoungYin,
      ];
      const returns = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06];
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      expect(result.tStat).toBe(0);
      expect(result.annualizedAlpha).toBe(0);
      expect(result.informationRatio).toBe(0);
      expect(result.isSignificant).toBe(false);
    });

    test('信号与收益正相关 → tStat > 0', () => {
      // OldYang(做多) 对应正收益
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const returns = Array(20).fill(0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      expect(result.tStat).toBeGreaterThan(0);
    });

    test('信号与收益负相关 → tStat < 0', () => {
      // OldYang(做多) 但收益为负
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const returns = Array(20).fill(-0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      expect(result.tStat).toBeLessThan(0);
    });

    test('isSignificant 与 |tStat| > 2.0 一致', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const returns = Array(20).fill(0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      expect(result.isSignificant).toBe(Math.abs(result.tStat) > 2.0);
    });

    test('systemName 正确传递', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.OldYang);
      const returns = Array(10).fill(0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'NASDAQ');
      expect(result.systemName).toBe('NASDAQ');
    });

    test('OldYin 信号（做空）+ 正收益 → 策略亏损', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYin);
      const returns = Array(20).fill(0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      // 做空×正收益 = 负策略收益
      expect(result.tStat).toBeLessThan(0);
    });

    test('YoungYin/YoungYang 信号为 0（观望）→ 不计入活跃天数', () => {
      const labels: FourPhase[] = [
        ...Array(3).fill(FourPhase.YoungYin),
        ...Array(3).fill(FourPhase.YoungYang),
        ...Array(3).fill(FourPhase.OldYang),
      ];
      const returns = Array(9).fill(0.01);
      const result = EmpiricalValidation.factorAlphaTest(labels, returns, 'test');
      // 只有3个OldYang活跃 < 5 → 零值
      expect(result.tStat).toBe(0);
      expect(result.isSignificant).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 分布偏移检验 (Distribution Shift Test)
  // ═══════════════════════════════════════════════════════════
  describe('分布偏移检验 (distributionShiftTest)', () => {
    test('分界点索引无效时抛出错误', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.OldYang);
      expect(() => EmpiricalValidation.distributionShiftTest(labels, 0, 'test')).toThrow('无效');
      expect(() => EmpiricalValidation.distributionShiftTest(labels, 10, 'test')).toThrow('无效');
      expect(() => EmpiricalValidation.distributionShiftTest(labels, -1, 'test')).toThrow('无效');
    });

    test('两段分布相同 → passed=true', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'test');
      expect(result.wassersteinDist).toBeCloseTo(0, 2);
      expect(result.passed).toBe(true);
    });

    test('两段分布不同 → wassersteinDist > 0', () => {
      const labels: FourPhase[] = [
        ...Array(10).fill(FourPhase.OldYang),
        ...Array(10).fill(FourPhase.OldYin),
      ];
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'test');
      expect(result.wassersteinDist).toBeGreaterThan(0);
    });

    test('splitPoint 字段包含分界索引', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'test');
      expect(result.splitPoint).toContain('10');
    });

    test('ksStat 和 ksPValue 在有效范围', () => {
      const labels: FourPhase[] = [
        ...Array(10).fill(FourPhase.OldYang),
        ...Array(10).fill(FourPhase.OldYin),
      ];
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'test');
      expect(result.ksStat).toBeGreaterThanOrEqual(0);
      expect(result.ksStat).toBeLessThanOrEqual(1);
      expect(result.ksPValue).toBeGreaterThanOrEqual(0);
      expect(result.ksPValue).toBeLessThanOrEqual(1);
    });

    test('systemName 正确传递', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'VIX');
      expect(result.systemName).toBe('VIX');
    });

    test('passed 判定：wasserstein < 0.10 且 ksPValue > 0.05', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.distributionShiftTest(labels, 10, 'test');
      const expectedPassed = result.wassersteinDist < 0.10 && result.ksPValue > 0.05;
      expect(result.passed).toBe(expectedPassed);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 弃权率
  // ═══════════════════════════════════════════════════════════
  describe('弃权率 (computeAbstentionRate)', () => {
    test('空数组返回 0', () => {
      expect(EmpiricalValidation.computeAbstentionRate([])).toBe(0);
    });

    test('无空态 → 弃权率 0', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.OldYang);
      expect(EmpiricalValidation.computeAbstentionRate(labels)).toBe(0);
    });

    test('全空态 → 弃权率 1', () => {
      const labels: FourPhase[] = Array(10).fill(FourPhase.Void);
      expect(EmpiricalValidation.computeAbstentionRate(labels)).toBe(1);
    });

    test('部分空态 → 正确比例', () => {
      const labels: FourPhase[] = [
        FourPhase.OldYang, FourPhase.Void, FourPhase.OldYin, FourPhase.Void,
        FourPhase.YoungYin,
      ];
      expect(EmpiricalValidation.computeAbstentionRate(labels)).toBeCloseTo(0.4, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 综合验证 (validateSystem)
  // ═══════════════════════════════════════════════════════════
  describe('综合验证 (validateSystem)', () => {
    test('返回排列检验、因子 alpha、分布偏移、弃权率', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const returns = Array(20).fill(0.01);
      const result = EmpiricalValidation.validateSystem(
        labels, labels, returns, 'test', 10
      );
      expect(result.permutation).toBeDefined();
      expect(result.factorAlpha).toBeDefined();
      expect(result.distributionShift).toBeDefined();
      expect(result.abstentionRate).toBeDefined();
    });

    test('returns=undefined → factorAlpha=null', () => {
      const labels: FourPhase[] = Array(20).fill(FourPhase.OldYang);
      const result = EmpiricalValidation.validateSystem(
        labels, labels, undefined, 'test', 10
      );
      expect(result.factorAlpha).toBeNull();
    });

    test('abstentionRate 正确计算', () => {
      const labels: FourPhase[] = [
        FourPhase.OldYang, FourPhase.Void, FourPhase.OldYang, FourPhase.Void,
      ];
      const result = EmpiricalValidation.validateSystem(
        labels, labels, undefined, 'test', 2
      );
      expect(result.abstentionRate).toBeCloseTo(0.5, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 消融研究 (runAblation)
  // ═══════════════════════════════════════════════════════════
  describe('消融研究 (runAblation)', () => {
    test('返回 4 项消融结果', () => {
      const result = EmpiricalValidation.runAblation(0.8, 0.75, 0.76, 0.77, 0.74);
      expect(result.results).toHaveLength(4);
    });

    test('按下降幅度排序（最大下降在前）', () => {
      const result = EmpiricalValidation.runAblation(0.8, 0.75, 0.76, 0.77, 0.74);
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].drop).toBeLessThanOrEqual(result.results[i - 1].drop);
      }
    });

    test('dominantComponent 是下降最大的消融', () => {
      const result = EmpiricalValidation.runAblation(0.8, 0.75, 0.76, 0.77, 0.74);
      // A4=0.74 下降最大 (0.06)
      expect(result.dominantComponent).toContain('A4');
    });

    test('ranking 包含所有 4 项消融 ID', () => {
      const result = EmpiricalValidation.runAblation(0.8, 0.75, 0.76, 0.77, 0.74);
      expect(result.ranking).toHaveLength(4);
    });

    test('percentage = drop / fullAccuracy × 100', () => {
      const result = EmpiricalValidation.runAblation(0.8, 0.75, 0.76, 0.77, 0.74);
      for (const r of result.results) {
        const expectedPct = (r.drop / 0.8) * 100;
        expect(r.percentage).toBeCloseTo(Number(expectedPct.toFixed(1)), 1);
      }
    });

    test('fullAccuracy=0 → percentage=0', () => {
      const result = EmpiricalValidation.runAblation(0, 0, 0, 0, 0);
      for (const r of result.results) {
        expect(r.percentage).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 验证摘要报告
  // ═══════════════════════════════════════════════════════════
  describe('验证摘要报告 (generateSummary)', () => {
    test('生成包含关键章节的 Markdown 报告', () => {
      const mockResult = {
        permutationTests: [{
          systemName: 'S&P 500',
          observedAccuracy: 0.75,
          nullMean: 0.25,
          nullStd: 0.1,
          pValue: 0.01,
          isSignificant: true,
          permutations: 500
        }],
        factorAlphaTests: [{
          systemName: 'S&P 500',
          tStat: 2.5,
          annualizedAlpha: 0.05,
          informationRatio: 0.8,
          isSignificant: true
        }],
        distributionShiftTests: [{
          systemName: 'S&P 500',
          wassersteinDist: 0.05,
          ksStat: 0.1,
          ksPValue: 0.5,
          splitPoint: 'index=100',
          passed: true
        }],
        totalSystems: 1,
        significantSystems: 1,
        passedShiftTests: 1,
        metricsSummary: {
          balancedRegimeDistribution: true,
          permutationSignificantCount: 1,
          shiftTestPassRate: 1,
          factorAlphaSignificantCount: 1,
          abstentionRate: 0.05
        }
      };
      const summary = EmpiricalValidation.generateSummary(mockResult);
      expect(summary).toContain('# 实证验证报告');
      expect(summary).toContain('排列空检验');
      expect(summary).toContain('因子 alpha');
      expect(summary).toContain('分布偏移');
      expect(summary).toContain('S&P 500');
      expect(summary).toContain('弃权率');
    });
  });
});
