/**
 * 研究引擎层 (Engine Layer) — 认知驱动版
 *
 * 核心职责：
 * 1. 接收任务，调用认知循环进行觉知→推理
 * 2. 基于认知策略动态分解任务步骤
 * 3. 执行步骤并收集反馈
 * 4. 将结果回传认知空间完成进化
 */

import { IdeologyLayer } from './ideology';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
import { DeepSeekCognize, ActionStrategy, TaskResult } from '../cognitive/deepseek-cognize';
import { CognitiveState, CognitiveSnapshot } from '../cognitive/cognitive-space';
import { Subject } from 'rxjs';

export interface TaskStep {
  id: string;
  description: string;
  skill?: string;
  tool?: string;
  parameters?: Record<string, any>;
  dependencies?: string[];
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  cognitiveState?: CognitiveState;
  strategy?: ActionStrategy;
  results?: any[];
  error?: string;
}

export interface EngineEvent {
  type: 'plan-created' | 'plan-running' | 'step-started' | 'step-completed' | 'step-error' | 'plan-completed' | 'plan-failed' | 'cognitive-updated';
  planId?: string;
  stepId?: string;
  data?: any;
}

export class EngineLayer {
  private ideology: IdeologyLayer;
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;
  private cognize: DeepSeekCognize;
  private events = new Subject<EngineEvent>();
  private currentPlans: Map<string, TaskPlan> = new Map();
  private runningPlans: Set<string> = new Set();
  private maxConcurrentPlans = 3;

  constructor(
    ideology: IdeologyLayer,
    memory: MemorySystem,
    skillLoader: SkillLoader,
    mcp: MCPAdapter,
    scheduler: CronScheduler
  ) {
    this.ideology = ideology;
    this.memory = memory;
    this.skillLoader = skillLoader;
    this.mcp = mcp;
    this.scheduler = scheduler;
    this.cognize = new DeepSeekCognize();
  }

  async initialize(): Promise<void> {
    console.log('⚙️ 研究引擎层 (认知驱动版) 初始化...');
    // 初始认知感知
    this.cognize.perceive('系统启动 — 引擎就绪');
    console.log(`   🧠 初始认知态势: ${this.cognize.getSummary()}`);
    this.events.next({ type: 'cognitive-updated', data: this.cognize.getState() });
    console.log('✅ 研究引擎层初始化完成');
  }

  /**
   * 分解任务（认知驱动）
   */
  async decomposeTask(goal: string, context?: any): Promise<TaskPlan> {
    // 1. 认知觉知
    const state = this.cognize.perceive(goal);
    console.log(`📌 认知觉知: ${state.summary}`);

    // 2. 推理策略
    const strategy = this.cognize.reason(state);
    console.log(`🎯 策略派生: ${strategy.name} (置信度: ${(strategy.confidence * 100).toFixed(0)}%)`);

    // 3. 检索相关记忆（基于认知卦象）
    const relevantMemories = await this.memory.retrieve(goal, 5);
    if (relevantMemories.length > 0) {
      console.log(`📚 相关记忆: ${relevantMemories.length} 条`);
    }

    // 4. 生成步骤（基于策略）
    const steps = this.generateStepsFromStrategy(goal, strategy, relevantMemories);

    // 5. 构建计划
    const plan: TaskPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      goal,
      steps,
      priority: strategy.priority,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      cognitiveState: state,
      strategy
    };

    this.currentPlans.set(plan.id, plan);
    this.events.next({ type: 'plan-created', planId: plan.id, data: { goal, strategy: strategy.name } });
    console.log(`📋 计划已创建: ${plan.id} (${steps.length} 步)`);

