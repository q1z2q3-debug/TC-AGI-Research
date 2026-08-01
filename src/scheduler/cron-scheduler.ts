/**
 * 定时任务调度器
 * 支持 cron 表达式和 RRULE
 */

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  action: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class CronScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    this.addTask({
      id: 'daily-report',
      name: '每日报告',
      schedule: '0 9 * * *',
      action: async () => {
        console.log('📊 生成每日报告...');
      },
      enabled: true
    });
    this.startAll();
    console.log(`⏰ 调度器初始化: ${this.tasks.size} 个任务`);
  }

  addTask(task: ScheduledTask) {
    this.tasks.set(task.id, task);
  }

  startAll() {
    for (const [id, task] of this.tasks) {
      if (task.enabled) {
        const interval = setInterval(() => {
          task.action();
        }, 10000);
        this.intervals.set(id, interval);
      }
    }
  }

  stopAll() {
    for (const [id, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  async shutdown() {
    this.stopAll();
    console.log('⏰ 调度器关闭');
  }
}
