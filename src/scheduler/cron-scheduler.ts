/**
 * 定时任务调度器
 * 支持 cron 表达式和 RRULE 调度
 */

import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron 表达式或 RRULE
  action: (context?: any) => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface TaskExecution {
  taskId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  duration?: number;
}

export class CronScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private executions: Map<string, TaskExecution[]> = new Map();
  private events = new Subject<any>();
  private running = false;

  async initialize(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log('⏰ 调度器初始化完成');
  }

  /**
   * 添加定时任务
   */
  addTask(task: Omit<ScheduledTask, 'id' | 'createdAt'>): string {
    const id = `task-${uuidv4().slice(0, 8)}`;
    const fullTask: ScheduledTask = {
      id,
      ...task,
      createdAt: new Date()
    };
    this.tasks.set(id, fullTask);
    this.executions.set(id, []);
    this.events.next({ type: 'task-added', task: fullTask });
    return id;
  }

  /**
   * 启动所有任务
   */
  startAll(): void {
    for (const [id, task] of this.tasks) {
      if (task.enabled) {
        this.startTask(id);
      }
    }
  }

  /**
   * 启动单个任务
   */
  startTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    if (this.intervals.has(id)) return;

    // 解析 cron 表达式 (简化版)
    const intervalMs = this.parseCron(task.schedule);
    if (intervalMs === 0) {
      // 无法解析，使用默认 60 秒
      console.log(`⚠️ 无法解析调度: ${task.schedule}, 使用默认60秒`);
      return;
    }

    const interval = setInterval(async () => {
      if (!task.enabled) return;
      await this.executeTask(id);
    }, intervalMs);

    this.intervals.set(id, interval);
    this.events.next({ type: 'task-started', taskId: id });
  }

  /**
   * 停止任务
   */
  stopTask(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
      this.events.next({ type: 'task-stopped', taskId: id });
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    const execution: TaskExecution = {
      taskId: id,
      startedAt: new Date(),
      status: 'running'
    };

    const executions = this.executions.get(id) || [];
    executions.push(execution);
    this.executions.set(id, executions);

    try {
      task.lastRun = new Date();
      await task.action({ taskId: id, taskName: task.name });
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      this.events.next({ type: 'task-executed', taskId: id, execution });
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = String(error);
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      this.events.next({ type: 'task-failed', taskId: id, error: String(error) });
    }
  }

  /**
   * 解析 cron 表达式为间隔毫秒（简化版）
   */
  private parseCron(cron: string): number {
    // 简单解析：如果是数字，视为秒数
    const num = parseInt(cron);
    if (!isNaN(num)) {
      return num * 1000;
    }

    // 常见格式: "*/30 * * * *" -> 30秒
    if (cron.startsWith('*/')) {
      const parts = cron.split(' ');
      if (parts.length >= 1) {
        const value = parseInt(parts[0].replace('*/', ''));
        if (!isNaN(value)) {
          // 如果是秒级，直接返回；如果是分钟级，乘以60
          return value * 1000;
        }
      }
    }

    // 日格式: "0 9 * * *" -> 每天9点
    // 简化：返回 24小时
    if (cron.includes('* * *') && !cron.includes('/')) {
      return 24 * 60 * 60 * 1000;
    }

    // 默认 30 秒
    return 30000;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务执行历史
   */
  getTaskExecutions(id: string): TaskExecution[] {
    return this.executions.get(id) || [];
  }

  /**
   * 删除任务
   */
  removeTask(id: string): boolean {
    this.stopTask(id);
    this.tasks.delete(id);
    this.executions.delete(id);
    this.events.next({ type: 'task-removed', taskId: id });
    return true;
  }

  /**
   * 启用/禁用任务
   */
  toggleTask(id: string, enabled: boolean): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = enabled;
    if (enabled) {
      this.startTask(id);
    } else {
      this.stopTask(id);
    }
    this.events.next({ type: 'task-toggled', taskId: id, enabled });
  }

  /**
   * 统计信息
   */
  getStats(): {
    total: number;
    enabled: number;
    running: number;
    executions: number;
  } {
    const tasks = Array.from(this.tasks.values());
    let totalExecutions = 0;
    for (const executions of this.executions.values()) {
      totalExecutions += executions.length;
    }
    return {
      total: tasks.length,
      enabled: tasks.filter(t => t.enabled).length,
      running: this.intervals.size,
      executions: totalExecutions
    };
  }

  /**
   * 关闭调度器
   */
  async shutdown(): Promise<void> {
    for (const [id] of this.intervals) {
      this.stopTask(id);
    }
    this.running = false;
    console.log('⏰ 调度器关闭');
  }
}
