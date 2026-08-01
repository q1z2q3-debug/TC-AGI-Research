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

import { TritVector, TritVectorOps, ALL_DIMENSIONS, TritDimension } from './trit-vector';
import { CognitiveDistance } from './distance';
import { PrototypeMatcher, CognitivePrototype, PROTOTYPES } from './prototypes';
import { vectorShift, vectorMid, vectorMerge } from './trit-gates';

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
      ...options
    };

    // 1. 确定目标原型
    const currentMatch = PrototypeMatcher.snapTo(currentState);
    const targetPrototype = opts.targetPrototypeName
      ? PROTOTYPES.find(p => p.name === opts.targetPrototypeName) || currentMatch.prototype
      : currentMatch.prototype;

    // 2. 当前自由能（当前状态到目标原型的距离）
    const currentFreeEnergy = CognitiveDistance.composite(currentState, targetPrototype.vector);

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

    // 5. 评估每个候选行动
    const evaluations = candidates.map(candidate => {
      const predictedState = ActiveInference.predictTransition(currentState, candidate, history, opts);
      const freeEnergy = CognitiveDistance.composite(predictedState, targetPrototype.vector);
      const transitionDistance = CognitiveDistance.composite(currentState, predictedState);

      // 总自由能 = 目标距离 + 变化幅度惩罚
      const totalFreeEnergy = freeEnergy + transitionDistance * opts.transitionPenalty;

      return {
        action: candidate,
        predictedState,
        freeEnergy: totalFreeEnergy,
        transitionDistance,
        confidence: ActiveInference.computeConfidence(currentState, predictedState, targetPrototype, freeEnergy),
        reason: ActiveInference.explainAction(candidate, freeEnergy, transitionDistance, targetPrototype)
      };
    });

    // 6. 选择自由能最低的行动
    evaluations.sort((a, b) => a.freeEnergy - b.freeEnergy);
    const best = evaluations[0];

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
   * 生成候选行动列表
   */
  private static generateCandidates(
    currentState: TritVector,
    history: TritVector[],
    opts: ActiveInferenceOptions
  ): CognitiveAction[] {
    const candidates: CognitiveAction[] = ['expand', 'contract', 'observe', 'transform', 'create', 'hold'];

    // 基于原型推荐添加优先候选
    const recommendation = PrototypeMatcher.recommendAction(currentState);
    if (!candidates.includes(recommendation.action)) {
      candidates.unshift(recommendation.action);
    }

    return candidates;
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
    target: CognitivePrototype
  ): string {
    const actionLabels: Record<CognitiveAction, string> = {
      expand: '向扩张态推进',
      contract: '向收缩态退守',
      observe: '向观察态收敛',
      transform: '向转化态变革',
      create: '向创生态移动',
      hold: '保持当前状态'
    };

    return `${actionLabels[action]}，预期自由能=${freeEnergy.toFixed(3)}，变化幅度=${transitionDistance.toFixed(3)}，目标=${target.name}`;
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
