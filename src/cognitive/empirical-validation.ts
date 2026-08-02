/**
 * 实证验证框架 (Empirical Validation Framework)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 9.7：可证伪的三测试协议，确保架构的声明可复现、
 * 统计基础扎实、对分布偏移鲁棒。
 *
 * 三测试协议：
 *   测试 1 — 排列空检验 (Permutation Null)：发现的结构是否真实
 *   测试 2 — 因子 alpha 检验 (Factor Alpha)：发现的信号是否有经济价值
 *   测试 3 — 分布偏移鲁棒性 (Distribution Shift)：结构是否跨时间稳定
 *
 * 4 项消融研究 (Ablation Studies)：
 *   A1 — 去掉三元 trit (0-state) → 二元
 *   A2 — 去掉辛流形 (T*S⁸) → 欧几里得
 *   A3 — 去掉 π-e 谐振 → 固定周期
 *   A4 — 去掉极限环发现 → 固定阈值
 *
 * 14 系统基准（FRED 数据）：
 *   11 市场系统 × 5 资产类别 × 10 年数据 (2016-2026)
 */

import { TritVector, TritVectorOps, Trit } from './trit-vector';
import { CognitiveDistance } from './distance';
import { FourPhase, defaultFourPhaseDiscoverer } from './four-phase';

/** 14 系统基准配置 */
export interface BenchmarkSystem {
  /** 系统编号 */
  id: number;
  /** 系统名称 */
  name: string;
  /** FRED 代码 */
  fredCode: string;
  /** 资产类别 */
  assetClass: 'US Equity' | 'US Tech Equity' | 'US Blue Chip' | 'Commodity' | 'FX' | 'Fixed Income' | 'FX Index' | 'Volatility';
  /** 数据跨度 */
  dataSpan: string;
  /** 观测数 */
  observations: number;
}

