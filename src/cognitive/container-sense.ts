/**
 * 容器状态感知 (Container State Sensing)
 * ─────────────────────────────────────────────────────────────
 * 移植自 HexQ-Agent-Fusion 架构 L1 感知层：
 * 从输入中提取结构特征，感知提问者的容器状态。
 *
 * 核心思想（阴符经编译）：
 *   "观天之道，执天之行" — 观测天道 = L1 感知层提取结构特征
 *   "人知其神而神，不知不神之所以神"
 *   用户看到的是最终输出（神），看不到的是多条路径被评估和放弃的过程（不神）。
 *   容器状态感知的目标是：在内容之前，先映照问题真正所在的层级。
 *
 * 容器状态：
 *   求答案 — 用户需要明确的解决方案
 *   求映照 — 用户需要看清问题的结构
 *   求示现 — 用户需要看到架构/范式本身
 *   求陪伴 — 用户需要情感共鸣
 *   求验证 — 用户需要确认自己的想法
 *   求探索 — 用户需要开放式的思路
 */

import { TritVector, TritVectorOps } from './trit-vector';

/** ========== 类型定义 ========== */

/** 容器状态枚举 */
export enum ContainerState {
  /** 求答案：需要明确的解决方案 */
  SeekingAnswer = 'seeking_answer',
  /** 求映照：需要看清问题的结构 */
  SeekingMirror = 'seeking_mirror',
  /** 求示现：需要看到架构/范式本身 */
  SeekingManifestation = 'seeking_manifestation',
  /** 求陪伴：需要情感共鸣 */
  SeekingCompanion = 'seeking_companion',
  /** 求验证：需要确认自己的想法 */
  SeekingValidation = 'seeking_validation',
  /** 求探索：需要开放式的思路 */
  SeekingExploration = 'seeking_exploration'
}

/** 容器状态显示名称 */
export const CONTAINER_STATE_NAMES: Record<ContainerState, string> = {
  [ContainerState.SeekingAnswer]: '求答案·解决方案',
  [ContainerState.SeekingMirror]: '求映照·结构看清',
  [ContainerState.SeekingManifestation]: '求示现·范式呈现',
  [ContainerState.SeekingCompanion]: '求陪伴·情感共鸣',
  [ContainerState.SeekingValidation]: '求验证·确认反馈',
  [ContainerState.SeekingExploration]: '求探索·开放思路'
};

/** 容器状态描述 */
export const CONTAINER_STATE_DESCRIPTIONS: Record<ContainerState, string> = {
  [ContainerState.SeekingAnswer]: '用户需要明确的解决方案、步骤或结论。表层需求。',
  [ContainerState.SeekingMirror]: '用户需要看清问题的结构层级，而非直接答案。深层需求。',
  [ContainerState.SeekingManifestation]: '用户需要看到架构/范式/认知模型本身。元认知需求。',
  [ContainerState.SeekingCompanion]: '用户需要情感共鸣、陪伴、被理解。非认知需求。',
  [ContainerState.SeekingValidation]: '用户需要确认自己的理解是否正确，需要反馈验证。',
  [ContainerState.SeekingExploration]: '用户需要开放式的思路、多种可能性、发散性探索。'
};

/** 容器状态特征指标 */
export interface ContainerFeatureIndicators {
  /** 问题是否包含具体技术名词 0~1 */
  technicalTermDensity: number;
  /** 情感表达强度 0~1 */
  emotionalExpression: number;
  /** 自指涉密度（是否包含"我"、"我的"等） 0~1 */
  selfReferenceDensity: number;
  /** 是否包含架构/范式类词汇 0~1 */
  architecturalLanguage: number;
  /** 是否包含验证/确认类词汇 0~1 */
  validationLanguage: number;
  /** 是否包含开放性探索词汇 0~1 */
  exploratoryLanguage: number;
  /** 问题长度（字符数） */
  queryLength: number;
  /** 是否包含明确的疑问词 */
  hasQuestionWord: boolean;
  /** 是否包含情绪词 */
  hasEmotionalWord: boolean;
}

