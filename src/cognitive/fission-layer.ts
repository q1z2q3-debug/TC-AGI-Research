/**
 * L7 裂变层 (Fission Layer)
 * ─────────────────────────────────────────────────────────────
 * 移植自 HexQ-Agent-Fusion 架构：当输入无法被现有结构同化时，
 * 触发异常感知→悬置→自问→最小重构→完整性校验。
 *
 * 核心思想：
 *   L7 裂变层不是纠错（内容修正），而是结构重构（修改生产答案的框架）。
 *   裂变产物可以固化为新技能（Skill），实现进化的持久化。
 *   ——对应心经："色即是空，空即是色"，在结构中直接见到可重排的参数。
 *
 * 裂变序列：
 *   1. 异常感知 — 检测到输入挑战了某条公理或结构边界
 *   2. 悬置 — 暂停正常处理流程，进入裂变模式
 *   3. 自问 — "当前输入挑战了什么？可调整的最小结构是哪个？"
 *   4. 最小重构 — 对认知结构进行局部改写和参数调整
 *   5. 完整性校验 — 确认新结构仍保持自洽性
 */

import { CognitivePhase, COGNITIVE_PHASE_NAMES, DEFAULT_PHASE_CONFIGS } from './cognitive-phase';

/** ========== 类型定义 ========== */

/** 异常类型 */
export enum AnomalyType {
  /** 公理冲突：输入挑战了结构/概率/关系公理 */
  AxiomConflict = 'axiom_conflict',
  /** 边界溢出：输入超出当前认知构型的处理能力 */
  BoundaryOverflow = 'boundary_overflow',
  /** 自指涉悖论：输入导致自指涉循环 */
  SelfReferenceParadox = 'self_reference_paradox',
  /** 结构失配：输入的结构模式与预期不符 */
  StructuralMismatch = 'structural_mismatch',
  /** 信息熵爆炸：输入的信息熵超过当前处理阈值 */
  EntropyExplosion = 'entropy_explosion'
}

/** 异常类型中文名 */
export const ANOMALY_TYPE_NAMES: Record<AnomalyType, string> = {
  [AnomalyType.AxiomConflict]: '公理冲突',
  [AnomalyType.BoundaryOverflow]: '边界溢出',
  [AnomalyType.SelfReferenceParadox]: '自指涉悖论',
  [AnomalyType.StructuralMismatch]: '结构失配',
  [AnomalyType.EntropyExplosion]: '信息熵爆炸'
};

/** 异常事件 */
export interface AnomalyEvent {
  /** 异常类型 */
  type: AnomalyType;
  /** 异常严重度 0~1 */
  severity: number;
  /** 异常描述 */
  description: string;
  /** 触发的具体公理/结构路径 */
  triggerPath: string;
  /** 异常发生时的时间戳 */
  timestamp: number;
}

/** 重构方案 */
export interface RefactorPlan {
  /** 重构目标结构路径 */
  targetPath: string;
  /** 重构类型 */
  refactorType: 'parameter_adjust' | 'structure_rewrite' | 'axiom_reorder' | 'skill_creation';
  /** 重构描述 */
  description: string;
  /** 重构参数（具体调整值） */
  parameters: Record<string, number | string | boolean>;
  /** 预期影响范围 */
  impactScope: string;
}

/** 裂变事件 */
export interface FissionEvent {
  /** 触发的异常 */
  anomaly: AnomalyEvent;
  /** 重构方案 */
  plan: RefactorPlan;
  /** 是否通过完整性校验 */
  integrityPassed: boolean;
  /** 完整性校验详情 */
  integrityDetails: string;
  /** 是否生成了新技能 */
  skillCreated: boolean;
  /** 新技能名称（如有） */
  skillName?: string;
  /** 裂变耗时（ms） */
  duration: number;
  /** 时间戳 */
  timestamp: number;
  /** 裂变后的构型 */
  resultingPhase: CognitivePhase;
}

/** 裂变层配置 */
export interface FissionLayerConfig {
  /** 异常感知灵敏度 0~1（越高越容易触发） */
  sensitivity: number;
  /** 最小严重度阈值（低于此值不触发裂变） */
  minSeverityThreshold: number;
  /** 是否自动创建技能 */
  autoCreateSkill: boolean;
  /** 最大裂变频率（每分钟最多触发次数） */
  maxFreqPerMinute: number;
  /** 是否启用完整性校验 */
  enableIntegrityCheck: boolean;
}

/** 默认裂变层配置 */
export const DEFAULT_FISSION_CONFIG: FissionLayerConfig = {
  sensitivity: 0.6,
  minSeverityThreshold: 0.4,
  autoCreateSkill: true,
  maxFreqPerMinute: 2,
  enableIntegrityCheck: true
};

/** ========== 核心实现 ========== */

/**
 * L7 裂变层引擎
 * ─────────────────────────────────────────────────────────────
 * 监控认知系统中的异常事件，触发裂变序列：
 * 异常感知 → 悬置 → 自问 → 最小重构 → 完整性校验
 */
