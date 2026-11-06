/**
 * 自我实证闭环 (Self-Empirical Validation)
 * ─────────────────────────────────────────────────────────────
 * P1 升级：把实证验证协议跑在系统自己的认知轨迹上，
 * 验证论文断言在本系统中是否复现，而非停留在框架层面。
 *
 * 验证内容：
 *   1. H₄ 四相结构熵 —— 论文断言真实系统 H₄ ∈ [0.54, 0.91]，
 *      禁带 [0.2, 0.3) 不被占据。本模块检验观测 H₄ 是否落入禁带，
 *      并用排列零假设检验其显著性。
 *   2. 转移二元组熵 —— 时序敏感统计量：认知转移是否有结构
 *      （排列打乱时序后结构应消失）。
 *   3. Φ 原型稳定度 —— 分布敏感统计量：轨迹是否聚集在原型附近
 *      （均匀随机零假设：状态在 19683 空间均匀分布时 Φ 应极低）。
 *   4. 平均驻留步长 —— 吸引子"粘性"的时序证据。
 *
 * 统计方法：经验双尾 p 值
 *   p = (1 + #{|null_i - nullMean| ≥ |obs - nullMean|}) / (1 + B)
 * 排列检验使用可复现的种子随机数（mulberry32），保证 CI 确定性。
 */

import { TritVector, TritVectorOps, Trit } from './trit-vector';
import { FourPhase, FourPhaseDiscoverer } from './four-phase';
import { normalizedFourPhaseEntropy } from './realization-gap';
import { PrototypeMatcher } from './prototypes';

/** 禁带默认区间（论文 Section 6.5） */
export const DEFAULT_FORBIDDEN_BAND: [number, number] = [0.2, 0.3];

/** 单项统计检验结果 */
export interface StatTest {
  observed: number;
  nullMean: number;
  nullStd: number;
  pValue: number;
  significant: boolean;
}

export interface SelfValidationOptions {
  /** 排列/重采样次数，默认 200 */
  permutations?: number;
  /** 随机种子（可复现），默认 42 */
  seed?: number;
  /** 禁带区间，默认 [0.2, 0.3) */
  forbiddenBand?: [number, number];
  /** 显著性水平 α，默认 0.05 */
  alpha?: number;
}

export interface SelfValidationReport {
  sampleSize: number;
  /** H₄ 四相结构熵（排列零假设） */
  h4: StatTest & { inForbiddenBand: boolean; nullForbiddenRate: number };
  /** 转移二元组熵（排列零假设） */
  transitionEntropy: StatTest;
  /** Φ 原型稳定度（均匀随机零假设） */
  phi: StatTest;
  /** 平均驻留步长（排列零假设） */
  meanDwell: StatTest;
  /** 综合判定：时序结构显著 且 H₄ 不在禁带 */
  passed: boolean;
  interpretations: string[];
}

/** mulberry32 种子随机数生成器 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates 洗牌（原地） */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══ 序列统计量 ═══

/** H₄：四相分布结构熵（相位依赖时序动力学，故对排列敏感） */
function h4Of(seq: TritVector[]): number {
  const discoverer = new FourPhaseDiscoverer();
  discoverer.setMaxHistory(Math.max(10, seq.length));
  const phases: FourPhase[] = seq.map(v => discoverer.analyze(v).phase);
  return normalizedFourPhaseEntropy(phases);
}