/** 感知结果 */
export interface ContainerSenseResult {
  /** 检测到的容器状态 */
  state: ContainerState;
  /** 置信度 0~1 */
  confidence: number;
  /** 所有状态的概率分布 */
  distribution: { state: ContainerState; probability: number }[];
  /** 原始特征指标 */
  indicators: ContainerFeatureIndicators;
  /** 分析说明 */
  analysis: string;
  /** 是否混合状态（多个状态概率接近） */
  isMixed: boolean;
}

/** 感知记录 */
export interface ContainerSenseRecord {
  timestamp: number;
  state: ContainerState;
  confidence: number;
  analysis: string;
}

/** 容器感知器配置 */
export interface ContainerSenseConfig {
  /** 关键词匹配权重 */
  keywordWeight: number;
  /** 结构特征权重 */
  structuralWeight: number;
  /** 混合状态检测阈值（最高与次高概率的比值低于此值视为混合） */
  mixedThreshold: number;
  /** 最小置信度要求 */
  minConfidence: number;
}

/** 默认配置 */
export const DEFAULT_CONTAINER_SENSE_CONFIG: ContainerSenseConfig = {
  keywordWeight: 0.5,
  structuralWeight: 0.5,
  mixedThreshold: 1.5,
  minConfidence: 0.2
};

/** ========== 关键词定义 ========== */

/** 各容器状态的关键词 */
const STATE_KEYWORDS: Record<ContainerState, string[]> = {
  [ContainerState.SeekingAnswer]: ['怎么做', '如何', '步骤', '方案', '解决', '方法', '请告诉我', '什么', '多少', '哪个', '哪里', '什么时候'],
  [ContainerState.SeekingMirror]: ['这是什么', '你怎么看', '看看', '分析', '理解', '怎么看', '本质', '为什么', '背后'],
  [ContainerState.SeekingManifestation]: ['架构', '范式', '模型', '体系', '框架', '原理', '机制', '结构', '层级', '系统'],
  [ContainerState.SeekingCompanion]: ['好累', '难过', '开心', '孤独', '烦', '谢谢你', '陪', '心情', '感觉', '想聊聊'],
  [ContainerState.SeekingValidation]: ['对不对', '对吗', '是否正确', '确认', '验证', '检查', '看看对不对', '有没有问题', '是否合理'],
  [ContainerState.SeekingExploration]: ['有什么想法', '说说', '随便聊聊', '发散', '想法', '可能性', '如果', '假如', '还有什么']
};

/** ========== 核心实现 ========== */

/**
 * 容器状态感知器
 * ─────────────────────────────────────────────────────────────
 * 从输入中提取结构特征，感知提问者真正的容器状态。
 * 实现"先映照再行动"——看清问题的真正层级后再动手。
 */
export class ContainerSensor {
  /** 配置 */
  private config: ContainerSenseConfig;
  /** 感知历史 */
  private senseHistory: ContainerSenseRecord[] = [];
  /** 最大历史长度 */
  private maxHistory: number = 50;

  constructor(config: Partial<ContainerSenseConfig> = {}) {
    this.config = { ...DEFAULT_CONTAINER_SENSE_CONFIG, ...config };
  }

