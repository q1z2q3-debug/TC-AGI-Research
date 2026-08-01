/**
 * 生命体实例层 (Instance Layer)
 * 具体行动、工具调用、交互、任务执行
 * 对应三元一体中的 "生命体实例层"
 */

import { EngineLayer } from './engine';
import { MemorySystem } from '../memory/memory-system';
import { Subject } from 'rxjs';

export class InstanceLayer {
  private engine: EngineLayer;
  private memory: MemorySystem;
  private events = new Subject<any>();
  private activeTasks: Map<string, any> = new Map();

  constructor(engine: EngineLayer, memory: MemorySystem) {
    this.engine = engine;
    this.memory = memory;
  }

  async initialize() {
    console.log('🤖 生命体实例层初始化完成');
    this.events.next({ type: 'instance-ready' });
  }

  /**
   * 执行任务（外部接口）
   */
  async executeTask(task: string, context?: any): Promise<any> {
    const taskId = `task-${Date.now()}`;
    console.log(`📌 接收任务: ${taskId} -> ${task}`);
    
    this.events.next({ type: 'task-received', taskId, task, context });
    
    // 1. 引擎分解任务
    const plan = this.engine.decomposeTask(task, context);
    
    // 2. 执行计划
    try {
      const results = await this.engine.executePlan(plan.id);
      this.events.next({ type: 'task-completed', taskId, results });
      return results;
    } catch (error) {
      this.events.next({ type: 'task-failed', taskId, error });
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): any {
    // 查找对应的计划
    const plans = this.engine.getPlans();
    for (const plan of plans) {
      if (plan.id.includes(taskId) || plan.id === taskId) {
        return plan;
      }
    }
    return null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): any[] {
    return this.engine.getPlans();
  }
}
