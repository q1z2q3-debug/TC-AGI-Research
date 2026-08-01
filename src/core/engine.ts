/**
 * 研究引擎层 (Engine Layer)
 * 负责推理、决策、任务分解、策略派生
 * 集成认知空间，实现认知驱动的任务执行
 */

import { IdeologyLayer } from './ideology';
import { CognitiveSpace } from '../cognitive/cognitive-space';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
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
    console.log('⚙️ 研究引擎层初始化完成');
    this.events.next({ type: 'engine-ready' });
  }

  /**
   * 认知驱动的任务分解
   */
  decomposeTask(goal: string, context?: any): TaskPlan {
    // 1. 感知当前认知状态
    const cognitiveState = this.cognitive.perceive(goal);

    // 2. 推理策略
    const strategy = this.deriveStrategy(cognitiveState);

    // 3. 获取相关记忆
    const memories = this.memory.retrieve(goal, 5);

    // 4. 获取可用技能和工具
    const availableSkills = this.skillLoader.getAvailableSkills();
    const availableTools = this.mcp.getAvailableTools();

    // 5. 生成步骤
    const steps = this.generateSteps(goal, strategy, availableSkills, availableTools, memories);

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
   */
  private deriveStrategy(state: any): any {
    const majority = state.vector ? this.getMajority(state.vector) : 0;
    const snapshot = this.cognitive.getSnapshot();

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
   */
  private generateSteps(
    goal: string,
    strategy: any,
    skills: string[],
    tools: string[],
    memories: any[]
  ): TaskStep[] {
    const steps: TaskStep[] = [];
    const mode = strategy.mode || 'observe';

    // 步骤1: 认知定位（总是第一步）
    steps.push({
      id: `step-${Date.now()}-1`,
      description: '认知定位与态势感知',
      skill: 'self-evolve',
      parameters: { action: 'perceive', goal },
      status: 'pending',
      retries: 0,
      maxRetries: 1
    });

    // 步骤2: 信息检索
    steps.push({
      id: `step-${Date.now()}-2`,
      description: '检索相关记忆与知识',
      skill: 'memory-retrieve',
      parameters: { query: goal, limit: 5 },
      dependencies: ['step-1'],
      status: 'pending',
      retries: 0,
      maxRetries: 2
    });

    // 步骤3: 主要执行（根据策略模式）
    let mainStep: TaskStep;
    if (mode === 'expand') {
      mainStep = {
        id: `step-${Date.now()}-3`,
        description: `主动执行: ${goal}`,
        parameters: { goal, strategy, mode: 'expand' },
        dependencies: ['step-2'],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    } else if (mode === 'contract') {
      mainStep = {
        id: `step-${Date.now()}-3`,
        description: `收缩聚焦: ${goal}`,
        parameters: { goal, strategy, mode: 'contract' },
        dependencies: ['step-2'],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    } else {
      mainStep = {
        id: `step-${Date.now()}-3`,
        description: `观察学习: ${goal}`,
        parameters: { goal, strategy, mode: 'observe' },
        dependencies: ['step-2'],
        status: 'pending',
        retries: 0,
        maxRetries: this.MAX_RETRIES
      };
    }

    // 尝试匹配技能
    for (const skill of skills) {
      if (goal.toLowerCase().includes(skill.toLowerCase())) {
        mainStep.skill = skill;
        break;
      }
    }
    for (const tool of tools) {
      if (goal.toLowerCase().includes(tool.toLowerCase())) {
        mainStep.tool = tool;
        break;
      }
    }

    steps.push(mainStep);

    // 步骤4: 验证与复盘
    steps.push({
      id: `step-${Date.now()}-4`,
      description: '验证结果并提取经验',
      skill: 'self-evolve',
      parameters: { action: 'evolve' },
      dependencies: ['step-3'],
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

  private async executeStep(step: TaskStep, plan: TaskPlan): Promise<any> {
    // 如果有skill，执行skill
    if (step.skill) {
      const skill = this.skillLoader.getSkill(step.skill);
      if (skill) {
        return await skill.execute(step.parameters || {});
      }
    }

    // 如果有tool，执行tool
    if (step.tool) {
      const tool = this.mcp.getTool(step.tool);
      if (tool) {
        return await tool.execute(step.parameters || {});
      }
    }

    // 通用执行
    return { step: step.id, status: 'done', result: `executed: ${step.description}`, timestamp: new Date() };
  }

  private async evolveFromResults(plan: TaskPlan, results: any[], errors: string[]) {
    const success = errors.length === 0;
    const experience = {
      goal: plan.goal,
      success,
      steps: plan.steps.map(s => ({ id: s.id, status: s.status })),
      results,
      errors,
      timestamp: new Date()
    };

    // 更新认知空间
    this.cognitive.perceive(`任务${success ? '成功' : '失败'}: ${plan.goal}`);

    // 写入记忆
    await this.memory.save({
      type: 'feedback',
      name: `复盘-${plan.id}`,
      content: JSON.stringify(experience),
      tags: ['self-evolve', 'plan', success ? 'success' : 'failure']
    });

    this.events.next({ type: 'evolved', planId: plan.id, success });
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
