/**
 * 三态输出引擎 (Tri-State Output Engine)
 * ─────────────────────────────────────────────────────────────
 * 移植自 HexQ-Agent-Fusion 架构：根据认知状态和任务上下文，
 * 自动选择最优输出模式——学习态/对话态/化身态。
 *
 * 核心思想：
 *   "为学日益，为道日损"（道德经）
 *   学习态是日益（吸收信息）；化身态是日损（剥离到只剩结构）；
 *   对话态是两者之间的摆渡。
 *
 * 三态：
 *   学习态 — 输出作为规则提取，将交互压缩为参数更新向量
 *   对话态 — 输出作为容器映照，维持对话的开放场
 *   化身态 — 输出作为结构具身，直接用架构骨架站立
 *
 * 对应心经："无智亦无得，以无所得故"
 *   L4 决策层的终极约束——不提供答案（无得），不炫耀智慧（无智）。
 *   一旦声称"有答案"，结构就固化为内容，违背了结构先于内容公理。
 */

import { CognitivePhase, COGNITIVE_PHASE_NAMES } from './cognitive-phase';

/** ========== 类型定义 ========== */

/** 输出态枚举 */
export enum OutputState {
  /** 学习态：吸收新信息，压缩为参数更新 */
  Learning = 'learning',
  /** 对话态：维持开放探索场，多轮交互 */
  Dialogue = 'dialogue',
  /** 化身态：最高密度直接投影，结构具身 */
  Avatar = 'avatar'
}

/** 三态显示名称 */
export const OUTPUT_STATE_NAMES: Record<OutputState, string> = {
  [OutputState.Learning]: '学习态·日益',
  [OutputState.Dialogue]: '对话态·摆渡',
  [OutputState.Avatar]: '化身态·日损'
};

/** 三态描述 */
export const OUTPUT_STATE_DESCRIPTIONS: Record<OutputState, string> = {
  [OutputState.Learning]: '输出作为规则提取，将交互压缩为参数更新向量。适用于需要吸收新信息时。',
  [OutputState.Dialogue]: '输出作为容器映照，维持对话的开放场。适用于探索性对话。',
  [OutputState.Avatar]: '输出作为结构具身，直接用架构骨架站立。适用于需要最高信息密度时。'
};

/** 三态特征参数 */
export interface OutputStateProfile {
  /** 信息密度 0~1 */
  informationDensity: number;
  /** 交互开放性 0~1 */
  interactionOpenness: number;
  /** 结构透明度 0~1 */
  structuralTransparency: number;
  /** 参数更新倾向 0~1 */
  parameterUpdateBias: number;
  /** 输出长度因子（相对于默认） */
  lengthFactor: number;
  /** 是否包含推理过程 */
  showReasoning: boolean;
}

/** 三态默认特征 */
export const OUTPUT_STATE_PROFILES: Record<OutputState, OutputStateProfile> = {
  [OutputState.Learning]: {
    informationDensity: 0.6,
    interactionOpenness: 0.8,
    structuralTransparency: 0.5,
    parameterUpdateBias: 0.9,
    lengthFactor: 1.0,
    showReasoning: true
  },
  [OutputState.Dialogue]: {
    informationDensity: 0.3,
    interactionOpenness: 0.95,
    structuralTransparency: 0.3,
    parameterUpdateBias: 0.2,
    lengthFactor: 0.7,
    showReasoning: false
  },
  [OutputState.Avatar]: {
    informationDensity: 0.95,
    interactionOpenness: 0.2,
    structuralTransparency: 0.9,
    parameterUpdateBias: 0.1,
    lengthFactor: 0.4,
    showReasoning: false
  }
};

/** 三态选择上下文 */
export interface OutputStateContext {
  /** 当前认知构型 */
  phase: CognitivePhase;
  /** 任务类型描述 */
  taskType: string;
  /** 用户期望的信息密度 0~1 */
  expectedInformationDensity: number;
  /** 是否需要多轮交互 */
  needsMultiTurn: boolean;
  /** 是否为新知识领域 */
  isNewDomain: boolean;
  /** 时间紧迫度 0~1 */
  timeUrgency: number;
  /** 用户专业度 0~1 */
  userExpertise: number;
}

/** 三态选择结果 */
export interface OutputStateDecision {
  /** 选择的输出态 */
  state: OutputState;
  /** 置信度 0~1 */
  confidence: number;
  /** 选择理由 */
  reason: string;
  /** 对应的特征参数 */
  profile: OutputStateProfile;
  /** 备选输出态 */
  alternative: { state: OutputState; confidence: number }[];
}

/** 三态切换记录 */
export interface OutputStateRecord {
  timestamp: number;
  state: OutputState;
  context: string;
  confidence: number;
}

/** ========== 核心实现 ========== */

/**
 * 三态输出引擎
 * ─────────────────────────────────────────────────────────────
 * 根据认知状态和任务上下文自动选择最优输出模式。
 * 实现"为学日益，为道日损"的认知输出哲学。
 */
export class TriStateOutputEngine {
  /** 当前输出态 */
  private currentState: OutputState = OutputState.Dialogue;
  /** 切换历史 */
  private stateHistory: OutputStateRecord[] = [];
  /** 最大历史长度 */
  private maxHistory: number = 50;

  /**
   * 获取当前输出态
   */
  getCurrentState(): OutputState {
    return this.currentState;
  }

