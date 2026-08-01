/**
 * 生命体实例层 (Instance Layer)
 * 具体行动、工具调用、交互、任务执行
 * 对应四元一体中的 "生命体实例层"
 */

import { EngineLayer, TaskPlan, ExecutionResult } from './engine';
import { MemorySystem } from '../memory/memory-system';
import { CognitiveSpace } from '../cognitive/cognitive-space';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface TaskContext {
  id: string;
  goal: string;
  plan?: TaskPlan;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export class InstanceLayer {
  private engine: EngineLayer;
  private memory: MemorySystem;
  private cognitive: CognitiveSpace;
  private events = new Subject<any>();
  private tasks: Map<string, TaskContext> = new Map();
  private activeTaskId: string | null = null;

  constructor(engine: EngineLayer, memory: MemorySystem, cognitive: CognitiveSpace) {
    this.engine = engine;
    this.memory = memory;
    this.cognitive = cognitive;
  }

  async initialize() {
    console.log('🤖 生命体实例层初始化完成');
    this.events.next({ type: 'instance-ready' });
  }

  /**
   * 执行任务（外部接口）
   */
  async executeTask(task: string, context?: any): Promise<any> {
    const taskId = `task-${uuidv4().slice(0, 8)}`;
    console.log(`📌 接收任务: ${taskId} -> ${task}`);

    // 1. 感知认知状态
    const state = this.cognitive.perceive(task);

    // 2. 创建任务上下文
    const taskCtx: TaskContext = {
      id: taskId,
      goal: task,
      status: 'pending',
      createdAt: new Date(),
      metadata: { cognitiveState: state, context }
    };
    this.tasks.set(taskId, taskCtx);
    this.activeTaskId = taskId;
    this.events.next({ type: 'task-received', taskId, task, context });

    try {
      // 3. 引擎分解任务
      const plan = this.engine.decomposeTask(task, { ...context, taskId });
      taskCtx.plan = plan;
      taskCtx.status = 'running';

      // 4. 执行计划
      const result = await this.engine.executePlan(plan.id);

      // 5. 更新任务状态
      taskCtx.status = result.status === 'completed' ? 'completed' : 'failed';
      taskCtx.completedAt = new Date();
      taskCtx.result = result;

      // 6. 记录成功经验到记忆
      await this.memory.save({
        type: 'feedback',
        name: `任务-${taskId}`,
        content: JSON.stringify({
          goal: task,
          success: result.status === 'completed',
          duration: result.duration,
          planId: plan.id,
          timestamp: new Date()
        }),
        tags: ['task', result.status === 'completed' ? 'success' : 'failure']
      });

      this.events.next({ type: 'task-completed', taskId, result });
      this.activeTaskId = null;
      return result;

    } catch (error) {
      taskCtx.status = 'failed';
      taskCtx.completedAt = new Date();
      taskCtx.error = String(error);
      this.events.next({ type: 'task-failed', taskId, error });
      this.activeTaskId = null;

      // 记录失败经验
      await this.memory.save({
        type: 'feedback',
        name: `任务失败-${taskId}`,
        content: JSON.stringify({
          goal: task,
          error: String(error),
          timestamp: new Date()
        }),
        tags: ['task', 'failure', 'error']
      });

      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): TaskContext | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TaskContext[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取活跃任务
   */
  getActiveTask(): TaskContext | null {
    if (this.activeTaskId) {
      return this.tasks.get(this.activeTaskId) || null;
    }
    return null;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status === 'completed' || task.status === 'failed') return false;

    task.status = 'failed';
    task.completedAt = new Date();
    task.error = '任务被取消';
    if (task.plan) {
      const plan = this.engine.getPlan(task.plan.id);
      if (plan) {
        plan.status = 'cancelled';
      }
    }
    this.events.next({ type: 'task-cancelled', taskId });
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }
    return true;
  }

  /**
   * 获取实例统计
   */
  getStats(): {
    totalTasks: number;
    completed: number;
    failed: number;
    running: number;
    activeTaskId: string | null;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      running: tasks.filter(t => t.status === 'running').length,
      activeTaskId: this.activeTaskId
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // 检查引擎是否正常
      const plans = this.engine.getAllPlans();
      return { healthy: true, message: `引擎正常，共 ${plans.length} 个计划` };
    } catch (error) {
      return { healthy: false, message: `引擎异常: ${error}` };
    }
  }
}
