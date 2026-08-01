/**
 * 主动推理引擎 (Active Inference Engine)
 * ─────────────────────────────────────────────────────────────
 *
 * 基于自由能最小化原理（Free Energy Principle, Friston 2010），
 * 在九维三元认知空间中实现状态转移决策。
 *
 * 核心思想：
 *   认知系统通过最小化"自由能"（预测误差）来选择行动：
 *   1. 感知：更新内部模型以更好地预测当前状态
 *   2. 行动：选择能将认知状态推向目标原型的行动
 *
 * 自由能 ≈ 预测状态与实际状态之间的认知距离
 *   - 自由能低 → 预测准确，认知稳定
 *   - 自由能高 → 预测失败，需要调整行动
 *
 * 在三元认知空间中：
 *   - "预测"= 基于当前状态和历史推断下一状态
 *   - "行动"= 选择一个认知操作（扩张/收缩/观察/转化/创生）
 *   - "自由能"= 预测状态与目标原型之间的复合距离
 *
 * 决策流程：
 *   1. 感知当前认知状态
 *   2. 生成候选行动（基于原型推荐 + 历史经验）
 *   3. 对每个候选行动，预测状态转移结果
 *   4. 计算每个预测状态的自由能（距目标原型的距离）
 *   5. 选择自由能最低的行动
 */

import { TritVector, TritVectorOps, ALL_DIMENSIONS, TritDimension, Trit } from './trit-vector';
import { CognitiveDistance } from './distance';
import { PrototypeMatcher, CognitivePrototype, PROTOTYPES } from './prototypes';
import { vectorShift, vectorMid, vectorMerge } from './trit-gates';

/**
 * 精度权重（Precision Weights）
 * ─────────────────────────────────────────────────────────────
 *
 * 精度 π_d 表示认知系统对维度 d 的预测置信度（逆方差）。
 *   π 高 → 该维度的预测误差对自由能贡献大（更"在意"这个维度）
 *   π 低 → 该维度的预测误差被衰减（更"容忍"偏差）
 *
 * 默认所有维度精度 = 1（等权）。
 * 系统可根据上下文动态调整：
 *   - 执行任务时，因果维度精度提升（更关注目标达成）
 *   - 观察学习时，时间维度精度提升（更关注趋势变化）
 *   - 危机应对时，空间外部维度精度提升（更关注环境威胁）
 */
export type PrecisionWeights = Record<TritDimension, number>;

/** 默认精度：所有维度等权 */
const DEFAULT_PRECISION: PrecisionWeights = {
  past: 1, present: 1, future: 1,
  internal: 1, medial: 1, external: 1,
  cause: 1, condition: 1, effect: 1
};

/**
 * 场景化精度预设
 */
export const PRECISION_PRESETS: Record<string, PrecisionWeights> = {
  /** 默认：等权 */
  default: { ...DEFAULT_PRECISION },
  /** 执行模式：因果维度加权 */
  execution: { past: 0.8, present: 1.2, future: 1.0, internal: 0.8, medial: 0.8, external: 0.8, cause: 1.5, condition: 1.3, effect: 1.5 },
  /** 观察模式：时间维度加权 */
  observation: { past: 1.5, present: 1.3, future: 1.2, internal: 1.0, medial: 1.0, external: 1.0, cause: 0.8, condition: 0.8, effect: 0.8 },
  /** 危机模式：外部+因果加权 */
  crisis: { past: 0.8, present: 1.2, future: 1.0, internal: 1.2, medial: 1.0, external: 1.8, cause: 1.3, condition: 1.0, effect: 1.2 },
};

/**
 * 环境模型 (Environmental Model)
 * ─────────────────────────────────────────────────────────────
 *
 * 主动推理的核心扩展：认知行动不仅影响内部状态，还影响外部环境。
 * 环境模型追踪外部世界的"认知投影"，并模拟行动对环境的影响。
 *
 * 生成模型：s_{t+1} = f(s_t, a_t) + noise
 *   - 内部状态转移：认知操作改变内部认知向量
 *   - 外部状态转移：行动对外部环境产生可预测的影响
 *   - 感知映射：外部状态部分反馈到内部认知（观测模型）
 *
 * 环境响应规则（三元逻辑）：
 *   expand → 外部环境趋向 +1（积极行动改善外部条件）
 *   contract → 外部环境趋向 -1（保守行动可能错失机会）
 *   observe → 外部环境趋向 0（观察不改变环境，但收集信息）
 *   transform → 外部环境剧烈波动（变革带来不确定性）
 *   create → 外部环境缓慢趋向 +1（创造长期改善环境）
 */