export class FissionLayer {
  /** 配置 */
  private config: FissionLayerConfig;
  /** 裂变事件历史 */
  private fissionHistory: FissionEvent[] = [];
  /** 最大历史长度 */
  private maxHistory: number = 50;
  /** 当前是否处于悬置状态 */
  private suspended: boolean = false;
  /** 悬置开始时间 */
  private suspendStartTime: number = 0;
  /** 最近裂变时间戳（用于频率控制） */
  private recentFissionTimestamps: number[] = [];
  /** 当前认知构型（引用外部状态） */
  private currentPhase: CognitivePhase = CognitivePhase.Panshi;

  constructor(config: Partial<FissionLayerConfig> = {}) {
    this.config = { ...DEFAULT_FISSION_CONFIG, ...config };
  }

  /**
   * 设置当前认知构型
   */
  setPhase(phase: CognitivePhase): void {
    this.currentPhase = phase;
  }

  /**
   * 感知异常并触发裂变序列
   * @param anomaly 检测到的异常事件
   * @returns 裂变事件结果（如果触发），或 null（未触发）
   */
  perceiveAndFission(anomaly: AnomalyEvent): FissionEvent | null {
    // 1. 频率检查
    if (!this.checkFrequency()) return null;

    // 2. 严重度检查
    if (anomaly.severity < this.config.minSeverityThreshold) return null;

    // 3. 灵敏度调整后的严重度
    const adjustedSeverity = anomaly.severity * (1 + this.config.sensitivity * 0.5);
    if (adjustedSeverity < 0.5) return null;

    const startTime = Date.now();

    // 4. 悬置
    this.suspend();
    const suspendDuration = Date.now() - startTime;

    // 5. 自问 → 生成重构方案
    const plan = this.selfInquiry(anomaly);

    // 6. 最小重构
    const refactored = this.applyMinimalRefactor(plan);

    // 7. 完整性校验
    let integrityPassed = true;
    let integrityDetails = '结构完整性校验通过';
    if (this.config.enableIntegrityCheck) {
      const integrityResult = this.integrityCheck(plan, anomaly);
      integrityPassed = integrityResult.passed;
      integrityDetails = integrityResult.details;
    }

    // 8. 释放悬置
    this.release();

    const duration = Date.now() - startTime;

    // 9. 记录裂变事件
    const fissionEvent: FissionEvent = {
      anomaly,
      plan,
      integrityPassed,
      integrityDetails,
      skillCreated: false,
      duration,
      timestamp: startTime,
      resultingPhase: this.currentPhase
    };

    // 记录频率
    this.recentFissionTimestamps.push(startTime);
    this.fissionHistory.push(fissionEvent);

    if (this.fissionHistory.length > this.maxHistory) {
      this.fissionHistory.shift();
    }

    // 如果完整性校验失败，重置状态但不抛出错误
    if (!integrityPassed) {
      fissionEvent.integrityDetails = `⚠️ 完整性校验未完全通过：${integrityDetails}`;
    }

    return fissionEvent;
  }

  /**
   * 频率检查
   */
  private checkFrequency(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.recentFissionTimestamps = this.recentFissionTimestamps.filter(t => t > oneMinuteAgo);
    return this.recentFissionTimestamps.length < this.config.maxFreqPerMinute;
  }

  /**
   * 悬置：暂停正常处理流程
   */
  private suspend(): void {
    this.suspended = true;
    this.suspendStartTime = Date.now();
  }

  /**
   * 释放悬置
   */
  private release(): void {
    this.suspended = false;
    this.suspendStartTime = 0;
  }

  /**
   * 是否处于悬置状态
   */
  isSuspended(): boolean {
    return this.suspended;
  }

  /**
   * 自问：分析异常，生成最小重构方案
   */
  private selfInquiry(anomaly: AnomalyEvent): RefactorPlan {
    switch (anomaly.type) {
      case AnomalyType.AxiomConflict:
        return this.handleAxiomConflict(anomaly);
      case AnomalyType.BoundaryOverflow:
        return this.handleBoundaryOverflow(anomaly);
      case AnomalyType.SelfReferenceParadox:
        return this.handleSelfReferenceParadox(anomaly);
      case AnomalyType.StructuralMismatch:
        return this.handleStructuralMismatch(anomaly);
      case AnomalyType.EntropyExplosion:
        return this.handleEntropyExplosion(anomaly);
      default:
        return {
          targetPath: 'default',
          refactorType: 'parameter_adjust',
          description: `默认重构：调整灵敏度参数以响应${ANOMALY_TYPE_NAMES[anomaly.type]}`,
          parameters: { sensitivity: this.config.sensitivity + 0.1 },
          impactScope: '全局感知灵敏度'
        };
    }
  }

  /**
   * 处理公理冲突：调整公理优先级或重新排序
   */
  private handleAxiomConflict(anomaly: AnomalyEvent): RefactorPlan {
    return {
      targetPath: `axiom:${anomaly.triggerPath}`,
      refactorType: 'axiom_reorder',
      description: `公理冲突：${anomaly.description}。重新评估公理优先级排序。`,
      parameters: {
        reorderStrategy: 'rotate',
        affectedAxiom: anomaly.triggerPath,
        newConfidence: 0.7
      },
      impactScope: `认知构型${COGNITIVE_PHASE_NAMES[this.currentPhase]}的公理优先级排序`
    };
  }