/** 转移二元组熵（bits）：H = -Σ p(i→j) log₂ p(i→j) */
function transitionEntropyOf(seq: TritVector[]): number {
  if (seq.length < 2) return 0;
  const counts = new Map<string, number>();
  let total = 0;
  for (let i = 1; i < seq.length; i++) {
    const key = `${TritVectorOps.toHexagramIndex(seq[i - 1])}→${TritVectorOps.toHexagramIndex(seq[i])}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    total++;
  }
  let h = 0;
  for (const c of counts.values()) {
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Φ 原型稳定度 */
function phiOf(seq: TritVector[]): number {
  return PrototypeMatcher.computePhi(seq);
}

/** 平均驻留步长：连续相同卦象的平均长度 */
function meanDwellOf(seq: TritVector[]): number {
  if (seq.length === 0) return 0;
  let runs = 1;
  for (let i = 1; i < seq.length; i++) {
    if (TritVectorOps.toHexagramIndex(seq[i]) !== TritVectorOps.toHexagramIndex(seq[i - 1])) {
      runs++;
    }
  }
  return seq.length / runs;
}

/** 随机三元向量（均匀零假设） */
function randomVector(rng: () => number): TritVector {
  const arr: Trit[] = [];
  for (let i = 0; i < 9; i++) {
    arr.push((Math.floor(rng() * 3) - 1) as Trit);
  }
  return TritVectorOps.fromArray(arr);
}

/** 经验双尾检验 */
function empiricalTest(
  observed: number,
  nullSamples: number[],
  alpha: number
): StatTest {
  const n = nullSamples.length;
  const nullMean = nullSamples.reduce((a, b) => a + b, 0) / n;
  const variance = nullSamples.reduce((a, b) => a + (b - nullMean) ** 2, 0) / n;
  const nullStd = Math.sqrt(variance);
  const obsDev = Math.abs(observed - nullMean);
  const exceed = nullSamples.filter(x => Math.abs(x - nullMean) >= obsDev).length;
  const pValue = (1 + exceed) / (1 + n);
  return { observed, nullMean, nullStd, pValue, significant: pValue < alpha };
}

/**
 * 在系统自身认知轨迹上运行实证验证协议
 *
 * @param history 认知轨迹（TritVector 序列，建议 ≥ 30）
 * @param opts 验证参数
 */
export function validateOwnTrajectories(
  history: TritVector[],
  opts: SelfValidationOptions = {}
): SelfValidationReport {
  const B = opts.permutations ?? 200;
  const alpha = opts.alpha ?? 0.05;
  const band = opts.forbiddenBand ?? DEFAULT_FORBIDDEN_BAND;
  const rng = mulberry32(opts.seed ?? 42);

  const interpretations: string[] = [];

  if (history.length < 10) {
    return {
      sampleSize: history.length,
      h4: { observed: 0, nullMean: 0, nullStd: 0, pValue: 1, significant: false, inForbiddenBand: false, nullForbiddenRate: 0 },
      transitionEntropy: { observed: 0, nullMean: 0, nullStd: 0, pValue: 1, significant: false },
      phi: { observed: 0, nullMean: 0, nullStd: 0, pValue: 1, significant: false },
      meanDwell: { observed: 0, nullMean: 0, nullStd: 0, pValue: 1, significant: false },
      passed: false,
      interpretations: [`样本不足（${history.length} < 10）：无法执行实证验证，请积累更多认知轨迹`]
    };
  }

  // ═══ 观测统计量 ═══
  const obsH4 = h4Of(history);
  const obsTE = transitionEntropyOf(history);
  const obsPhi = phiOf(history);
  const obsDwell = meanDwellOf(history);

  // ═══ 排列零假设（时序敏感统计量）═══
  const nullH4: number[] = [];
  const nullTE: number[] = [];
  const nullDwell: number[] = [];
  for (let b = 0; b < B; b++) {
    const shuffled = shuffle([...history], rng);
    nullH4.push(h4Of(shuffled));
    nullTE.push(transitionEntropyOf(shuffled));
    nullDwell.push(meanDwellOf(shuffled));
  }

  // ═══ 均匀随机零假设（分布敏感统计量 Φ）═══
  const nullPhi: number[] = [];
  for (let b = 0; b < B; b++) {
    const randomSeq = Array.from({ length: history.length }, () => randomVector(rng));
    nullPhi.push(phiOf(randomSeq));
  }

  // ═══ 检验 ═══
  const h4Test = empiricalTest(obsH4, nullH4, alpha);
  const teTest = empiricalTest(obsTE, nullTE, alpha);
  const phiTest = empiricalTest(obsPhi, nullPhi, alpha);
  const dwellTest = empiricalTest(obsDwell, nullDwell, alpha);

  // ═══ 禁带分析 ═══
  const inForbiddenBand = obsH4 >= band[0] && obsH4 < band[1];
  const nullForbiddenRate = nullH4.filter(h => h >= band[0] && h < band[1]).length / B;

  // ═══ 解释 ═══
  if (inForbiddenBand) {
    interpretations.push(
      `⚠️ 观测 H₄=${obsH4.toFixed(3)} 落入禁带 [${band[0]}, ${band[1]})——` +
      `与论文断言"真实系统不占禁带"矛盾，建议执行空态重置或检查输入多样性`
    );
  } else {
    interpretations.push(
      `✓ 观测 H₄=${obsH4.toFixed(3)} 未落入禁带 [${band[0]}, ${band[1]})，` +
      `与论文 Section 6.5 断言一致（零假设禁带占有率 ${(nullForbiddenRate * 100).toFixed(1)}%）`
    );
  }

  interpretations.push(
    teTest.significant
      ? `✓ 转移结构显著（H=${obsTE.toFixed(2)} bits vs 零假设 ${teTest.nullMean.toFixed(2)}±${teTest.nullStd.toFixed(2)}，p=${teTest.pValue.toFixed(4)}）——认知转移非随机`
      : `○ 转移结构不显著（p=${teTest.pValue.toFixed(4)}）——认知转移接近随机游走`
  );

  interpretations.push(
    phiTest.significant
      ? `✓ Φ 原型聚集显著（Φ=${obsPhi.toFixed(3)} vs 均匀零假设 ${phiTest.nullMean.toFixed(3)}，p=${phiTest.pValue.toFixed(4)}）——轨迹确实聚集在认知原型附近`
      : `○ Φ 原型聚集不显著（Φ=${obsPhi.toFixed(3)}，p=${phiTest.pValue.toFixed(4)}）——轨迹未表现出原型聚集`
  );

  interpretations.push(
    dwellTest.significant
      ? `✓ 驻留结构显著（平均驻留 ${obsDwell.toFixed(2)} 步，p=${dwellTest.pValue.toFixed(4)}）——存在吸引子粘性`
      : `○ 驻留结构不显著（平均驻留 ${obsDwell.toFixed(2)} 步，p=${dwellTest.pValue.toFixed(4)}）`
  );

  const passed = teTest.significant && !inForbiddenBand;

  return {
    sampleSize: history.length,
    h4: { ...h4Test, inForbiddenBand, nullForbiddenRate },
    transitionEntropy: teTest,
    phi: phiTest,
    meanDwell: dwellTest,
    passed,
    interpretations
  };
}
