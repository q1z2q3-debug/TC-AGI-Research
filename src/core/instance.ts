/**
 * 生命体实例层 (Instance Layer)
 *
 * 核心职责：
 * 1. 对外提供任务提交接口
 * 2. 协调引擎层执行任务
 * 3. 管理任务生命周期
 * 4. 提供状态查询接口
 */

import { EngineLayer, TaskPlan } from './engine';
import { MemorySystem } from '../memory/memory-system';
import { Subject } from 'rxjs';

export interface TaskContext {
  priority?: number;
  tags?: string[];
  maxRetries?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  planId: string;
  goal: string;
  status: 'completed' | 'failed' | 'paused';
  results?: any[];
  error?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

export class InstanceLayer {
  private engine: EngineLayer;
  private memory: MemorySystem;
  private events = new Subject<any>();
  private taskHistory: TaskResult[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(engine: EngineLayer, memory: MemorySystem) {
    this.engine = engine;
    this.memory = memory;
  }

  async initialize(): Promise<void> {
    console.log('🤖 生命体实例层初始化完成');
    this.events.next({ type: 'instance-ready' });
  }

  /**
   * 执行任务（外部接口）
   */
  async executeTask(task: string, context?: TaskContext): Promise<TaskResult> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startedAt = new Date();

    console.log(`📌 接收任务: ${taskId} -> ${task}`);
    this.events.next({ type: 'task-received', taskId, task, context });

    // 记录任务到记忆
    await this.memory.save({
      type: 'topic',
      name: `task-${taskId}`,
      content: JSON.stringify({ task, context, startedAt: startedAt.toISOString() }),
      tags: ['task', ...(context?.tags || [])]
    });

    try {
      // 1. 引擎分解任务
      const plan = await this.engine.decomposeTask(task, context);

      // 2. 执行计划
      const results = await this.engine.executePlan(plan.id);

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      const result: TaskResult = {
        taskId,
        planId: plan.id,
        goal: task,
        status: 'completed',
        results,
        startedAt,
        completedAt,
        duration
      };

      this.taskHistory.push(result);
      if (this.taskHistory.length > this.MAX_HISTORY) {
        this.taskHistory.shift();
      }

      this.events.next({ type: 'task-completed', taskId, result });
      console.log(`✅ 任务 ${taskId} 完成 (耗时 ${(duration / 1000).toFixed(2)}s)`);

      return result;
    } catch (error) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      const result: TaskResult = {
        taskId,
        planId: 'unknown',
        goal: task,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        duration
      };

      this.taskHistory.push(result);
      if (this.taskHistory.length > this.MAX_HISTORY) {
        this.taskHistory.shift();
      }

      this.events.next({ type: 'task-failed', taskId, error });
      console.log(`❌ 任务 ${taskId} 失败: ${result.error}`);

      // 记录失败到记忆
      await this.memory.save({
        type: 'feedback',
        name: `task-failure-${taskId}`,
        content: JSON.stringify({ task, error: result.error, duration }),
        tags: ['task', 'failure']
      });

      return result;
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TaskResult | undefined {
    return this.taskHistory.find(t => t.taskId === taskId);
  }

  /**
   * 获取所有任务历史
   */
  getTaskHistory(): TaskResult[] {
    return [...this.taskHistory];
  }

  /**
   * 获取最近N个任务
   */
  getRecentTasks(limit: number = 10): TaskResult[] {
    return this.taskHistory.slice(-limit).reverse();
  }

  /**
   * 获取认知摘要
   */
  getCognitiveSummary(): string {
    return this.engine.getCognitiveSummary();
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    tasks: { total: number; completed: number; failed: number };
    engine: { runningPlans: number; totalPlans: number };
    cognitive: string;
  } {
    const completed = this.taskHistory.filter(t => t.status === 'completed').length;
    const failed = this.taskHistory.filter(t => t.status === 'failed').length;
    const engineStatus = this.engine.getStatus();

    return {
      tasks: {
        total: this.taskHistory.length,
        completed,
        failed
      },
      engine: {
        runningPlans: engineStatus.runningPlans,
        totalPlans: engineStatus.totalPlans
      },
      cognitive: this.getCognitiveSummary()
    };
  }

  /**
   * 获取事件流
   */
  getEvents() {
    return this.events.asObservable();
  }

  /**
   * 清空任务历史
   */
  clearHistory(): void {
    this.taskHistory = [];
  }
}
