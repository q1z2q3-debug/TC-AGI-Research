/**
 * 研究引擎层 (Engine Layer)
 * 负责推理、决策、任务分解、策略派生
 * 集成认知空间，实现认知驱动的任务执行
 */

import { IdeologyLayer } from './ideology';
import { CognitiveSpace } from '../cognitive/cognitive-space';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader, SkillMatch } from '../skills/skill-loader';
import { MCPAdapter, ToolMatch } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
import { LLMProvider } from '../cognitive/llm';
import { NullEngine } from '../cognitive/null-engine';
import { ActiveInference, CognitiveAction } from '../cognitive/active-inference';
import { PrototypeMatcher } from '../cognitive/prototypes';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface TaskStep {
  id: string;
  description: string;
  skill?: string;
  tool?: string;
  parameters?: any;
  dependencies?: string[];
  status: 'pending' | 'running' | 'done' | 'error';
  retries: number;
  maxRetries: number;
  result?: any;
  error?: string;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  cognitiveState?: any;
  strategy?: any;
  context?: any;
}

export interface ExecutionResult {
  planId: string;
  status: TaskPlan['status'];
  results: any[];
  errors: string[];
  duration: number;
}

/**
 * LLM 失败归因结果。
 * 取代原先"成功/失败"的二元复盘，给出真正可复用的根因与修正建议。
 */
export interface FailureAttribution {
  /** 一句话根因：聚焦真正原因，而非表面报错 */
  rootCause: string;
  /** 失败步骤 id（可定位时），否则 null */
  failedStep: string | null;
  /** 失败类别，用于归类与后续针对性改进 */
  category:
    | 'skill_mismatch'   // 技能与任务不匹配 / 技能不存在
    | 'tool_failure'     // 工具执行报错
    | 'param_error'      // 参数构造错误
    | 'dependency_blocked' // 上游依赖未完成导致阻塞
    | 'timeout'          // 超时
    | 'llm_error'        // 大模型本身异常
    | 'unknown';
  /** 针对根因的具体修正建议（下一步该改什么） */
  correctiveAction: string;
  /** 归因置信度 0~1 */
  confidence: number;
  /** 一句可复用的经验教训 */
  lesson: string;
}

const ATTRIBUTION_SYSTEM_PROMPT = `你是一个严谨的 AI 任务失败归因分析器。给定一次任务执行的复盘材料（目标、各步骤状态、错误、结果），请穿透表面报错，定位真正的失败根因，并给出可操作的修正建议。

只输出 JSON，格式严格为：
{
  "rootCause": "一句话根因（聚焦真正原因，而非表面报错）",
  "failedStep": "失败步骤的 id（若能定位，否则为 null）",
  "category": "skill_mismatch|tool_failure|param_error|dependency_blocked|timeout|llm_error|unknown",
  "correctiveAction": "针对根因的具体修正建议（下一步该改什么）",
  "confidence": 0.0到1.0之间的小数,
  "lesson": "一句可复用的经验教训"
}`;

export class EngineLayer {
  private ideology: IdeologyLayer;
  private cognitive: CognitiveSpace;
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;
  private events = new Subject<any>();
  private plans: Map<string, TaskPlan> = new Map();
  private runningPlans: Set<string> = new Set();
  private readonly MAX_RETRIES = 3;
  private llm: LLMProvider | null = null;
  private nullEngine: NullEngine | null = null;

  constructor(
    ideology: IdeologyLayer,
    cognitive: CognitiveSpace,
    memory: MemorySystem,
    skillLoader: SkillLoader,
    mcp: MCPAdapter,
    scheduler: CronScheduler
  ) {
    this.ideology = ideology;
    this.cognitive = cognitive;
    this.memory = memory;
    this.skillLoader = skillLoader;
    this.mcp = mcp;
    this.scheduler = scheduler;
  }

  async initialize() {
    // 初始化空引擎（技能创造闭环）
    this.nullEngine = new NullEngine({
      registerSkill: (skill) => this.skillLoader.registerSkill(skill),
      hasSkill: (name) => this.skillLoader.getSkill(name) !== undefined,
      saveMemory: async (memory) => this.memory.save(memory),
      retrieveMemory: (query, limit) => this.memory.retrieve(query, limit || 5),
      llmComplete: this.llm
        ? (sys, user) => this.llm!.complete(sys, user)
        : undefined
    });

    console.log('⚙️ 研究引擎层初始化完成（含空引擎·技能创造闭环）');
    this.events.next({ type: 'engine-ready' });
  }