export interface EnvironmentalState {
  /** 环境的认知投影向量（仅空间+因果维度有意义） */
  externalProjection: Partial<TritVector>;
  /** 环境稳定性 0~1（1=高度可预测） */
  stability: number;
  /** 环境对行动的历史响应记录 */
  responseHistory: { action: CognitiveAction; delta: number }[];
}

export class EnvironmentalModel {
  private state: EnvironmentalState;
  private readonly MAX_RESPONSE_HISTORY = 20;

  constructor() {
    this.state = {
      externalProjection: { external: 0, medial: 0 },
      stability: 0.5,
      responseHistory: []
    };
  }

  /** 获取当前环境状态 */
  getState(): EnvironmentalState {
    return {
      externalProjection: { ...this.state.externalProjection },
      stability: this.state.stability,
      responseHistory: [...this.state.responseHistory]
    };
  }

  /**
   * 预测行动对环境的影响
   * 返回环境维度的预期变化量
   */
  predictEnvironmentalEffect(action: CognitiveAction): Partial<TritVector> {
    const effect: Partial<TritVector> = {};
    const stability = this.state.stability;

    switch (action) {
      case 'expand':
        // 扩张行动：外部条件趋向改善，但幅度受稳定性限制
        effect.external = Math.round(stability * 0.8) as Trit;  // 通常 +1 或 0
        effect.medial = Math.round(stability * 0.6) as Trit;    // 通道也改善
        break;
      case 'contract':
        // 收缩行动：外部条件可能恶化（错失机会）
        effect.external = -Math.round(stability * 0.5) as Trit;
        break;
      case 'observe':
        // 观察行动：环境不变，但信息增加
        effect.medial = 0;
        break;
      case 'transform':
        // 转化行动：环境剧烈波动
        effect.external = (Math.random() > 0.5 ? 1 : -1) as Trit;
        effect.medial = -1;
        break;
      case 'create':
        // 创生行动：长期改善环境
        effect.external = 1;
        effect.medial = 1;
        break;
      case 'hold':
        // 保持：环境自然衰减
        effect.external = 0;
        break;
    }

    return effect;
  }

  /**
   * 更新环境状态：应用行动效果并更新稳定性
   */
  update(action: CognitiveAction, actualEffect: Partial<TritVector>): void {
    // 记录响应
    const predicted = this.predictEnvironmentalEffect(action);
    const predictedDelta = predicted.external || 0;
    const actualDelta = actualEffect.external || 0;
    const predictionError = Math.abs(predictedDelta - actualDelta);

    // 更新稳定性：预测准确 → 稳定性提升，预测失败 → 稳定性下降
    this.state.stability = Math.max(0.1, Math.min(1,
      this.state.stability + (1 - predictionError) * 0.1 - predictionError * 0.15
    ));

    // 更新环境投影
    if (actualEffect.external !== undefined) {
      const current = this.state.externalProjection.external || 0;
      this.state.externalProjection.external = Math.max(-1, Math.min(1, current + actualEffect.external)) as Trit;
    }
    if (actualEffect.medial !== undefined) {
      const current = this.state.externalProjection.medial || 0;
      this.state.externalProjection.medial = Math.max(-1, Math.min(1, current + actualEffect.medial)) as Trit;
    }

    // 记录历史
    this.state.responseHistory.push({ action, delta: actualDelta });
    if (this.state.responseHistory.length > this.MAX_RESPONSE_HISTORY) {
      this.state.responseHistory.shift();
    }
  }

