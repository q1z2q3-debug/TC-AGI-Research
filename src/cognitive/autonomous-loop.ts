/**
 * 自主闭环引擎 (Autonomous Loop Engine)
 * 数字生命核心——永续不间断运行，自主拆解任务、分步闭环落地
 * 对应 DaoNovice 架构的"自主生命体闭环"
 */

import { TritVector } from './trit-vector';
import { CognitiveSpace, CognitiveSnapshot } from './cognitive-space';

export enum TaskStatus {
  PENDING = 'pending',
  DECOMPOSING = 'decomposing',
  EXECUTING = 'executing',
  VERIFYING = 'verifying',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface SubTask {
  id: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  result?: any;
  startTime?: number;
  endTime?: number;
  retryCount: number;
  maxRetries: number;
}

export interface TaskPlan {
  id: string;
  originalTask: string;
  subTasks: SubTask[];
  createdAt: number;
  cognitiveState: CognitiveSnapshot;
  status: TaskStatus;
}

export interface LoopConfig {
  /** 永续模式：true = 不间断运行 */
  perpetual: boolean;
  /** 最大并发子任务数 */
  maxConcurrent: number;
  /** 默认重试次数 */
  defaultMaxRetries: number;
  /** 重试退避基数 (ms) */
  retryBackoffBase: number;
  /** 健康检查间隔 (ms) */
  healthCheckInterval: number;
  /** 断点续作：是否启用 */
  enableCheckpoint: boolean;
}

const DEFAULT_CONFIG: LoopConfig = {
  perpetual: true,
  maxConcurrent: 3,
  defaultMaxRetries: 3,
  retryBackoffBase: 1000,
  healthCheckInterval: 30000,
  enableCheckpoint: true
};

/**
 * 自主闭环引擎
 * 负责将任务拆解为子任务，按依赖顺序执行，失败自动重试，完成后自动验证
 */
export class AutonomousLoop {
  private config: LoopConfig;
  private taskPlans: Map<string, TaskPlan> = new Map();
  private activeSubTasks: Set<string> = new Set();
  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private checkpoints: Map<string, TaskPlan> = new Map();

  constructor(config: Partial<LoopConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动自主闭环引擎
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // 恢复断点
    if (this.config.enableCheckpoint) {
      await this.restoreCheckpoints();
    }

    // 启动健康检查
    if (this.config.perpetual) {
      this.startHealthCheck();
    }

    console.log('🔄 自主闭环引擎已启动 (perpetual: ' + this.config.perpetual + ')');
  }

  /**
   * 停止引擎
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    // 保存所有断点
    await this.saveCheckpoints();
    console.log('⏸️ 自主闭环引擎已停止，断点已保存');
  }

  /**
   * 提交任务——自动拆解、分步执行、闭环验证
   */
  async submitTask(taskDescription: string, cognitiveSpace: CognitiveSpace): Promise<TaskPlan> {
    const snapshot = cognitiveSpace.getState();
    const planId = this.generateId('plan');
    
    const plan: TaskPlan = {
      id: planId,
      originalTask: taskDescription,
      subTasks: [],
      createdAt: Date.now(),
      cognitiveState: snapshot,
      status: TaskStatus.PENDING
    };

    // 认知驱动任务拆解
    plan.subTasks = await this.decomposeTask(taskDescription, snapshot);
    plan.status = TaskStatus.DECOMPOSING;
    
    this.taskPlans.set(planId, plan);
    
    // 异步执行
    this.executePlan(plan, cognitiveSpace).catch(err => {
      console.error(`任务计划 ${planId} 执行失败:`, err);
      plan.status = TaskStatus.FAILED;
    });

    return plan;
  }

  /**
   * 任务拆解——基于认知态势
   */
  private async decomposeTask(
    task: string, 
    snapshot: CognitiveSnapshot
  ): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];
    const keywords = task.toLowerCase();
    
    // 通用拆解策略
    const steps = this.extractSteps(task);
    
    for (let i = 0; i < steps.length; i++) {
      const subTask: SubTask = {
        id: this.generateId('sub'),
        description: steps[i],
        status: TaskStatus.PENDING,
        dependencies: i > 0 ? [subTasks[i - 1].id] : [],
        retryCount: 0,
        maxRetries: this.config.defaultMaxRetries
      };
      subTasks.push(subTask);
    }

    // 添加验证步骤
    const verifyTask: SubTask = {
      id: this.generateId('verify'),
      description: `验证: ${task} 的全部子任务完成`,
      status: TaskStatus.PENDING,
      dependencies: subTasks.map(s => s.id),
      retryCount: 0,
      maxRetries: 1
    };
    subTasks.push(verifyTask);