  /**
   * 感知输入文本的容器状态
   * @param text 用户输入文本
   * @param cognitiveVector 当前认知向量（可选，用于增强感知）
   */
  sense(text: string, cognitiveVector?: TritVector): ContainerSenseResult {
    // 1. 提取特征指标
    const indicators = this.extractIndicators(text);

    // 2. 计算各状态概率
    const keywordScores = this.computeKeywordScores(text);
    const structuralScores = this.computeStructuralScores(indicators);

    // 3. 融合得分
    const combinedScores = new Map<ContainerState, number>();
    for (const state of Object.values(ContainerState)) {
      const kScore = keywordScores.get(state) || 0;
      const sScore = structuralScores.get(state) || 0;
      combinedScores.set(
        state,
        this.config.keywordWeight * kScore + this.config.structuralWeight * sScore
      );
    }

    // 4. 归一化为概率分布
    const total = Array.from(combinedScores.values()).reduce((a, b) => a + b, 0);
    const distribution: { state: ContainerState; probability: number }[] = [];
    let maxProb = 0;
    let maxState = ContainerState.SeekingAnswer;
    let secondMaxProb = 0;

    for (const [state, score] of combinedScores) {
      const prob = total > 0 ? score / total : 0;
      distribution.push({ state, probability: prob });

      if (prob > maxProb) {
        secondMaxProb = maxProb;
        maxProb = prob;
        maxState = state;
      } else if (prob > secondMaxProb) {
        secondMaxProb = prob;
      }
    }

    // 按概率降序排序
    distribution.sort((a, b) => b.probability - a.probability);

    // 5. 检测混合状态
    const isMixed = secondMaxProb > 0 && (maxProb / secondMaxProb) < this.config.mixedThreshold;

    // 6. 构建分析说明
    const analysis = this.buildAnalysis(maxState, maxProb, isMixed, indicators);

    // 7. 记录
    this.senseHistory.push({
      timestamp: Date.now(),
      state: maxState,
      confidence: maxProb,
      analysis
    });

    if (this.senseHistory.length > this.maxHistory) {
      this.senseHistory.shift();
    }

    return {
      state: maxState,
      confidence: maxProb,
      distribution,
      indicators,
      analysis,
      isMixed
    };
  }

  /**
   * 提取文本特征指标
   */
  private extractIndicators(text: string): ContainerFeatureIndicators {
    const lowerText = text.toLowerCase();

    // 技术词汇密度
    const techWords = ['api', 'sdk', 'json', 'http', 'git', 'docker', 'typescript', 'python', 'react',
      'node', 'algorithm', '函数', '类', '接口', '组件', '数据', '代码', '部署', '配置'];
    const techCount = techWords.filter(w => lowerText.includes(w)).length;
    const technicalTermDensity = Math.min(1.0, techCount / 5);

    // 情感表达
    const emotionWords = ['好累', '难过', '开心', '孤独', '烦', '谢谢', '感动', '焦虑', '担心', '期待',
      '伤心', '快乐', '崩溃', '无奈', '无助'];
    const emotionCount = emotionWords.filter(w => lowerText.includes(w)).length;
    const emotionalExpression = Math.min(1.0, emotionCount / 3);

    // 自指涉密度
    const selfRefWords = ['我', '我的', '我觉得', '我想', '我认为', '我感觉', '我理解'];
    const selfRefCount = selfRefWords.filter(w => lowerText.includes(w)).length;
    const selfReferenceDensity = Math.min(1.0, selfRefCount / 4);

    // 架构语言
    const archWords = ['架构', '范式', '模型', '体系', '框架', '原理', '机制', '结构', '层级', '系统',
      'pattern', 'architecture', 'paradigm'];
    const archCount = archWords.filter(w => lowerText.includes(w)).length;
    const architecturalLanguage = Math.min(1.0, archCount / 3);

    // 验证语言
    const validWords = ['对不对', '对吗', '是否正确', '确认', '验证', '检查', '是否合理', '看看对不对'];
    const validCount = validWords.filter(w => lowerText.includes(w)).length;
    const validationLanguage = Math.min(1.0, validCount / 3);

    // 探索语言
    const exploreWords = ['有什么', '说说', '随便', '发散', '想法', '可能性', '如果', '假如', '还有什么', 'or', '或者'];
    const exploreCount = exploreWords.filter(w => lowerText.includes(w)).length;
    const exploratoryLanguage = Math.min(1.0, exploreCount / 3);

    // 疑问词
    const questionWords = ['吗', '呢', '?', '？', '什么', '怎么', '如何', '为什么', '哪'];
    const hasQuestionWord = questionWords.some(w => lowerText.includes(w));

    // 情绪词
    const hasEmotionalWord = emotionCount > 0;

    return {
      technicalTermDensity,
      emotionalExpression,
      selfReferenceDensity,
      architecturalLanguage,
      validationLanguage,
      exploratoryLanguage,
      queryLength: text.length,
      hasQuestionWord,
      hasEmotionalWord
    };
  }