  /**
   * 处理边界溢出：扩展认知构型参数或切换构型
   */
  private handleBoundaryOverflow(anomaly: AnomalyEvent): RefactorPlan {
    const config = DEFAULT_PHASE_CONFIGS[this.currentPhase];
    return {
      targetPath: `phase:${this.currentPhase}`,
      refactorType: 'parameter_adjust',
      description: `边界溢出：${anomaly.description}。扩展当前构型的并行路径数以增加处理能力。`,
      parameters: {
        parallelPaths: Math.min(config.parallelPaths + 2, 16),
        stability: Math.max(config.stability - 0.1, 0.0)
      },
      impactScope: '当前认知构型的处理能力边界'
    };
  }

  /**
   * 处理自指涉悖论：降低自指涉深度
   */
  private handleSelfReferenceParadox(anomaly: AnomalyEvent): RefactorPlan {
    const config = DEFAULT_PHASE_CONFIGS[this.currentPhase];
    return {
      targetPath: 'self_reference_depth',
      refactorType: 'parameter_adjust',
      description: `自指涉悖论：${anomaly.description}。降低自指涉深度以打破循环。`,
      parameters: {
        depth: Math.max(config.selfReferenceDepth - 2, 0)
      },
      impactScope: '认知系统的自指涉深度配置'
    };
  }

  /**
   * 处理结构失配：切换认知构型
   */
  private handleStructuralMismatch(anomaly: AnomalyEvent): RefactorPlan {
    return {
      targetPath: 'cognitive_phase',
      refactorType: 'structure_rewrite',
      description: `结构失配：${anomaly.description}。当前构型无法匹配输入结构，建议切换构型。`,
      parameters: {
        suggestedPhase: CognitivePhase.Wenhe,
        transitionReason: '结构失配触发紊核切换'
      },
      impactScope: '认知构型切换'
    };
  }

  /**
   * 处理信息熵爆炸：增加并行路径并降低稳定性要求
   */
  private handleEntropyExplosion(anomaly: AnomalyEvent): RefactorPlan {
    return {
      targetPath: 'entropy_handling',
      refactorType: 'parameter_adjust',
      description: `信息熵爆炸：${anomaly.description}。增加并行路径并降低稳定性要求以吸收高熵输入。`,
      parameters: {
        parallelPaths: 12,
        stabilityThreshold: 0.3,
        creativityNoise: 0.8
      },
      impactScope: '认知系统的高熵信息处理能力'
    };
  }

  /**
   * 执行最小重构
   */
  private applyMinimalRefactor(plan: RefactorPlan): boolean {
    // 在实际系统中，这里会修改认知结构的配置参数
    // 当前实现为记录重构意图，具体参数调整由上层调用者执行
    return true;
  }

  /**
   * 完整性校验
   */
  private integrityCheck(plan: RefactorPlan, anomaly: AnomalyEvent): { passed: boolean; details: string } {
    // 三级校验
    const checks: { name: string; passed: boolean; detail: string }[] = [];

    // 1. 自洽性校验：重构方案是否与自身一致
    checks.push({
      name: '自洽性',
      passed: plan.parameters !== undefined && Object.keys(plan.parameters).length > 0,
      detail: plan.parameters !== undefined && Object.keys(plan.parameters).length > 0
        ? '重构方案参数完整'
        : '重构方案参数缺失'
    });

    // 2. 最小影响校验：重构范围是否最小
    const isMinimal = plan.refactorType !== 'structure_rewrite' ||
      (plan.impactScope.length < 50);
    checks.push({
      name: '最小影响',
      passed: isMinimal,
      detail: isMinimal ? '重构影响范围可控' : '重构范围较大，需确认必要性'
    });

    // 3. 可逆性校验：重构是否可回退
    const reversible = plan.refactorType !== 'structure_rewrite';
    checks.push({
      name: '可逆性',
      passed: reversible,
      detail: reversible ? '重构可回退' : '结构重写不可直接回退'
    });

    const failed = checks.filter(c => !c.passed);
    const details = failed.length > 0
      ? failed.map(c => `${c.name}：${c.detail}`).join('；')
      : '所有三级校验通过';

    return {
      passed: failed.length === 0,
      details
    };
  }

  /**
   * 获取裂变历史
   */
  getFissionHistory(): FissionEvent[] {
    return [...this.fissionHistory];
  }

  /**
   * 获取最近N次裂变事件
   */
  getRecentFissions(n: number = 5): FissionEvent[] {
    return this.fissionHistory.slice(-n);
  }

  /**
   * 获取裂变频率（次/分钟）
   */
  getFissionRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return this.recentFissionTimestamps.filter(t => t > oneMinuteAgo).length;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FissionLayerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 重置
   */
  reset(): void {
    this.fissionHistory = [];
    this.recentFissionTimestamps = [];
    this.suspended = false;
    this.suspendStartTime = 0;
  }
}

/**
 * 默认全局裂变层实例
 */
export const defaultFissionLayer = new FissionLayer();