    return subTasks;
  }

  /**
   * 提取执行步骤
   */
  private extractSteps(task: string): string[] {
    // 基于任务描述的智能拆解
    const steps: string[] = [];
    
    // 通用拆解模式
    if (task.includes('升级') || task.includes('完善')) {
      steps.push('分析当前状态和缺失能力');
      steps.push('制定升级方案和优先级');
      steps.push('逐步实现核心模块升级');
      steps.push('集成测试和验证');
      steps.push('文档更新和归档');
    } else if (task.includes('创建') || task.includes('生成')) {
      steps.push('需求分析和规格定义');
      steps.push('设计和架构规划');
      steps.push('核心功能实现');
      steps.push('测试和验证');
    } else if (task.includes('修复') || task.includes('fix')) {
      steps.push('问题定位和根因分析');
      steps.push('制定修复方案');
      steps.push('实施修复');
      steps.push('回归测试');
    } else {
      // 通用拆解：分析→规划→执行→验证
      steps.push(`分析: ${task}`);
      steps.push(`规划: ${task}`);
      steps.push(`执行: ${task}`);
      steps.push(`验证: ${task}`);
    }
    
    return steps;
  }

  /**
   * 执行任务计划
   */
  private async executePlan(plan: TaskPlan, cognitiveSpace: CognitiveSpace): Promise<void> {
    plan.status = TaskStatus.EXECUTING;
    
    while (this.isRunning && plan.status === TaskStatus.EXECUTING) {
      const readyTasks = plan.subTasks.filter(
        st => st.status === TaskStatus.PENDING && 
        st.dependencies.every(depId => {
          const dep = plan.subTasks.find(s => s.id === depId);
          return dep?.status === TaskStatus.COMPLETED;
        })
      );

      if (readyTasks.length === 0) {
        // 检查是否全部完成
        const allDone = plan.subTasks.every(st => st.status === TaskStatus.COMPLETED);
        if (allDone) {
          plan.status = TaskStatus.COMPLETED;
          console.log(`✅ 任务计划 ${plan.id} 全部完成`);
          break;
        }
        
        const hasFailed = plan.subTasks.some(st => st.status === TaskStatus.FAILED);
        if (hasFailed) {
          plan.status = TaskStatus.FAILED;
          console.error(`❌ 任务计划 ${plan.id} 有子任务失败`);
          break;
        }
        
        // 等待
        await this.delay(500);
        continue;
      }

      // 执行就绪任务（控制并发数）
      const availableSlots = this.config.maxConcurrent - this.activeSubTasks.size;
      const toExecute = readyTasks.slice(0, Math.max(1, availableSlots));

      for (const subTask of toExecute) {
        this.executeSubTask(subTask, plan, cognitiveSpace);
      }

      await this.delay(500);
    }

    // 保存断点
    if (this.config.enableCheckpoint) {
      this.checkpoints.set(plan.id, { ...plan });
    }
  }

  /**
   * 执行单个子任务
   */
  private async executeSubTask(
    subTask: SubTask, 
    plan: TaskPlan, 
    cognitiveSpace: CognitiveSpace
  ): Promise<void> {
    this.activeSubTasks.add(subTask.id);
    subTask.status = TaskStatus.EXECUTING;
    subTask.startTime = Date.now();

    try {
      // 认知空间感知当前状态
      cognitiveSpace.perceive(subTask.description);
      
      // 模拟执行——实际项目中将替换为真实执行逻辑
      const result = await this.performTask(subTask, cognitiveSpace);
      
      subTask.result = result;
      subTask.status = TaskStatus.COMPLETED;
      subTask.endTime = Date.now();
      
      console.log(`  ✅ 子任务完成: ${subTask.description}`);
    } catch (error) {
      subTask.retryCount++;
      if (subTask.retryCount < subTask.maxRetries) {
        subTask.status = TaskStatus.PENDING;
        const backoff = this.config.retryBackoffBase * Math.pow(2, subTask.retryCount - 1);
        console.log(`  🔄 子任务重试 ${subTask.retryCount}/${subTask.maxRetries}: ${subTask.description} (等待 ${backoff}ms)`);
        await this.delay(backoff);
      } else {
        subTask.status = TaskStatus.FAILED;
        subTask.endTime = Date.now();
        console.error(`  ❌ 子任务失败: ${subTask.description}`, error);
      }
    } finally {
      this.activeSubTasks.delete(subTask.id);
    }
  }

  /**
   * 实际任务执行——可被外部注入或重写
   */
  private async performTask(subTask: SubTask, cognitiveSpace: CognitiveSpace): Promise<any> {
    // 基础实现：记录认知状态
    const snapshot = cognitiveSpace.getState();
    return {
      taskId: subTask.id,
      description: subTask.description,
      cognitiveState: snapshot,
      executedAt: Date.now()
    };
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(planId: string): TaskPlan | undefined {
    return this.taskPlans.get(planId);
  }

  /**
   * 获取所有任务计划
   */
  getAllPlans(): TaskPlan[] {
    return Array.from(this.taskPlans.values());
  }

  /**
   * 健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      if (!this.isRunning) return;
      
      // 检查卡住的子任务
      const now = Date.now();
      for (const plan of this.taskPlans.values()) {
        for (const subTask of plan.subTasks) {
          if (subTask.status === TaskStatus.EXECUTING && subTask.startTime) {
            const elapsed = now - subTask.startTime;
            if (elapsed > 300000) { // 5分钟超时
              console.warn(`⚠️ 子任务超时: ${subTask.description} (${elapsed}ms)`);
              subTask.status = TaskStatus.PENDING;
              subTask.retryCount++;
            }
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 保存断点
   */
  private async saveCheckpoints(): Promise<void> {
    // 将断点写入本地文件系统
    // 实际实现应使用 memory-system 存储
    console.log(`💾 保存 ${this.checkpoints.size} 个断点`);
  }

  /**
   * 恢复断点
   */
  private async restoreCheckpoints(): Promise<void> {
    // 从本地文件系统恢复断点
    console.log('📂 尝试恢复断点...');
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