  /** 接入 LLM（真实 DeepSeek / 测试用 FakeLLM），用于失败归因等语义分析 */
  setLLM(client: LLMProvider): void {
    this.llm = client;
  }

  get hasLLM(): boolean {
    return this.llm !== null;
  }

  /**
   * 认知驱动的任务分解
   */
  async decomposeTask(goal: string, context?: any): Promise<TaskPlan> {
    // 1. 感知当前认知状态
    const cognitiveState = this.cognitive.perceive(goal);

    // 2. 推理策略
    const strategy = this.deriveStrategy(cognitiveState);

    // 3. 获取相关记忆
    const memories = this.memory.retrieve(goal, 5);

    // 4. 语义检索最相关技能与工具（替代脆弱的关键词匹配）
    const skillMatches = await this.skillLoader.matchSkills(goal, 5, 0.25);
    const toolMatches = await this.mcp.matchTools(goal, 5, 0.25);

    // 5. 生成步骤
    const steps = this.generateSteps(goal, strategy, skillMatches, toolMatches, memories);

    const plan: TaskPlan = {
      id: `plan-${uuidv4().slice(0, 8)}`,
      goal,
      steps,
      priority: this.calcPriority(strategy),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      cognitiveState,
      strategy,
      context
    };

    this.plans.set(plan.id, plan);
    this.events.next({ type: 'plan-created', plan });
    return plan;
  }

  /**
   * 基于认知状态派生策略
   *
   * 升级：集成主动推理引擎（Active Inference），
   *      通过自由能最小化选择最优认知行动，
   *      而非仅依靠简单的多数态判断。
   */
  private deriveStrategy(state: any): any {
    const majority = state.vector ? this.getMajority(state.vector) : 0;
    const snapshot = this.cognitive.getSnapshot();

    // 基础策略（保留原有逻辑作为回退）
    let strategy: any = {
      name: '平衡策略',
      mode: 'observe',
      priority: 2,
      steps: []
    };

    if (majority === 1) {
      // 扩张态
      if (state.vector.internal === 1 && state.vector.external === 1) {
        strategy = { name: '内外协同·全面扩张', mode: 'expand', priority: 1, confidence: 0.85 };
      } else if (state.vector.internal === 1) {
        strategy = { name: '由内向外·稳健扩张', mode: 'expand', priority: 1, confidence: 0.75 };
      } else {
        strategy = { name: '积极进取·快速推进', mode: 'expand', priority: 1, confidence: 0.65 };
      }
    } else if (majority === -1) {
      // 收缩态
      if (state.vector.internal === -1) {
        strategy = { name: '修复内核·稳固根基', mode: 'contract', priority: 3, confidence: 0.8 };
      } else if (state.vector.external === -1) {
        strategy = { name: '环境防御·保存实力', mode: 'contract', priority: 2, confidence: 0.75 };
      } else {
        strategy = { name: '收缩反思·等待时机', mode: 'contract', priority: 2, confidence: 0.6 };
      }
    } else {
      // 观察态
      if (state.vector.medial === 1) {
        strategy = { name: '通道畅通·连接探索', mode: 'observe', priority: 2, confidence: 0.7 };
      } else {
        strategy = { name: '信息收集·认知准备', mode: 'observe', priority: 2, confidence: 0.65 };
      }
    }

    // 因果维度调节
    if (state.vector.cause === 1 && state.vector.condition === 1) {
      strategy.confidence = Math.min(1, (strategy.confidence || 0.5) + 0.15);
    }

    // ═══ 主动推理增强 ═══
    // 使用主动推理引擎选择最优认知行动
    try {
      const history = this.cognitive.getHistory().map(h => h.vector);
      const inference = ActiveInference.infer(state.vector, history, {
        freeEnergyThreshold: 0.1,
        transitionPenalty: 0.1,
        useHistory: history.length >= 2
      });

      // 如果主动推理建议的行动与基础策略不同，且自由能改善显著，则采纳
      if (inference.bestAction !== 'hold' &&
          inference.freeEnergyReduction > 0.05 &&
          inference.confidence > 0.5) {
        const actionToMode: Record<CognitiveAction, string> = {
          expand: 'expand',
          contract: 'contract',
          observe: 'observe',
          transform: 'observe',  // 转化映射为观察（需要特殊处理）
          create: 'expand',      // 创生映射为扩张
          hold: 'observe'
        };
        const inferredMode = actionToMode[inference.bestAction];
        if (inferredMode !== strategy.mode) {
          strategy.inferredAction = inference.bestAction;
          strategy.inferenceConfidence = inference.confidence;
          strategy.freeEnergyReduction = inference.freeEnergyReduction;
          strategy.targetPrototype = inference.targetPrototype.name;
        }
      }

      // 添加原型推荐
      const recommendation = PrototypeMatcher.recommendAction(state.vector);
      strategy.prototypeRecommendation = recommendation;
    } catch {
      // 主动推理失败不影响基础策略
    }

    return strategy;
  }