  /**
   * 计算环境预测误差（用于自由能计算）
   * 返回环境维度的预测误差量
   */
  computeEnvironmentalPredictionError(action: CognitiveAction): number {
    const predicted = this.predictEnvironmentalEffect(action);
    const predictedExternal = predicted.external || 0;
    const currentExternal = this.state.externalProjection.external || 0;
    // 预测误差 = 预测变化方向与当前趋势的不一致性
    const error = Math.abs(predictedExternal - currentExternal * 0.3);
    return error * (1 - this.state.stability);  // 不稳定时误差权重更大
  }

  /** 重置环境模型 */
  reset(): void {
    this.state = {
      externalProjection: { external: 0, medial: 0 },
      stability: 0.5,
      responseHistory: []
    };
  }
}

/** 认知行动类型 */
export type CognitiveAction =
  | 'expand'     // 扩张：向全阳推进
  | 'contract'   // 收缩：向全阴退守
  | 'observe'    // 观察：向全和收敛
  | 'transform'  // 转化：向转化态移动
  | 'create'     // 创生：向创生态移动
  | 'hold';      // 保持：维持当前状态

/** 候选行动评估结果 */
export interface ActionEvaluation {
  action: CognitiveAction;
  /** 预测的下一状态 */
  predictedState: TritVector;
  /** 自由能：预测状态到目标原型的距离 */
  freeEnergy: number;
  /** 预测状态到当前状态的距离（变化幅度） */
  transitionDistance: number;
  /** 行动置信度 0~1 */
  confidence: number;
  /** 选择理由 */
  reason: string;
}

/** 主动推理决策结果 */
export interface InferenceResult {
  /** 当前认知状态 */
  currentState: TritVector;
  /** 选定的最佳行动 */
  bestAction: CognitiveAction;
  /** 所有候选行动评估（按自由能升序） */
  evaluations: ActionEvaluation[];
  /** 目标原型 */
  targetPrototype: CognitivePrototype;
  /** 当前自由能 */
  currentFreeEnergy: number;
  /** 预期自由能（采取最佳行动后） */
  expectedFreeEnergy: number;
  /** 自由能改善量 */
  freeEnergyReduction: number;
  /** 决策置信度 */
  confidence: number;
}

/** 主动推理引擎选项 */
export interface ActiveInferenceOptions {
  /** 目标原型名称（默认自动选择最近的原型） */
  targetPrototypeName?: string;
  /** 自由能阈值：低于此值不再行动（已足够接近目标） */
  freeEnergyThreshold?: number;
  /** 变化幅度惩罚：变化越大，惩罚越高（鼓励最小化行动） */
  transitionPenalty?: number;
  /** 是否考虑历史经验（需要传入历史状态） */
  useHistory?: boolean;
  /** 精度权重：各维度对自由能的贡献权重（默认等权） */
  precision?: PrecisionWeights;
  /** 精度预设名称（覆盖 precision 参数） */
  precisionPreset?: keyof typeof PRECISION_PRESETS;
  /** 环境模型实例（传入后启用环境感知自由能） */
  environment?: EnvironmentalModel;
  /** 环境预测误差权重（默认 0.2，即环境误差对总自由能贡献 20%） */
  environmentWeight?: number;
}

/** 默认自由能阈值 */
const DEFAULT_FREE_ENERGY_THRESHOLD = 0.1;