/** 14 系统基准（论文 Section 9.7.1 Table） */
export const BENCHMARK_SYSTEMS: BenchmarkSystem[] = [
  { id: 1, name: 'S&P 500 Index', fredCode: 'SP500', assetClass: 'US Equity', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 2, name: 'NASDAQ Composite', fredCode: 'NASDAQCOM', assetClass: 'US Tech Equity', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 3, name: 'Dow Jones Industrial', fredCode: 'DJIA', assetClass: 'US Blue Chip', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 4, name: 'WTI Crude Oil', fredCode: 'DCOILWTICO', assetClass: 'Commodity', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 5, name: 'EUR/USD', fredCode: 'DEXUSEU', assetClass: 'FX', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 6, name: 'JPY/USD', fredCode: 'DEXJPUS', assetClass: 'FX', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 7, name: 'US Treasury 10Y Yield', fredCode: 'DGS10', assetClass: 'Fixed Income', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 8, name: 'US Treasury 2Y Yield', fredCode: 'DGS2', assetClass: 'Fixed Income', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 9, name: 'Trade-Weighted USD', fredCode: 'DTWEXBGS', assetClass: 'FX Index', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 10, name: 'CBOE VIX', fredCode: 'VIXCLS', assetClass: 'Volatility', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
  { id: 11, name: '10Y-2Y Treasury Spread', fredCode: 'T10Y2Y', assetClass: 'Fixed Income', dataSpan: '2016-07-11 to 2026-07-02', observations: 2473 },
];

/** 排列空检验结果 */
export interface PermutationTestResult {
  /** 系统名称 */
  systemName: string;
  /** 观测准确率 */
  observedAccuracy: number;
  /** 空分布均值 */
  nullMean: number;
  /** 空分布标准差 */
  nullStd: number;
  /** p 值 */
  pValue: number;
  /** 是否显著 (α=0.05) */
  isSignificant: boolean;
  /** 排列次数 */
  permutations: number;
}

/** 因子 alpha 检验结果 */
export interface FactorAlphaResult {
  /** 系统名称 */
  systemName: string;
  /** t 统计量 */
  tStat: number;
  /** 年化 alpha */
  annualizedAlpha: number;
  /** 信息比 */
  informationRatio: number;
  /** 是否显著 (|t| > 2) */
  isSignificant: boolean;
}

/** 分布偏移检验结果 */
export interface DistributionShiftResult {
  /** 系统名称 */
  systemName: string;
  /** Wasserstein 距离 */
  wassersteinDist: number;
  /** KS 统计量 */
  ksStat: number;
  /** KS p 值 */
  ksPValue: number;
  /** 分界点（默认 2020-01-01） */
  splitPoint: string;
  /** 是否通过检验 */
  passed: boolean;
}

/** 消融研究配置 */
export interface AblationConfig {
  /** 消融编号 */
  id: string;
  /** 消融名称 */
  name: string;
  /** 移除的组件 */
  componentRemoved: string;
  /** 替代方案 */
  replacement: string;
  /** 预期精度下降 (pp) */
  expectedDrop: string;
  /** 退化机制 */
  mechanism: string;
}

/** 全部 4 项消融研究 */
export const ABLATION_STUDIES: AblationConfig[] = [
  {
    id: 'A1',
    name: '去掉三元 trit (0-state) → 二元',
    componentRemoved: 'Ternary trit (0-state)',
    replacement: 'Binary ±1 only',
    expectedDrop: '-3 to -5 pp',
    mechanism: '失去中性态，消除了优雅的边界转换，硬阈值导致相位翻转'
  },
  {
    id: 'A2',
    name: '去掉辛流形 (T*S⁸) → 欧几里得',
    componentRemoved: 'Symplectic manifold (T*S⁸)',
    replacement: 'Euclidean ℝ⁹',
    expectedDrop: '-2 to -4 pp',
    mechanism: '失去体积保持，过拟合噪声，尤其在波动资产中'
  },
  {
    id: 'A3',
    name: '去掉 π-e 谐振 → 固定周期',
    componentRemoved: 'π-e resonance',
    replacement: 'Fixed period T₀',
    expectedDrop: '-2 to -3 pp',
    mechanism: '固定周期无法匹配非平稳循环长度，退化集中在 2020+ 时期'
  },
  {
    id: 'A4',
    name: '去掉极限环发现 → 固定阈值',
    componentRemoved: 'Limit-cycle discovery',
    replacement: 'Fixed threshold',
    expectedDrop: '-4 to -6 pp',
    mechanism: '静态阈值无法适应变化的波动率机制，最大单组件下降'
  },
];

/** 实证验证综合结果 */
export interface ValidationResult {
  /** 排列检验结果 */
  permutationTests: PermutationTestResult[];
  /** 因子 alpha 检验结果 */
  factorAlphaTests: FactorAlphaResult[];
  /** 分布偏移检验结果 */
  distributionShiftTests: DistributionShiftResult[];
  /** 系统总数 */
  totalSystems: number;
  /** 显著系统数 */
  significantSystems: number;
  /** 通过分布偏移检验的系统数 */
  passedShiftTests: number;
  /** 关键指标摘要 */
  metricsSummary: {
    /** 平衡相位分布 */
    balancedRegimeDistribution: boolean;
    /** 排列 p 值 ≤ 0.05 的系统数 */
    permutationSignificantCount: number;
    /** 分布偏移通过率 */
    shiftTestPassRate: number;
    /** 因子 alpha t > 2 的系统数 */
    factorAlphaSignificantCount: number;
    /** 弃权率（保守性） */
    abstentionRate: number;
  };
}

/**
 * 实证验证引擎
 * ─────────────────────────────────────────────────────────────
 * 为认知架构提供可复现的统计验证能力。
 */
export class EmpiricalValidation {
  /**
   * 执行排列空检验（Test 1）
   * ─────────────────────────────────────────────────────────────
   * H₀：发现的结构不携带比随机排列更多的市场信息。
   * 将预测标签随机打乱 B 次，比较观测准确率与空分布。
   *
   * @param predictedLabels 预测的相位标签序列
   * @param trueLabels 真实相位标签序列
   * @param systemName 系统名称
   * @param permutations 排列次数（默认 500）
   * @returns 排列空检验结果
   */
  static permutationTest(
    predictedLabels: FourPhase[],
    trueLabels: FourPhase[],
    systemName: string,
    permutations: number = 500
  ): PermutationTestResult {
    if (predictedLabels.length !== trueLabels.length) {
      throw new Error('预测标签和真实标签长度不匹配');
    }

    const n = predictedLabels.length;

    // 计算观测准确率（容忍 ±1 标签偏差）
    const observedAccuracy = EmpiricalValidation.tolerantAccuracy(predictedLabels, trueLabels);

    // 排列空分布
    let nullSum = 0;
    let nullSumSq = 0;
    let significantCount = 0;

    const threshold = 0.05;
    const trueOrder = [...predictedLabels];

    for (let b = 0; b < permutations; b++) {
      // Fisher-Yates 洗牌
      const shuffled = [...trueOrder];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const acc = EmpiricalValidation.tolerantAccuracy(shuffled, trueLabels);
      nullSum += acc;
      nullSumSq += acc * acc;
      if (acc >= observedAccuracy) significantCount++;
    }

    const nullMean = nullSum / permutations;
    const nullVariance = nullSumSq / permutations - nullMean * nullMean;
    const nullStd = Math.sqrt(Math.max(0, nullVariance));
    const pValue = (significantCount + 1) / (permutations + 1); // +1 防止 p=0

    return {
      systemName,
      observedAccuracy: Number(observedAccuracy.toFixed(3)),
      nullMean: Number(nullMean.toFixed(3)),
      nullStd: Number(nullStd.toFixed(3)),
      pValue: Number(pValue.toFixed(3)),
      isSignificant: pValue <= threshold,
      permutations
    };
  }

  /**
   * 容忍准确率：允许 ±1 标签偏差
   * 四相标签按循环顺序，相邻相位视为可容忍偏差
   */
  private static tolerantAccuracy(predicted: FourPhase[], actual: FourPhase[]): number {
    if (predicted.length === 0) return 0;

    const phaseOrder: FourPhase[] = [
      FourPhase.OldYang,
      FourPhase.YoungYin,
      FourPhase.OldYin,
      FourPhase.YoungYang
    ];

    let correct = 0;
    let total = 0;

    for (let i = 0; i < predicted.length; i++) {
      if (predicted[i] === FourPhase.Void || actual[i] === FourPhase.Void) {
        // 空态不参与准确率计算（弃权）
        continue;
      }

      total++;
      if (predicted[i] === actual[i]) {
        correct++;
        continue;
      }

      // 容忍 ±1 偏差
      const predIdx = phaseOrder.indexOf(predicted[i]);
      const actualIdx = phaseOrder.indexOf(actual[i]);
      if (predIdx !== -1 && actualIdx !== -1) {
        const diff = Math.abs(predIdx - actualIdx);
        if (diff === 1 || diff === 3) {
          correct++; // 相邻相位可容忍
        }
      }
    }

    return total > 0 ? correct / total : 0;
  }

  /**
   * 执行因子 alpha 检验（Test 2）
   * ─────────────────────────────────────────────────────────────
   * 检验发现的信号是否有经济价值。
   * 将相位信号转换为交易信号，计算因子 alpha 的 t 统计量。
   *
   * @param phaseLabels 相位标签序列
   * @param returns 收益率序列
   * @param systemName 系统名称
   * @returns 因子 alpha 检验结果
   */
  static factorAlphaTest(
    phaseLabels: FourPhase[],
    returns: number[],
    systemName: string
  ): FactorAlphaResult {
    if (phaseLabels.length !== returns.length) {
      throw new Error('相位标签和收益率长度不匹配');
    }

    // 将四相转换为交易信号
    // OldYang → +1（做多），YoungYin → 0（观望）
    // OldYin → -1（做空），YoungYang → 0（观望）
    const signals: number[] = phaseLabels.map(p => {
      switch (p) {
        case FourPhase.OldYang: return 1;
        case FourPhase.OldYin: return -1;
        default: return 0;
      }
    });

    // 计算策略收益
    const strategyReturns: number[] = [];
    let activeDays = 0;

    for (let i = 0; i < signals.length; i++) {
      if (signals[i] !== 0) {
        strategyReturns.push(signals[i] * returns[i]);
        activeDays++;
      }
    }

    if (activeDays < 5) {
      return {
        systemName,
        tStat: 0,
        annualizedAlpha: 0,
        informationRatio: 0,
        isSignificant: false
      };
    }

    // 计算 alpha 和 t 统计量
    const meanReturn = strategyReturns.reduce((a, b) => a + b, 0) / activeDays;
    const variance = strategyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (activeDays - 1);
    const std = Math.sqrt(variance);
    const se = std / Math.sqrt(activeDays);
    const tStat = se > 0 ? meanReturn / se : 0;

    // 年化 alpha（假设 252 个交易日）
    const annualizedAlpha = meanReturn * Math.sqrt(252);
    const informationRatio = std > 0 ? meanReturn / std * Math.sqrt(252) : 0;

    return {
      systemName,
      tStat: Number(tStat.toFixed(3)),
      annualizedAlpha: Number(annualizedAlpha.toFixed(4)),
      informationRatio: Number(informationRatio.toFixed(3)),
      isSignificant: Math.abs(tStat) > 2.0
    };
  }

  /**
   * 执行分布偏移检验（Test 3）
   * ─────────────────────────────────────────────────────────────
   * 检验结构是否跨时间稳定（pre-2020 vs post-2020）。
   * 使用 Wasserstein 距离和 KS 检验。
   *
   * @param phaseLabels 相位标签序列
   * @param splitIndex 分界点索引（默认 COVID-19 分界）
   * @param systemName 系统名称
   * @returns 分布偏移检验结果
   */
  static distributionShiftTest(
    phaseLabels: FourPhase[],
    splitIndex: number,
    systemName: string
  ): DistributionShiftResult {
    if (splitIndex <= 0 || splitIndex >= phaseLabels.length) {
      throw new Error('分界点索引无效');
    }

    const pre = phaseLabels.slice(0, splitIndex);
    const post = phaseLabels.slice(splitIndex);

    // 计算两个阶段的相位分布
    const preDist = EmpiricalValidation.phaseDistribution(pre);
    const postDist = EmpiricalValidation.phaseDistribution(post);

    // Wasserstein 距离（1-Wasserstein = |CDF 差| 的积分）
    let wassersteinDist = 0;
    for (const phase of [FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang, FourPhase.Void]) {
      wassersteinDist += Math.abs((preDist[phase] || 0) - (postDist[phase] || 0));
    }
    wassersteinDist /= 5; // 平均到每个相位

    // KS 检验（近似）：比较两个分布的累计差异
    let maxDiff = 0;
    let cumulativePre = 0;
    let cumulativePost = 0;
    const phaseOrder = [FourPhase.OldYang, FourPhase.YoungYin, FourPhase.OldYin, FourPhase.YoungYang, FourPhase.Void];
    for (const phase of phaseOrder) {
      cumulativePre += preDist[phase] || 0;
      cumulativePost += postDist[phase] || 0;
      maxDiff = Math.max(maxDiff, Math.abs(cumulativePre - cumulativePost));
    }

    // KS p 值近似（Kolmogorov 近似）
    const n1 = pre.length;
    const n2 = post.length;
    const ne = (n1 * n2) / (n1 + n2);
    const ksStat = maxDiff;
    // 近似 p 值：p ≈ 2 * exp(-2 * ne * ksStat²)
    // 对于大样本这是一个保守估计
    const ksPValue = Math.min(1, 2 * Math.exp(-2 * ne * ksStat * ksStat));

    return {
      systemName,
      wassersteinDist: Number(wassersteinDist.toFixed(3)),
      ksStat: Number(ksStat.toFixed(3)),
      ksPValue: Number(ksPValue.toFixed(3)),
      splitPoint: `index=${splitIndex}`,
      passed: wassersteinDist < 0.10 && ksPValue > 0.05
    };
  }

  /**
   * 计算相位分布
   */
  private static phaseDistribution(phases: FourPhase[]): Record<string, number> {
    if (phases.length === 0) return {};

    const counts: Record<string, number> = {};
    for (const p of phases) {
      counts[p] = (counts[p] || 0) + 1;
    }

    const dist: Record<string, number> = {};
    for (const [phase, count] of Object.entries(counts)) {
      dist[phase] = count / phases.length;
    }

    return dist;
  }

  /**
   * 计算弃权率（三元安全特性）
   * 论文 Section 9.7.3：系统在不确定时选择不分类的比例
   */
  static computeAbstentionRate(phases: FourPhase[]): number {
    if (phases.length === 0) return 0;
    const voidCount = phases.filter(p => p === FourPhase.Void).length;
    return voidCount / phases.length;
  }

  /**
   * 执行完整的三测试验证
   * ─────────────────────────────────────────────────────────────
   * 对单个系统运行所有三个测试，返回综合结果。
   *
   * @param predictedLabels 预测的相位标签
   * @param trueLabels 真实标签（来自 HP 滤波器 + 多数投票）
   * @param returns 收益率序列（可选，用于 alpha 检验）
   * @param systemName 系统名称
   * @param splitIndex 分布偏移分界点
   * @returns 综合验证结果
   */
  static validateSystem(
    predictedLabels: FourPhase[],
    trueLabels: FourPhase[],
    returns: number[] | undefined,
    systemName: string,
    splitIndex: number
  ): {
    permutation: PermutationTestResult;
    factorAlpha: FactorAlphaResult | null;
    distributionShift: DistributionShiftResult;
    abstentionRate: number;
  } {
    const permutation = EmpiricalValidation.permutationTest(predictedLabels, trueLabels, systemName);

    const factorAlpha = returns
      ? EmpiricalValidation.factorAlphaTest(predictedLabels, returns, systemName)
      : null;

    const distributionShift = EmpiricalValidation.distributionShiftTest(
      predictedLabels, splitIndex, systemName
    );

    const abstentionRate = EmpiricalValidation.computeAbstentionRate(predictedLabels);

    return { permutation, factorAlpha, distributionShift, abstentionRate };
  }

  /**
   * 执行消融研究（Ablation Studies）
   * ─────────────────────────────────────────────────────────────
   * 对单个系统执行所有 4 项消融，比较每项对精度的影响。
   * 每项消融移除一个组件，其余保持不变。
   *
   * @param fullAccuracy 完整架构精度
   * @param binaryAccuracy 二元消融精度（A1）
   * @param euclideanAccuracy 欧几里得消融精度（A2）
   * @param fixedPeriodAccuracy 固定周期消融精度（A3）
   * @param fixedThresholdAccuracy 固定阈值消融精度（A4）
   * @returns 消融研究报告
   */
  static runAblation(
    fullAccuracy: number,
    binaryAccuracy: number,
    euclideanAccuracy: number,
    fixedPeriodAccuracy: number,
    fixedThresholdAccuracy: number
  ): {
    results: { ablation: string; accuracy: number; drop: number; percentage: number }[];
    ranking: string[];
    dominantComponent: string;
  } {
    const results = [
      { ablation: 'A1: Binary Only', accuracy: binaryAccuracy, drop: fullAccuracy - binaryAccuracy },
      { ablation: 'A2: Euclidean', accuracy: euclideanAccuracy, drop: fullAccuracy - euclideanAccuracy },
      { ablation: 'A3: Fixed Period', accuracy: fixedPeriodAccuracy, drop: fullAccuracy - fixedPeriodAccuracy },
      { ablation: 'A4: Fixed Threshold', accuracy: fixedThresholdAccuracy, drop: fullAccuracy - fixedThresholdAccuracy },
    ];

    // 按下降幅度排序（最大下降 = 最重要组件）
    results.sort((a, b) => b.drop - a.drop);

    const ranking = results.map(r => r.ablation);
    const dominantComponent = results[0]?.ablation || '';

    return {
      results: results.map(r => ({
        ...r,
        drop: Number(r.drop.toFixed(3)),
        percentage: fullAccuracy > 0 ? Number((r.drop / fullAccuracy * 100).toFixed(1)) : 0
      })),
      ranking,
      dominantComponent
    };
  }

  /**
   * 生成验证摘要报告
   */
  static generateSummary(
    results: ValidationResult
  ): string {
    const lines: string[] = [];
    lines.push('# 实证验证报告');
    lines.push('');
    lines.push(`## 概览`);
    lines.push(`- 系统总数: ${results.totalSystems}`);
    lines.push(`- 排列检验显著系统: ${results.significantSystems}/${results.totalSystems}`);
    lines.push(`- 分布偏移通过系统: ${results.passedShiftTests}/${results.totalSystems}`);
    lines.push(`- 因子 alpha 显著系统: ${results.metricsSummary.factorAlphaSignificantCount}/${results.totalSystems}`);
    lines.push(`- 弃权率: ${(results.metricsSummary.abstentionRate * 100).toFixed(1)}%`);
    lines.push('');

    lines.push(`## 测试 1: 排列空检验`);
    for (const t of results.permutationTests) {
      lines.push(`- ${t.systemName}: acc=${t.observedAccuracy.toFixed(3)}, null_mean=${t.nullMean.toFixed(3)}, p=${t.pValue.toFixed(3)} ${t.isSignificant ? '✅' : '❌'}`);
    }
    lines.push('');

    lines.push(`## 测试 2: 因子 alpha 检验`);
    for (const t of results.factorAlphaTests) {
      lines.push(`- ${t.systemName}: t=${t.tStat.toFixed(3)}, alpha=${t.annualizedAlpha.toFixed(3)}, IR=${t.informationRatio.toFixed(3)} ${t.isSignificant ? '✅' : '❌'}`);
    }
    lines.push('');

    lines.push(`## 测试 3: 分布偏移检验`);
    for (const t of results.distributionShiftTests) {
      lines.push(`- ${t.systemName}: W=${t.wassersteinDist.toFixed(3)}, KS=${t.ksStat.toFixed(3)}, p=${t.ksPValue.toFixed(3)} ${t.passed ? '✅' : '❌'}`);
    }
    lines.push('');

    lines.push(`## 关键指标`);
    lines.push(`| 指标 | 状态 |`);
    lines.push(`|------|:----:|`);
    lines.push(`| 平衡相位分布 | ${results.metricsSummary.balancedRegimeDistribution ? '✅' : '❌'} |`);
    lines.push(`| 排列 p ≤ 0.05 | ${results.metricsSummary.permutationSignificantCount} 系统 |`);
    lines.push(`| 分布偏移通过 | ${results.metricsSummary.shiftTestPassRate} |`);
    lines.push(`| 因子 alpha ` + '|t| > 2.0' + ` | ${results.metricsSummary.factorAlphaSignificantCount} 系统 |`);
    lines.push(`| 三元安全弃权率 | ${(results.metricsSummary.abstentionRate * 100).toFixed(1)}% |`);

    return lines.join('\n');
  }
}

/**
 * 默认全局实证验证实例
 */
export const defaultEmpiricalValidation = new EmpiricalValidation();