  private getMajority(vector: any): number {
    const vals = [vector.past, vector.present, vector.future,
      vector.internal, vector.medial, vector.external,
      vector.cause, vector.condition, vector.effect];
    const sum = vals.reduce((a: number, b: number) => a + b, 0);
    if (sum > 1) return 1;
    if (sum < -1) return -1;
    return 0;
  }

  private calcPriority(strategy: any): number {
    return strategy.priority || 2;
  }

  /**
   * 生成任务步骤
   *
   * 修复：原先步骤 ID 使用 `step-${Date.now()}-N` 但依赖引用 `['step-1']` 等不匹配的字符串，
   *      导致 executePlan 中依赖检查永远失败，后续步骤被静默跳过。
   *      现改为先生成完整 ID 数组，再以数组索引引用依赖，确保 ID 一致。
   */
  private generateSteps(
    goal: string,
    strategy: any,
    skillMatches: SkillMatch[],
    toolMatches: ToolMatch[],
    memories: any[]
  ): TaskStep[] {
    const steps: TaskStep[] = [];
    const mode = strategy.mode || 'observe';
    const baseTime = Date.now();

    // 预生成四个步骤的 ID，确保依赖引用一致
    const stepIds = [1, 2, 3, 4].map(n => `step-${baseTime}-${n}`);

    // 步骤1: 认知定位（总是第一步）
    steps.push({
      id: stepIds[0],
      description: '认知定位与态势感知',
      skill: 'self-evolve',
      parameters: { action: 'perceive', goal },
      status: 'pending',
      retries: 0,
      maxRetries: 1
    });

    // 步骤2: 信息检索
    steps.push({
      id: stepIds[1],
      description: '检索相关记忆与知识',
      skill: 'memory-retrieve',
      parameters: { query: goal, limit: 5 },
      dependencies: [stepIds[0]],
      status: 'pending',
      retries: 0,
      maxRetries: 2
    });

    // 步骤3: 主要执行（根据策略模式）
    let mainStep: TaskStep;
    if (mode === 'expand') {
      mainStep = {
        id: stepIds[2],
        description: `主动执行: ${goal}`,
        parameters: { goal, strategy, mode: 'expand' },
        dependencies: [stepIds[1]],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    } else if (mode === 'contract') {
      mainStep = {
        id: stepIds[2],
        description: `收缩聚焦: ${goal}`,
        parameters: { goal, strategy, mode: 'contract' },
        dependencies: [stepIds[1]],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    } else {
      mainStep = {
        id: stepIds[2],
        description: `观察学习: ${goal}`,
        parameters: { goal, strategy, mode: 'observe' },
        dependencies: [stepIds[1]],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    }

    // 尝试匹配技能（语义检索优先，无向量时自动回退关键词）
    const bestSkill = skillMatches[0];
    if (bestSkill && bestSkill.score > 0) {
      mainStep.skill = bestSkill.skill.name;
    }
    // 尝试匹配工具
    const bestTool = toolMatches[0];
    if (bestTool && bestTool.score > 0) {
      mainStep.tool = bestTool.tool.name;
    }

    steps.push(mainStep);

    // 步骤4: 验证与复盘
    steps.push({
      id: stepIds[3],
      description: '验证结果并提取经验',
      skill: 'self-evolve',
      parameters: { action: 'evolve' },
      dependencies: [stepIds[2]],
      status: 'pending',
      retries: 0,
      maxRetries: 1
    });

    return steps;
  }

  /**
   * 执行任务计划
   */
  async executePlan(planId: string): Promise<ExecutionResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    if (this.runningPlans.has(planId)) {
      throw new Error(`Plan ${planId} is already running`);
    }

    this.runningPlans.add(planId);
    plan.status = 'running';
    plan.updatedAt = new Date();
    this.events.next({ type: 'plan-running', planId });

    const startTime = Date.now();
    const results: any[] = [];
    const errors: string[] = [];
    let allDone = true;

    try {
      for (const step of plan.steps) {
        if (step.status === 'done') continue;

        // 检查依赖
        if (step.dependencies) {
          const depsDone = step.dependencies.every(depId => {
            const dep = plan.steps.find(s => s.id === depId);
            return dep && dep.status === 'done';
          });
          if (!depsDone) {
            continue;
          }
        }

        // 执行步骤（带重试）
        let success = false;
        let lastError: any = null;
        for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
          step.status = 'running';
          step.retries = attempt;
          try {
            const result = await this.executeStep(step, plan);
            step.status = 'done';
            step.result = result;
            results.push(result);
            success = true;
            break;
          } catch (error) {
            lastError = error;
            step.error = String(error);
            this.events.next({ type: 'step-retry', planId, stepId: step.id, attempt, error });
            if (attempt < step.maxRetries) {
              await this.delay(1000 * (attempt + 1)); // 退避延迟
            }
          }
        }

        if (!success) {
          step.status = 'error';
          errors.push(`步骤 ${step.id} 失败: ${lastError}`);
          allDone = false;
          // 继续执行其他步骤（不阻断）
        }
      }

      // 更新计划状态
      const hasError = plan.steps.some(s => s.status === 'error');
      const allDoneSteps = plan.steps.every(s => s.status === 'done' || s.status === 'error');

      if (allDoneSteps && !hasError) {
        plan.status = 'completed';
      } else if (hasError) {
        plan.status = 'failed';
      } else {
        plan.status = 'running'; // 还有待执行步骤
      }

      // 进化：根据结果调整认知
      await this.evolveFromResults(plan, results, errors);

    } finally {
      plan.updatedAt = new Date();
      this.runningPlans.delete(planId);
      this.events.next({ type: 'plan-done', planId, status: plan.status });
    }

    return {
      planId,
      status: plan.status,
      results,
      errors,
      duration: Date.now() - startTime
    };
  }

  /**
   * 执行单个步骤
   *
   * 修复：原先当 step.skill 指定但技能不存在时，静默落入通用执行并返回"成功"，
   *      导致失败被掩盖、复盘无意义。现改为：
   *      1. 技能不存在时尝试通过空引擎创造（技能创造闭环）
   *      2. 创造失败则抛出明确错误（触发重试与归因）
   *      3. 工具不存在时同理（抛出错误）
   *      4. 仅当未指定 skill/tool 时才走通用执行
   */
  private async executeStep(step: TaskStep, plan: TaskPlan): Promise<any> {
    // 如果有skill，执行skill
    if (step.skill) {
      const skill = this.skillLoader.getSkill(step.skill);
      if (!skill) {
        // 尝试通过空引擎创造技能
        if (this.nullEngine) {
          console.log(`🔮 技能 "${step.skill}" 不存在，启动空引擎创造...`);
          const creation = await this.nullEngine.createSkill({
            missingSkillName: step.skill,
            goal: plan.goal,
            stepDescription: step.description,
            parameters: step.parameters
          });
          if (creation.success && creation.skill) {
            this.events.next({ type: 'skill-created', skillName: step.skill, planId: plan.id });
            return await creation.skill.execute(step.parameters || {});
          }
        }
        throw new Error(`技能 "${step.skill}" 未注册且空引擎创造失败，无法执行步骤: ${step.description}`);
      }
      return await skill.execute(step.parameters || {});
    }

    // 如果有tool，执行tool
    if (step.tool) {
      const tool = this.mcp.getTool(step.tool);
      if (!tool) {
        throw new Error(`工具 "${step.tool}" 未注册，无法执行步骤: ${step.description}`);
      }
      return await tool.execute(step.parameters || {});
    }

    // 通用执行（仅当未指定 skill/tool 时）
    return { step: step.id, status: 'done', result: `executed: ${step.description}`, timestamp: new Date() };
  }

  /**
   * 真正的失败归因：仅当任务失败且已接入 LLM 时调用。
   * 将复盘材料交给 LLM，穿透表面报错定位根因、归类、给出修正建议与可复用教训。
   * 无 LLM 或 LLM 异常 / 解析失败时返回 null（触发优雅降级）。
   */
  private async attributeFailure(
    plan: TaskPlan,
    results: any[],
    errors: string[]
  ): Promise<FailureAttribution | null> {
    if (!this.llm) return null;

    const payload = {
      goal: plan.goal,
      steps: plan.steps.map(s => ({
        id: s.id,
        description: s.description,
        skill: s.skill,
        tool: s.tool,
        status: s.status,
        error: s.error,
        retries: s.retries
      })),
      results,
      errors
    };

    try {
      const raw = await this.llm.complete(
        ATTRIBUTION_SYSTEM_PROMPT,
        `复盘材料：\n${JSON.stringify(payload, null, 2)}`
      );
      const parsed = JSON.parse(raw) as Partial<FailureAttribution>;
      if (!parsed || typeof parsed.rootCause !== 'string') return null;

      const category = parsed.category;
      const validCategories: FailureAttribution['category'][] = [
        'skill_mismatch', 'tool_failure', 'param_error',
        'dependency_blocked', 'timeout', 'llm_error', 'unknown'
      ];
      return {
        rootCause: String(parsed.rootCause),
        failedStep: parsed.failedStep ?? null,
        category: validCategories.includes(category as any) ? (category as FailureAttribution['category']) : 'unknown',
        correctiveAction: String(parsed.correctiveAction || ''),
        confidence: typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
        lesson: String(parsed.lesson || parsed.rootCause)
      };
    } catch (e) {
      // 归因失败（网络/解析）→ 不阻断主流程，降级为无归因复盘
      return null;
    }
  }

  /**
   * 根据执行结果进化认知：写入复盘记忆，失败时用 LLM 归因驱动认知与后续改进。
   * 改为 public 以便外部/测试手动触发复盘。
   */
  async evolveFromResults(plan: TaskPlan, results: any[], errors: string[]) {
    const success = errors.length === 0;

    // 真正的失败归因：仅当失败且已接入 LLM 时调用
    let attribution: FailureAttribution | null = null;
    if (!success && this.llm) {
      attribution = await this.attributeFailure(plan, results, errors);
    }

    const experience = {
      goal: plan.goal,
      success,
      steps: plan.steps.map(s => ({ id: s.id, status: s.status })),
      results,
      errors,
      attribution,
      timestamp: new Date()
    };

    // 更新认知空间：成功 → 泛化；失败且有归因 → 用归因教训驱动（而非泛化字符串）
    if (success) {
      this.cognitive.perceive(`任务成功: ${plan.goal}`);
    } else if (attribution) {
      this.cognitive.perceive(`任务失败·根因[${attribution.category}]: ${attribution.lesson}`);
    } else {
      this.cognitive.perceive(`任务失败: ${plan.goal}`);
    }

    // 写入记忆（归因作为可复用教训固化；标签含类别便于后续检索）
    await this.memory.save({
      type: 'feedback',
      name: `复盘-${plan.id}`,
      content: JSON.stringify(experience),
      tags: ['self-evolve', 'plan', success ? 'success' : 'failure']
        .concat(attribution ? ['failure-attribution', attribution.category] : [])
    });

    this.events.next({ type: 'evolved', planId: plan.id, success, attribution });

    // 显式输出归因，便于运维与调试
    if (attribution) {
      console.log(`🔍 失败归因[${attribution.category}] 根因: ${attribution.rootCause}`);
      console.log(`   ↳ 修正建议: ${attribution.correctiveAction} (置信度 ${(attribution.confidence * 100).toFixed(0)}%)`);
      console.log(`   ↳ 教训: ${attribution.lesson}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPlan(planId: string): TaskPlan | undefined {
    return this.plans.get(planId);
  }

  getAllPlans(): TaskPlan[] {
    return Array.from(this.plans.values());
  }

  getRunningPlans(): string[] {
    return Array.from(this.runningPlans);
  }
}