export class ActiveInference {
  /**
   * 执行主动推理，选择最佳认知行动
   *
   * @param currentState  当前认知向量
   * @param history       认知历史（可选，用于预测状态转移）
   * @param options       推理选项
   * @returns  决策结果，包含最佳行动和所有候选评估
   */
  static infer(
    currentState: TritVector,
    history: TritVector[] = [],
    options: ActiveInferenceOptions = {}
  ): InferenceResult {
    const opts = {
      freeEnergyThreshold: 0.1,
      transitionPenalty: 0.1,
      useHistory: false,
      precision: DEFAULT_PRECISION,
      environment: undefined as EnvironmentalModel | undefined,
      environmentWeight: 0.2,
      ...options
    };

    // 解析精度权重：预设 > 直接传入 > 默认
    const precision = opts.precisionPreset
      ? PRECISION_PRESETS[opts.precisionPreset] || DEFAULT_PRECISION
      : opts.precision || DEFAULT_PRECISION;

    // 1. 确定目标原型
    const currentMatch = PrototypeMatcher.snapTo(currentState);
    const targetPrototype = opts.targetPrototypeName
      ? PROTOTYPES.find(p => p.name === opts.targetPrototypeName) || currentMatch.prototype
      : currentMatch.prototype;

    // 2. 当前自由能（精度加权复合距离）
    const currentFreeEnergy = ActiveInference.precisionWeightedDistance(
      currentState, targetPrototype.vector, precision
    );

    // 2b. 环境模型存在时，环境误差在候选评估中计算

    // 3. 如果当前自由能已低于阈值，选择"保持"
    if (currentFreeEnergy <= opts.freeEnergyThreshold) {
      return {
        currentState,
        bestAction: 'hold',
        evaluations: [{
          action: 'hold',
          predictedState: { ...currentState },
          freeEnergy: currentFreeEnergy,
          transitionDistance: 0,
          confidence: 0.95,
          reason: `当前自由能 ${currentFreeEnergy.toFixed(3)} ≤ 阈值 ${opts.freeEnergyThreshold}，无需行动`
        }],
        targetPrototype,
        currentFreeEnergy,
        expectedFreeEnergy: currentFreeEnergy,
        freeEnergyReduction: 0,
        confidence: 0.95
      };
    }

    // 4. 生成候选行动
    const candidates = ActiveInference.generateCandidates(currentState, history, opts);

    // 5. 评估每个候选行动（精度加权 + 环境感知）
    const evaluations = candidates.map(candidate => {
      const predictedState = ActiveInference.predictTransition(currentState, candidate, history, opts);

      // 精度加权自由能：各维度按精度权重计算预测误差
      const cognitiveFreeEnergy = ActiveInference.precisionWeightedDistance(
        predictedState, targetPrototype.vector, precision
      );
      const transitionDistance = ActiveInference.precisionWeightedDistance(
        currentState, predictedState, precision
      );

      // 环境预测误差
      let envFreeEnergy = 0;
      if (opts.environment) {
        envFreeEnergy = opts.environment.computeEnvironmentalPredictionError(candidate);
      }

      // 总自由能 = 精度加权认知距离 + 变化幅度惩罚 + 环境预测误差
      const totalFreeEnergy = cognitiveFreeEnergy
        + transitionDistance * opts.transitionPenalty
        + envFreeEnergy * opts.environmentWeight;

      return {
        action: candidate,
        predictedState,
        freeEnergy: totalFreeEnergy,
        transitionDistance,
        confidence: ActiveInference.computeConfidence(currentState, predictedState, targetPrototype, cognitiveFreeEnergy),
        reason: ActiveInference.explainAction(candidate, totalFreeEnergy, transitionDistance, targetPrototype,
          envFreeEnergy > 0 ? `，环境误差=${envFreeEnergy.toFixed(3)}` : '')
      };
    });

    // 6. 选择自由能最低的行动
    evaluations.sort((a, b) => a.freeEnergy - b.freeEnergy);
    const best = evaluations[0];

    // 7. 如果有环境模型，更新环境状态
    if (opts.environment) {
      const predictedEffect = opts.environment.predictEnvironmentalEffect(best.action);
      opts.environment.update(best.action, predictedEffect);
    }

    return {
      currentState,
      bestAction: best.action,
      evaluations,
      targetPrototype,
      currentFreeEnergy,
      expectedFreeEnergy: best.freeEnergy,
      freeEnergyReduction: currentFreeEnergy - best.freeEnergy,
      confidence: best.confidence
    };
  }

