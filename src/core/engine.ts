/**
 * 研究引擎层 (Engine Layer)
 * 负责推理、学习、决策、任务分解与规划
 * 对应三元一体中的 "研究引擎层"
 */

import { IdeologyLayer } from './ideology';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
import { Subject } from 'rxjs';

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
}

export interface TaskStep {
  id: string;
  description: string;
  skill?: string;
  tool?: string;
  parameters?: any;
  dependencies?: string[];
  status: 'pending' | 'running' | 'done' | 'error';
}

export class EngineLayer {
  private ideology: IdeologyLayer;
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;
  private events = new Subject<any>();
  private currentPlans: Map<string, TaskPlan> = new Map();

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
  }

  async initialize() {
    console.log('⚙️ 研究引擎层初始化完成');
    this.events.next({ type: 'engine-ready' });
  }

  /**
   * 任务分解：将高层目标拆解为可执行步骤
   */
  decomposeTask(goal: string, context?: any): TaskPlan {
    // 基于意识形态分析
    const ideologySummary = this.ideology.summarize();
    
    // 检索相关记忆
    const memories = this.memory.retrieve(goal);
    
    // 获取可用技能
    const skills = this.skillLoader.getAvailableSkills();
    const tools = this.mcp.getAvailableTools();

    // 构建任务步骤（简化版：直接生成步骤）
    const steps: TaskStep[] = this.generateSteps(goal, skills, tools);

    const plan: TaskPlan = {
      id: `plan-${Date.now()}`,
      goal,
      steps,
      priority: 1,
      status: 'pending',
      createdAt: new Date()
    };

    this.currentPlans.set(plan.id, plan);
    this.events.next({ type: 'plan-created', plan });
    return plan;
  }

  private generateSteps(goal: string, skills: string[], tools: string[]): TaskStep[] {
    // 简单步骤生成逻辑
    const steps: TaskStep[] = [];
    
    // 1. 信息收集步骤
    steps.push({
      id: `step-${Date.now()}-1`,
      description: '分析目标并检索相关记忆',
      skill: 'memory-retrieve',
      status: 'pending'
    });

    // 2. 主要执行步骤
    steps.push({
      id: `step-${Date.now()}-2`,
      description: '执行主要任务',
      status: 'pending',
      dependencies: ['step-1']
    });

    // 3. 验证与复盘步骤
    steps.push({
      id: `step-${Date.now()}-3`,
      description: '验证结果并提取经验',
      skill: 'self-evolve',
      status: 'pending',
      dependencies: ['step-2']
    });

    return steps;
  }

  /**
   * 执行任务计划
   */
  async executePlan(planId: string): Promise<any> {
    const plan = this.currentPlans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    plan.status = 'running';
    this.events.next({ type: 'plan-running', planId });

    const results: any[] = [];
    for (const step of plan.steps) {
      if (step.status === 'done') continue;
      // 检查依赖
      if (step.dependencies) {
        const depsDone = step.dependencies.every(depId => {
          const dep = plan.steps.find(s => s.id === depId);
          return dep && dep.status === 'done';
        });
        if (!depsDone) continue;
      }

      step.status = 'running';
      try {
        const result = await this.executeStep(step, plan);
        step.status = 'done';
        results.push(result);
      } catch (error) {
        step.status = 'error';
        plan.status = 'failed';
        this.events.next({ type: 'step-error', planId, stepId: step.id, error });
        throw error;
      }
    }

    plan.status = 'completed';
    this.events.next({ type: 'plan-completed', planId, results });
    
    // 自动复盘
    await this.selfEvolve(plan, results);
    
    return results;
  }

  private async executeStep(step: TaskStep, plan: TaskPlan): Promise<any> {
    // 根据步骤描述选择执行方式
    if (step.skill) {
      const skill = this.skillLoader.getSkill(step.skill);
      if (skill) {
        return await skill.execute(step.parameters || {});
      }
    }
    if (step.tool) {
      const tool = this.mcp.getTool(step.tool);
      if (tool) {
        return await tool.execute(step.parameters || {});
      }
    }
    // 通用执行：模拟
    return { step: step.id, status: 'done', result: 'executed' };
  }

  /**
   * 自我进化：复盘并提取经验
   */
  private async selfEvolve(plan: TaskPlan, results: any[]) {
    // 提取经验并写入记忆
    const experience = {
      goal: plan.goal,
      success: plan.status === 'completed',
      steps: plan.steps.map(s => ({ id: s.id, status: s.status })),
      timestamp: new Date()
    };
    await this.memory.save({
      type: 'feedback',
      name: `复盘-${plan.id}`,
      content: JSON.stringify(experience),
      tags: ['self-evolve', 'plan']
    });
    console.log(`📚 自我进化: ${plan.id} 已复盘并存储经验`);
  }

  /**
   * 获取所有计划
   */
  getPlans(): TaskPlan[] {
    return Array.from(this.currentPlans.values());
  }

  /**
   * 获取计划状态
   */
  getPlanStatus(planId: string): TaskPlan | undefined {
    return this.currentPlans.get(planId);
  }
}