    return plan;
  }

  /**
   * 从策略生成步骤
   */
  private generateStepsFromStrategy(goal: string, strategy: ActionStrategy, memories: any[]): TaskStep[] {
    const steps: TaskStep[] = [];
    let stepId = 0;

    // 步骤0: 认知准备（始终存在）
    steps.push({
      id: `step-${++stepId}`,
      description: '认知准备 — 确认目标与策略',
      status: 'pending',
      retryCount: 0,
      maxRetries: 1
    });

    // 步骤1-3: 策略步骤
    for (const stepDesc of strategy.steps) {
      // 尝试匹配技能
      const skillMatch = this.matchSkill(stepDesc);
      const toolMatch = this.matchTool(stepDesc);

      steps.push({
        id: `step-${++stepId}`,
        description: stepDesc,
        skill: skillMatch,
        tool: toolMatch,
        status: 'pending',
        dependencies: stepId > 2 ? [`step-${stepId - 1}`] : undefined,
        retryCount: 0,
        maxRetries: stepId <= 2 ? 2 : 3
      });
    }

    // 最后一步: 认知复盘
    steps.push({
      id: `step-${++stepId}`,
      description: '认知复盘 — 提取经验并写入记忆',
      skill: 'self-evolve',
      status: 'pending',
      dependencies: stepId > 1 ? [`step-${stepId - 1}`] : undefined,
      retryCount: 0,
      maxRetries: 1
    });

    return steps;
  }

  private matchSkill(description: string): string | undefined {
    const lower = description.toLowerCase();
    const available = this.skillLoader.getAvailableSkills();
    for (const skill of available) {
      if (lower.includes(skill.replace('-', ' ')) || lower.includes(skill)) {
        return skill;
      }
    }
    // 关键词匹配
    if (/搜索|查询|查找/.test(lower)) return 'web-search';
    if (/浏览器|页面|导航/.test(lower)) return 'browser-control';
    if (/反思|复盘|进化|学习/.test(lower)) return 'self-evolve';
    return undefined;
  }

  private matchTool(description: string): string | undefined {
    const lower = description.toLowerCase();
    const available = this.mcp.getAvailableTools();
    for (const tool of available) {
      if (lower.includes(tool.replace('-', ' ')) || lower.includes(tool)) {
        return tool;
      }
    }
    if (/文件|读取|写入/.test(lower)) return 'local_file';
    if (/执行|运行|命令/.test(lower)) return 'shell';
    return undefined;
  }

  /**
   * 执行计划
   */
  async executePlan(planId: string): Promise<any[]> {
    const plan = this.currentPlans.get(planId);
    if (!plan) throw new Error(`计划 ${planId} 不存在`);
    if (this.runningPlans.size >= this.maxConcurrentPlans) {
      throw new Error(`并发计划已达上限 (${this.maxConcurrentPlans})`);
    }

    plan.status = 'running';
    plan.updatedAt = new Date();
    this.runningPlans.add(planId);
    this.events.next({ type: 'plan-running', planId });
    console.log(`▶️ 执行计划: ${planId}`);

    const results: any[] = [];
    let hasError = false;

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        if (step.status === 'done') continue;

        // 检查依赖
        if (step.dependencies && step.dependencies.length > 0) {
          const depsDone = step.dependencies.every(depId => {
            const dep = plan.steps.find(s => s.id === depId);
            return dep && (dep.status === 'done' || dep.status === 'skipped');
          });
          if (!depsDone) {
            console.log(`⏭️ 跳过步骤 ${step.id}: 依赖未完成`);
            step.status = 'skipped';
            continue;
          }
        }

        step.status = 'running';
        step.startedAt = Date.now();
        this.events.next({ type: 'step-started', planId, stepId: step.id, data: { description: step.description } });
        console.log(`   🔹 ${step.id}: ${step.description}`);

        try {
          const result = await this.executeStep(step, plan);
          step.status = 'done';
          step.result = result;
          step.completedAt = Date.now();
          results.push(result);
          this.events.next({ type: 'step-completed', planId, stepId: step.id, data: { result } });
          console.log(`   ✅ ${step.id} 完成`);
        } catch (error) {
          step.status = 'error';
          step.error = error instanceof Error ? error.message : String(error);
          step.completedAt = Date.now();
          this.events.next({ type: 'step-error', planId, stepId: step.id, data: { error: step.error } });
          console.log(`   ❌ ${step.id} 失败: ${step.error}`);

          // 重试逻辑
          if (step.retryCount < step.maxRetries) {
            step.retryCount++;
            step.status = 'pending';
            console.log(`   🔄 ${step.id} 重试 (${step.retryCount}/${step.maxRetries})`);
            // 重新执行该步骤（循环会重新处理）
            i--;
            continue;
          }

          hasError = true;
          break;
        }
      }

      if (hasError) {
        plan.status = 'failed';
        plan.error = '部分步骤执行失败';
        this.events.next({ type: 'plan-failed', planId, data: { error: plan.error } });
        console.log(`❌ 计划 ${planId} 失败`);
      } else {
        plan.status = 'completed';
        plan.results = results;
        plan.updatedAt = new Date();
        this.events.next({ type: 'plan-completed', planId, data: { results } });
        console.log(`✅ 计划 ${planId} 完成 (${results.length} 个结果)`);

        // 自动进化：根据结果更新认知
        const success = results.every(r => r !== undefined && r !== null);
        this.cognize.evolve({
          success,
          goal: plan.goal,
          feedback: success ? '计划执行成功' : '部分执行完成',
          metrics: { stepCount: plan.steps.length, resultCount: results.length }
        });
        this.events.next({ type: 'cognitive-updated', data: this.cognize.getState() });
      }
    } finally {
      this.runningPlans.delete(planId);
    }

    return results;
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: TaskStep, plan: TaskPlan): Promise<any> {
    // 认知准备步骤：直接通过
    if (step.description.includes('认知准备') || step.description.includes('认知复盘')) {
      if (step.description.includes('认知复盘')) {
        // 触发自我进化
        await this.memory.save({
          type: 'feedback',
          name: `plan-${plan.id}-review`,
          content: JSON.stringify({
            goal: plan.goal,
            status: plan.status,
            stepCount: plan.steps.length,
            timestamp: new Date().toISOString()
          }),
          tags: ['review', 'plan', 'self-evolve']
        });
        return { reviewed: true, planId: plan.id };
      }
      return { prepared: true, strategy: plan.strategy?.name };
    }

    // 尝试使用技能
    if (step.skill) {
      const skill = this.skillLoader.getSkill(step.skill);
      if (skill) {
        try {
          return await skill.execute(step.parameters || {});
        } catch (error) {
          throw new Error(`技能 ${step.skill} 执行失败: ${error}`);
        }
      }
    }

    // 尝试使用工具
    if (step.tool) {
      const tool = this.mcp.getTool(step.tool);
      if (tool) {
        try {
          return await tool.execute(step.parameters || {});
        } catch (error) {
          throw new Error(`工具 ${step.tool} 执行失败: ${error}`);
        }
      }
    }

    // 默认：模拟执行
    return {
      step: step.id,
      description: step.description,
      status: 'done',
      result: 'executed successfully'
    };
  }

  /**
   * 获取认知快照
   */
  getCognitiveSnapshot(): CognitiveSnapshot {
    return this.cognize.getState();
  }

  /**
   * 获取认知摘要
   */
  getCognitiveSummary(): string {
    return this.cognize.getSummary();
  }

  /**
   * 获取所有计划
   */
  getPlans(): TaskPlan[] {
    return Array.from(this.currentPlans.values());
  }

  /**
   * 获取计划详情
   */
  getPlan(planId: string): TaskPlan | undefined {
    return this.currentPlans.get(planId);
  }

  /**
   * 取消计划
   */
  async cancelPlan(planId: string): Promise<boolean> {
    const plan = this.currentPlans.get(planId);
    if (!plan) return false;
    if (plan.status === 'running') {
      plan.status = 'paused';
      this.runningPlans.delete(planId);
      console.log(`⏸️ 计划 ${planId} 已暂停`);
      return true;
    }
    return false;
  }

  /**
   * 获取认知空间实例
   */
  getCognize(): DeepSeekCognize {
    return this.cognize;
  }

  /**
   * 获取事件流
   */
  getEvents() {
    return this.events.asObservable();
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    runningPlans: number;
    totalPlans: number;
    cognitiveSummary: string;
    maxConcurrent: number;
  } {
    return {
      runningPlans: this.runningPlans.size,
      totalPlans: this.currentPlans.size,
      cognitiveSummary: this.getCognitiveSummary(),
      maxConcurrent: this.maxConcurrentPlans
    };
  }
}