  /**
   * 精度加权距离：各维度按精度权重计算复合距离
   *
   * F = Σ_d  π_d · |s_d - t_d|  /  Σ_d π_d
   *
   * 精度高的维度对距离贡献更大，精度低的维度被衰减。
   * 这使认知系统能"聚焦"于当前最关键的维度。
   */
  private static precisionWeightedDistance(
    source: TritVector,
    target: TritVector,
    precision: PrecisionWeights
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const d of ALL_DIMENSIONS) {
      const w = precision[d] || 1;
      const diff = Math.abs(source[d] - target[d]);
      weightedSum += w * diff;
      totalWeight += w;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 生成候选行动列表
   *
   * 返回所有六种认知行动作为候选。
   * 原型推荐在评估阶段自然会产生更低的自由能，无需在此预先排序。
   */
  private static generateCandidates(
    currentState: TritVector,
    history: TritVector[],
    opts: ActiveInferenceOptions
  ): CognitiveAction[] {
    return ['expand', 'contract', 'observe', 'transform', 'create', 'hold'];
  }

  /**
   * 预测状态转移：给定当前状态和行动，预测下一状态
   *
   * 每种行动对应一种认知操作：
   *   expand   — 向全阳原型方向移位
   *   contract — 向全阴原型方向移位
   *   observe  — 向全和原型方向移位
   *   transform — 向转化态原型方向移位
   *   create   — 向创生态原型方向移位
   *   hold     — 保持当前状态
   */
  private static predictTransition(
    currentState: TritVector,
    action: CognitiveAction,
    history: TritVector[],
    opts: ActiveInferenceOptions
  ): TritVector {
    if (action === 'hold') {
      return { ...currentState };
    }

    // 找到行动对应的目标原型向量
    const targetProto = PROTOTYPES.find(p => p.actionHint === action);
    if (!targetProto) {
      return { ...currentState };
    }

    // 计算移位向量：目标原型 - 当前状态，然后裁剪到 [-1, 0, 1]
    const shiftVector = {} as TritVector;
    for (const d of ALL_DIMENSIONS) {
      const diff = targetProto.vector[d] - currentState[d];
      // 移位幅度：向目标方向移动一步
      if (diff > 0) shiftVector[d] = 1;
      else if (diff < 0) shiftVector[d] = -1;
      else shiftVector[d] = 0;
    }

    // 应用移位
    let predicted = vectorShift(currentState, shiftVector);

    // 如果有历史经验，融合历史趋势
    if (opts.useHistory && history.length >= 2) {
      // 计算历史趋势：最近两个状态的差
      const recent = history[history.length - 1];
      const before = history[history.length - 2];
      const trend = {} as TritVector;
      for (const d of ALL_DIMENSIONS) {
        const diff = recent[d] - before[d];
        if (diff > 0) trend[d] = 1;
        else if (diff < 0) trend[d] = -1;
        else trend[d] = 0;
      }
      // 融合：行动预测 70% + 历史趋势 30%
      predicted = ActiveInference.blendVectors(predicted, trend, 0.7);
    }

    return predicted;
  }

  /**
   * 融合两个向量：result = a * weightA + b * (1 - weightA)，然后裁剪到 trit
   */
  private static blendVectors(a: TritVector, b: TritVector, weightA: number): TritVector {
    const result = {} as TritVector;
    for (const d of ALL_DIMENSIONS) {
      const blended = a[d] * weightA + b[d] * (1 - weightA);
      if (blended > 0.5) result[d] = 1;
      else if (blended < -0.5) result[d] = -1;
      else result[d] = 0;
    }
    return result;
  }

  /**
   * 计算行动置信度
   */
  private static computeConfidence(
    currentState: TritVector,
    predictedState: TritVector,
    target: CognitivePrototype,
    freeEnergy: number
  ): number {
    // 置信度 = 1 - 自由能（自由能越低，置信度越高）
    const energyConfidence = Math.max(0, 1 - freeEnergy);

    // 预测状态与目标原型的余弦相似度
    const cosine = CognitiveDistance.cosineSimilarity(predictedState, target.vector);
    const directionConfidence = Math.max(0, (cosine + 1) / 2); // -1~1 → 0~1

    // 融合
    return 0.6 * energyConfidence + 0.4 * directionConfidence;
  }

  /**
   * 解释行动选择理由
   */
  private static explainAction(
    action: CognitiveAction,
    freeEnergy: number,
    transitionDistance: number,
    target: CognitivePrototype,
    suffix: string = ''
  ): string {
    const actionLabels: Record<CognitiveAction, string> = {
      expand: '向扩张态推进',
      contract: '向收缩态退守',
      observe: '向观察态收敛',
      transform: '向转化态变革',
      create: '向创生态移动',
      hold: '保持当前状态'
    };

    return `${actionLabels[action]}，预期自由能=${freeEnergy.toFixed(3)}，变化幅度=${transitionDistance.toFixed(3)}，目标=${target.name}${suffix}`;
  }

  /**
   * 多步预测：预测未来 N 步的状态序列
   *
   * 使用主动推理反复选择最佳行动，模拟未来认知轨迹。
   *
   * @param currentState  当前状态
   * @param steps  预测步数
   * @param options  推理选项
   * @returns  预测的状态序列和每步的决策
   */
  static multiStepPredict(
    currentState: TritVector,
    steps: number,
    options: ActiveInferenceOptions = {}
  ): {
    trajectory: TritVector[];
    decisions: InferenceResult[];
    finalFreeEnergy: number;
    converged: boolean;
  } {
    const trajectory: TritVector[] = [{ ...currentState }];
    const decisions: InferenceResult[] = [];

    let state = { ...currentState };

    for (let i = 0; i < steps; i++) {
      const result = ActiveInference.infer(state, trajectory, options);
      decisions.push(result);

      if (result.bestAction === 'hold') {
        // 收敛，停止预测
        return {
          trajectory,
          decisions,
          finalFreeEnergy: result.currentFreeEnergy,
          converged: true
        };
      }

      state = { ...result.evaluations[0].predictedState };
      trajectory.push({ ...state });
    }

    const finalResult = decisions[decisions.length - 1];
    return {
      trajectory,
      decisions,
      finalFreeEnergy: finalResult ? finalResult.expectedFreeEnergy : 0,
      converged: false
    };
  }

  /**
   * 自由能历史分析：分析认知系统的自由能变化趋势
   *
   * @param history  认知状态历史
   * @returns  自由能序列和趋势分析
   */
  static analyzeFreeEnergyHistory(history: TritVector[]): {
    freeEnergies: number[];
    trend: 'decreasing' | 'increasing' | 'stable' | 'fluctuating';
    avgFreeEnergy: number;
    minFreeEnergy: number;
    maxFreeEnergy: number;
    converged: boolean;
  } {
    if (history.length === 0) {
      return {
        freeEnergies: [],
        trend: 'stable',
        avgFreeEnergy: 0,
        minFreeEnergy: 0,
        maxFreeEnergy: 0,
        converged: false
      };
    }

    // 计算每个状态到其最近原型的自由能
    const freeEnergies = history.map(v => {
      const match = PrototypeMatcher.snapTo(v);
      return CognitiveDistance.composite(v, match.prototype.vector);
    });

    const avg = freeEnergies.reduce((a, b) => a + b, 0) / freeEnergies.length;
    const min = Math.min(...freeEnergies);
    const max = Math.max(...freeEnergies);

    // 趋势分析
    let trend: 'decreasing' | 'increasing' | 'stable' | 'fluctuating';
    if (freeEnergies.length < 2) {
      trend = 'stable';
    } else {
      const firstHalf = freeEnergies.slice(0, Math.floor(freeEnergies.length / 2));
      const secondHalf = freeEnergies.slice(Math.floor(freeEnergies.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;

      if (Math.abs(diff) < 0.02) trend = 'stable';
      else if (diff < 0) trend = 'decreasing';
      else trend = 'increasing';

      // 检查是否震荡
      let changes = 0;
      for (let i = 1; i < freeEnergies.length; i++) {
        if (Math.abs(freeEnergies[i] - freeEnergies[i - 1]) > 0.1) changes++;
      }
      if (changes > freeEnergies.length * 0.5) trend = 'fluctuating';
    }

    // 是否收敛（最后3步自由能都低于阈值）
    const converged = freeEnergies.slice(-3).every(fe => fe < 0.15);

    return {
      freeEnergies: freeEnergies.map(fe => Number(fe.toFixed(4))),
      trend,
      avgFreeEnergy: Number(avg.toFixed(4)),
      minFreeEnergy: Number(min.toFixed(4)),
      maxFreeEnergy: Number(max.toFixed(4)),
      converged
    };
  }
}