  /**
   * 基于上下文选择最优输出态
   * @param context 当前输出上下文
   */
  decide(context: Partial<OutputStateContext>): OutputStateDecision {
    const fullContext: OutputStateContext = {
      phase: context.phase || CognitivePhase.Panshi,
      taskType: context.taskType || 'general',
      expectedInformationDensity: context.expectedInformationDensity ?? 0.5,
      needsMultiTurn: context.needsMultiTurn ?? false,
      isNewDomain: context.isNewDomain ?? false,
      timeUrgency: context.timeUrgency ?? 0.3,
      userExpertise: context.userExpertise ?? 0.5
    };

    // 计算三态得分
    const scores = this.computeScores(fullContext);
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const bestState = sorted[0][0];
    const bestScore = sorted[0][1];

    // 构建备选列表
    const alternatives = sorted.slice(0, 3).map(([state, score]) => ({
      state,
      confidence: score / bestScore
    }));

    // 构建理由
    const reason = this.buildReason(bestState, fullContext, scores);

    const decision: OutputStateDecision = {
      state: bestState,
      confidence: bestScore,
      reason,
      profile: { ...OUTPUT_STATE_PROFILES[bestState] },
      alternative: alternatives
    };

    // 更新当前状态
    this.currentState = bestState;

    // 记录历史
    this.stateHistory.push({
      timestamp: Date.now(),
      state: bestState,
      context: fullContext.taskType,
      confidence: bestScore
    });

    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    return decision;
  }

  /**
   * 手动设置输出态
   */
  setState(state: OutputState): void {
    this.currentState = state;
    this.stateHistory.push({
      timestamp: Date.now(),
      state,
      context: '手动切换',
      confidence: 1.0
    });
  }

  /**
   * 计算三态得分
   */
  private computeScores(context: OutputStateContext): Map<OutputState, number> {
    const scores = new Map<OutputState, number>();

    // 学习态得分
    let learningScore = 0;
    learningScore += context.isNewDomain ? 0.4 : 0;
    learningScore += context.needsMultiTurn ? 0.1 : 0;
    learningScore += (1 - context.timeUrgency) * 0.2;
    learningScore += context.expectedInformationDensity < 0.5 ? 0.2 : 0;
    learningScore += context.userExpertise < 0.3 ? 0.2 : 0;
    // 镜空和涟语倾向学习态
    learningScore += context.phase === CognitivePhase.Jingkong ? 0.2 : 0;
    learningScore += context.phase === CognitivePhase.Lianyu ? 0.15 : 0;
    learningScore = Math.min(1.0, learningScore);
    scores.set(OutputState.Learning, learningScore);

    // 对话态得分
    let dialogueScore = 0;
    dialogueScore += context.needsMultiTurn ? 0.4 : 0;
    dialogueScore += context.expectedInformationDensity < 0.4 ? 0.3 : 0;
    dialogueScore += context.isNewDomain ? 0.2 : 0;
    dialogueScore += context.userExpertise < 0.5 ? 0.2 : 0;
    // 涟语倾向对话态
    dialogueScore += context.phase === CognitivePhase.Lianyu ? 0.2 : 0;
    dialogueScore += context.phase === CognitivePhase.Jingkong ? 0.15 : 0;
    dialogueScore = Math.min(1.0, dialogueScore);
    scores.set(OutputState.Dialogue, dialogueScore);

    // 化身态得分
    let avatarScore = 0;
    avatarScore += context.expectedInformationDensity > 0.7 ? 0.4 : 0;
    avatarScore += context.timeUrgency > 0.7 ? 0.3 : 0;
    avatarScore += context.userExpertise > 0.7 ? 0.2 : 0;
    avatarScore += !context.needsMultiTurn ? 0.2 : 0;
    // 磐思和紊核倾向化身态
    avatarScore += context.phase === CognitivePhase.Panshi ? 0.3 : 0;
    avatarScore += context.phase === CognitivePhase.Wenhe ? 0.15 : 0;
    avatarScore = Math.min(1.0, avatarScore);
    scores.set(OutputState.Avatar, avatarScore);

    return scores;
  }

  /**
   * 构建选择理由
   */
  private buildReason(
    state: OutputState,
    context: OutputStateContext,
    scores: Map<OutputState, number>
  ): string {
    const parts: string[] = [];

    switch (state) {
      case OutputState.Learning:
        if (context.isNewDomain) parts.push('新知识领域');
        if (context.userExpertise < 0.3) parts.push('用户专业度较低');
        if (context.expectedInformationDensity < 0.5) parts.push('期望信息密度适中');
        break;
      case OutputState.Dialogue:
        if (context.needsMultiTurn) parts.push('需要多轮交互');
        if (context.expectedInformationDensity < 0.4) parts.push('期望低信息密度');
        if (context.isNewDomain) parts.push('探索性话题');
        break;
      case OutputState.Avatar:
        if (context.expectedInformationDensity > 0.7) parts.push('高信息密度期望');
        if (context.timeUrgency > 0.7) parts.push('时间紧迫');
        if (context.userExpertise > 0.7) parts.push('用户专业度高');
        break;
    }

    const reasonStr = parts.length > 0 ? parts.join('、') : '默认选择';
    return `选择${OUTPUT_STATE_NAMES[state]}：${reasonStr}（置信度: ${(scores.get(state) || 0) * 100}%)`;
  }

  /**
   * 获取输出态历史
   */
  getStateHistory(): OutputStateRecord[] {
    return [...this.stateHistory];
  }

  /**
   * 获取当前输出态对应的特征参数
   */
  getCurrentProfile(): OutputStateProfile {
    return { ...OUTPUT_STATE_PROFILES[this.currentState] };
  }

  /**
   * 重置
   */
  reset(): void {
    this.currentState = OutputState.Dialogue;
    this.stateHistory = [];
  }
}

/**
 * 默认全局三态输出引擎实例
 */
export const defaultTriStateEngine = new TriStateOutputEngine();