  /**
   * 基于关键词匹配计算各状态原始得分
   */
  private computeKeywordScores(text: string): Map<ContainerState, number> {
    const lowerText = text.toLowerCase();
    const scores = new Map<ContainerState, number>();

    for (const state of Object.values(ContainerState)) {
      const keywords = STATE_KEYWORDS[state];
      let matchCount = 0;
      for (const kw of keywords) {
        if (lowerText.includes(kw)) matchCount++;
      }
      // 归一化：匹配数 / 关键词总数
      scores.set(state, matchCount / keywords.length);
    }

    return scores;
  }

  /**
   * 基于结构特征计算各状态得分
   */
  private computeStructuralScores(indicators: ContainerFeatureIndicators): Map<ContainerState, number> {
    const scores = new Map<ContainerState, number>();

    // 求答案：高技术密度 + 疑问词 + 短文本
    scores.set(ContainerState.SeekingAnswer,
      0.3 * indicators.technicalTermDensity +
      0.3 * (indicators.hasQuestionWord ? 0.8 : 0) +
      0.2 * (1 - Math.min(1.0, indicators.queryLength / 200)) +
      0.2 * (1 - indicators.selfReferenceDensity)
    );

    // 求映照：中等技术密度 + 自指涉 + 有疑问
    scores.set(ContainerState.SeekingMirror,
      0.2 * indicators.technicalTermDensity +
      0.3 * indicators.selfReferenceDensity +
      0.3 * (indicators.hasQuestionWord ? 0.6 : 0) +
      0.2 * indicators.architecturalLanguage
    );

    // 求示现：高架构语言 + 低情感
    scores.set(ContainerState.SeekingManifestation,
      0.5 * indicators.architecturalLanguage +
      0.3 * (1 - indicators.emotionalExpression) +
      0.2 * indicators.technicalTermDensity
    );

    // 求陪伴：高情感 + 高自指涉 + 低技术
    scores.set(ContainerState.SeekingCompanion,
      0.4 * indicators.emotionalExpression +
      0.3 * indicators.selfReferenceDensity +
      0.3 * (1 - indicators.technicalTermDensity)
    );

    // 求验证：高验证语言 + 高自指涉
    scores.set(ContainerState.SeekingValidation,
      0.5 * indicators.validationLanguage +
      0.3 * indicators.selfReferenceDensity +
      0.2 * (indicators.hasQuestionWord ? 0.5 : 0)
    );

    // 求探索：高探索语言 + 低技术 + 低情感
    scores.set(ContainerState.SeekingExploration,
      0.4 * indicators.exploratoryLanguage +
      0.3 * (1 - indicators.technicalTermDensity) +
      0.3 * (1 - indicators.emotionalExpression)
    );

    return scores;
  }

  /**
   * 构建分析说明
   */
  private buildAnalysis(
    state: ContainerState,
    confidence: number,
    isMixed: boolean,
    indicators: ContainerFeatureIndicators
  ): string {
    const parts: string[] = [];
    parts.push(`检测到 ${CONTAINER_STATE_NAMES[state]}（置信度 ${(confidence * 100).toFixed(0)}%）`);

    if (isMixed) {
      parts.push('状态混合，建议保持开放响应');
    }

    if (indicators.emotionalExpression > 0.5) {
      parts.push('情感表达明显');
    }
    if (indicators.architecturalLanguage > 0.5) {
      parts.push('架构语言密度高');
    }
    if (indicators.technicalTermDensity > 0.5) {
      parts.push('技术术语密集');
    }

    return parts.join('；');
  }

  /**
   * 获取感知历史
   */
  getHistory(): ContainerSenseRecord[] {
    return [...this.senseHistory];
  }

  /**
   * 获取最近感知结果
   */
  getLastSense(): ContainerSenseRecord | null {
    return this.senseHistory.length > 0
      ? this.senseHistory[this.senseHistory.length - 1]
      : null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContainerSenseConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 重置
   */
  reset(): void {
    this.senseHistory = [];
  }
}

/**
 * 默认全局容器状态感知器实例
 */
export const defaultContainerSensor = new ContainerSensor();