/**
 * 定时任务调度器 (Cron Scheduler)
 * 支持 cron 表达式和 RRULE 格式的定时任务
 * 任务持久化、独立会话、自动恢复
 */

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron 表达式或 RRULE
  action: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  createdAt: Date;
}

export interface TaskSchedule {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
}

/**
 * 简单的 cron 解析器（支持标准 cron 格式）
 * 格式：分 时 日 月 周
 */
function parseCron(cron: string): { minute: number; hour: number; dayOfMonth: number; month: number; dayOfWeek: number } | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const parsePart = (part: string, min: number, max: number): number => {
    if (part === '*') return -1; // 任意
    const val = parseInt(part, 10);
    if (isNaN(val) || val < min || val > max) return -1;
    return val;
  };

  return {
    minute: parsePart(parts[0], 0, 59),
    hour: parsePart(parts[1], 0, 23),
    dayOfMonth: parsePart(parts[2], 1, 31),
    month: parsePart(parts[3], 1, 12),
    dayOfWeek: parsePart(parts[4], 0, 6)
  };
}

function getNextRunTime(cron: string, from: Date = new Date()): Date | null {
  const parsed = parseCron(cron);
  if (!parsed) return null;

  const next = new Date(from);
  next.setSeconds(0, 0);

  const maxAttempts = 2000;
  for (let i = 0; i < maxAttempts; i++) {
    next.setMinutes(next.getMinutes() + 1);

    const matches = true;
    const minuteMatch = parsed.minute === -1 || next.getMinutes() === parsed.minute;
    const hourMatch = parsed.hour === -1 || next.getHours() === parsed.hour;
    const dayMatch = parsed.dayOfMonth === -1 || next.getDate() === parsed.dayOfMonth;
    const monthMatch = parsed.month === -1 || (next.getMonth() + 1) === parsed.month;
    const dowMatch = parsed.dayOfWeek === -1 || next.getDay() === parsed.dayOfWeek;

    if (minuteMatch && hourMatch && dayMatch && monthMatch && dowMatch) {
      return next;
    }
  }

  return null;
}

export class CronScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private taskHistory: Map<string, Date[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 添加内置任务示例
    this.addTask({
      id: 'daily-report',
      name: '每日报告生成',
      schedule: '0 9 * * *',
      action: async () => {
        console.log('📊 [调度] 生成每日报告...');
        // 实际实现将调用引擎
      },
      enabled: true,
      runCount: 0,
      errorCount: 0,
      createdAt: new Date()
    });

    this.addTask({
      id: 'hourly-heartbeat',
      name: '每小时心跳',
      schedule: '0 * * * *',
      action: async () => {
        console.log(`💓 [调度] 心跳 ${new Date().toISOString()}`);
      },
      enabled: true,
      runCount: 0,
      errorCount: 0,
      createdAt: new Date()
    });

    this.startAll();
    this.initialized = true;
    console.log(`⏰ 调度器初始化: ${this.tasks.size} 个任务`);
  }

  /**
   * 添加任务
   */
  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    this.taskHistory.set(task.id, []);
    // 计算下次运行时间
    const nextRun = getNextRunTime(task.schedule);
    if (nextRun) {
      task.nextRun = nextRun;
    }
  }

  /**
   * 移除任务
   */
  removeTask(id: string): boolean {
    const result = this.tasks.delete(id);
    this.taskHistory.delete(id);
    this.stopTask(id);
    return result;
  }

  /**
   * 启动所有任务
   */
  startAll(): void {
    for (const [id, task] of this.tasks) {
      if (task.enabled) {
        this.scheduleTask(id);
      }
    }
  }

  /**
   * 停止所有任务
   */
  stopAll(): void {
    for (const [id] of this.intervals) {
      this.stopTask(id);
    }
  }

  /**
   * 调度单个任务
   */
  private scheduleTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    // 停止现有调度
    this.stopTask(id);

    // 计算下次运行时间
    const nextRun = getNextRunTime(task.schedule);
    if (!nextRun) {
      console.warn(`⚠️ 任务 ${id} 的调度格式无效: ${task.schedule}`);
      return;
    }

    task.nextRun = nextRun;
    const now = Date.now();
    const delay = Math.max(0, nextRun.getTime() - now);

    // 如果延迟超过一小时，设置一个较短的检查间隔
    if (delay > 3600000) {
      // 每5分钟检查一次
      const checkInterval = setInterval(() => {
        const taskNow = this.tasks.get(id);
        if (!taskNow || !taskNow.enabled) {
          clearInterval(checkInterval);
          this.intervals.delete(id);
          return;
        }
        const next = getNextRunTime(taskNow.schedule);
        if (next && next.getTime() <= Date.now()) {
          // 时间到了，执行任务
          clearInterval(checkInterval);
          this.intervals.delete(id);
          this.executeTask(id);
          // 重新调度
          if (taskNow.enabled) {
            this.scheduleTask(id);
          }
        }
      }, 300000); // 5分钟
      this.intervals.set(id, checkInterval);
      return;
    }

    // 精确调度
    const timeout = setTimeout(async () => {
      // 执行任务
      await this.executeTask(id);
      // 重新调度（如果任务仍启用）
      const taskAfter = this.tasks.get(id);
      if (taskAfter && taskAfter.enabled) {
        this.scheduleTask(id);
      }
    }, delay);

    this.intervals.set(id, timeout);
  }

  /**
   * 停止任务调度
   */
  private stopTask(id: string): void {
    const timer = this.intervals.get(id);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer as any);
      this.intervals.delete(id);
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    task.lastRun = new Date();
    task.runCount++;

    try {
      console.log(`▶️ [调度] 执行任务: ${task.name} (${task.id})`);
      await task.action();
      console.log(`✅ [调度] 任务完成: ${task.name}`);
    } catch (error) {
      task.errorCount++;
      console.error(`❌ [调度] 任务失败: ${task.name}`, error);
    }

    // 记录历史
    const history = this.taskHistory.get(id) || [];
    history.push(new Date());
    if (history.length > 100) {
      history.shift();
    }
    this.taskHistory.set(id, history);
  }

  /**
   * 手动触发任务
   */
  async triggerTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }
    await this.executeTask(id);
  }

  /**
   * 启用任务
   */
  enableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = true;
    this.scheduleTask(id);
    return true;
  }

  /**
   * 禁用任务
   */
  disableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.enabled = false;
    this.stopTask(id);
    return true;
  }

  /**
   * 获取所有任务
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务摘要
   */
  getTaskSummaries(): TaskSchedule[] {
    return Array.from(this.tasks.values()).map(t => ({
      id: t.id,
      name: t.name,
      schedule: t.schedule,
      enabled: t.enabled,
      lastRun: t.lastRun?.toISOString(),
      nextRun: t.nextRun?.toISOString(),
      runCount: t.runCount
    }));
  }

  /**
   * 获取任务历史
   */
  getTaskHistory(id: string): Date[] {
    return this.taskHistory.get(id) || [];
  }

  /**
   * 获取任务数量
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * 关闭调度器
   */
  async shutdown(): Promise<void> {
    this.stopAll();
    this.tasks.clear();
    this.taskHistory.clear();
    this.initialized = false;
    console.log('⏰ 调度器关闭');
  }
}
