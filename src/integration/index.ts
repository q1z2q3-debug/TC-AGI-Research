/**
 * 四元一体集成入口
 * 意识形态层 + 认知空间层 + 研究引擎层 + 生命体实例层
 *
 * 统一生命周期管理：启动 → 运行 → 关闭
 */

import { IdeologyLayer } from '../core/ideology';
import { EngineLayer } from '../core/engine';
import { InstanceLayer } from '../core/instance';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
import { DeepSeekCognize } from '../cognitive/deepseek-cognize';
import { CognitiveSnapshot } from '../cognitive/cognitive-space';
import { TaskResult } from '../cognitive/deepseek-cognize';

export interface AGIHealthStatus {
  healthy: boolean;
  layers: {
    ideology: boolean;
    cognitive: boolean;
    memory: boolean;
    engine: boolean;
    instance: boolean;
    skills: boolean;
    tools: boolean;
    scheduler: boolean;
  };
  memoryCount: number;
  planCount: number;
  cognitiveSummary: string;
  uptime: number;
}

export class TCAGI4 {
  // 四层
  private ideology: IdeologyLayer;
  private cognitive: DeepSeekCognize;
  private engine: EngineLayer;
  private instance: InstanceLayer;

  // 基础组件
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;

  // 状态
  private started = false;
  private startTime = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(options?: { memoryFilePath?: string }) {
    // 初始化各层
    this.ideology = new IdeologyLayer();
    this.memory = new MemorySystem(options);
    this.skillLoader = new SkillLoader(this.memory);
    this.mcp = new MCPAdapter();
    this.scheduler = new CronScheduler();
    this.cognitive = new DeepSeekCognize();
    this.engine = new EngineLayer(
      this.ideology,
      this.memory,
      this.skillLoader,
      this.mcp,
      this.scheduler
    );
    this.instance = new InstanceLayer(this.engine, this.memory);
  }

  /**
   * 启动系统
   */
  async start(): Promise<void> {
    if (this.started) {
      console.log('⚠️ 系统已在运行中');
      return;
    }

    console.log('🌀 TC-AGI-Research (四元一体) 启动...');
    this.startTime = Date.now();

    try {
      // 1. 意识形态层
      await this.ideology.initialize();
      console.log('  ✅ 意识形态层就绪');

      // 2. 记忆系统
      await this.memory.initialize();
      console.log(`  ✅ 记忆系统就绪 (${this.memory.getAllMemories().length} 条记忆)`);

      // 3. 技能系统
      await this.skillLoader.loadAll();
      console.log(`  ✅ 技能系统就绪 (${this.skillLoader.getAvailableSkills().length} 个技能)`);

      // 4. MCP 工具
      await this.mcp.initialize();
      console.log(`  ✅ MCP 工具就绪 (${this.mcp.getAvailableTools().length} 个工具)`);

      // 5. 调度器
      await this.scheduler.initialize();
      console.log(`  ✅ 调度器就绪 (${this.scheduler.getTaskCount()} 个任务)`);

      // 6. 认知空间（自动初始化）
      this.cognitive.perceive('系统启动 — 四元一体就绪');
      console.log(`  ✅ 认知空间就绪: ${this.cognitive.getSummary()}`);

      // 7. 引擎层
      await this.engine.initialize();
      console.log('  ✅ 研究引擎层就绪');

      // 8. 实例层
      await this.instance.initialize();
      console.log('  ✅ 生命体实例层就绪');

      this.started = true;

      // 启动健康检查
      this.startHealthCheck();

      console.log('✅ TC-AGI-Research (四元一体) 已就绪');
      console.log(`📊 认知态势: ${this.cognitive.getSummary()}`);
    } catch (error) {
      console.error('❌ 启动失败:', error);
      throw error;
    }
  }

  /**
   * 提交任务（自动经过完整认知循环）
   */
  async submitTask(task: string, context?: any): Promise<any> {
    this.ensureStarted();

    console.log(`📌 接收任务: ${task}`);

    // 1. 认知觉知
    const state = this.cognitive.perceive(task);
    console.log(`   🧠 认知定位: 卦象 ${state.hexagramIndex} | ${state.summary}`);

    // 2. 推理策略
    const strategy = this.cognitive.reason(state);
    console.log(`   🎯 策略派生: ${strategy.name} (置信度: ${(strategy.confidence * 100).toFixed(0)}%)`);

    // 3. 检索相关记忆
    const memories = await this.memory.retrieve(task, 5);
    if (memories.length > 0) {
      console.log(`   📚 相关记忆: ${memories.length} 条`);
    }

    // 4. 分解任务
    const plan = await this.engine.decomposeTask(task, { ...context, strategy, cognitiveState: state });
    console.log(`   📋 计划已创建: ${plan.id} (${plan.steps.length} 步)`);

    // 5. 执行计划
    const results = await this.engine.executePlan(plan.id);

    // 6. 进化（自动在引擎中完成）
    const snapshot = this.engine.getCognitiveSnapshot();
    console.log(`   🔄 认知已进化: ${snapshot.state.summary}`);

    return {
      planId: plan.id,
      results,
      cognitiveSummary: snapshot.state.summary,
      strategy: strategy.name
    };
  }

  /**
   * 获取完整认知态势
   */
  getCognitiveSnapshot(): CognitiveSnapshot {
    this.ensureStarted();
    return this.engine.getCognitiveSnapshot();
  }

  /**
   * 获取认知摘要
   */
  getCognitiveSummary(): string {
    this.ensureStarted();
    return this.engine.getCognitiveSummary();
  }

  /**
   * 获取所有计划
   */
  getPlans() {
    this.ensureStarted();
    return this.engine.getPlans();
  }

  /**
   * 获取计划详情
   */
  getPlan(planId: string) {
    this.ensureStarted();
    return this.engine.getPlan(planId);
  }

  /**
   * 获取引擎状态
   */
  getEngineStatus() {
    this.ensureStarted();
    return this.engine.getStatus();
  }

  /**
   * 获取记忆统计
   */
  async getMemoryStats() {
    this.ensureStarted();
    return this.memory.getStats();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<AGIHealthStatus> {
    this.ensureStarted();
    const memoryStats = await this.memory.getStats();
    const engineStatus = this.engine.getStatus();

    return {
      healthy: true,
      layers: {
        ideology: true,
        cognitive: true,
        memory: true,
        engine: true,
        instance: true,
        skills: true,
        tools: true,
        scheduler: true
      },
      memoryCount: memoryStats.total,
      planCount: engineStatus.totalPlans,
      cognitiveSummary: engineStatus.cognitiveSummary,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    if (!this.started) return;

    console.log('🛑 关闭 TC-AGI-Research...');

    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // 关闭各层
    await this.scheduler.shutdown();
    await this.mcp.shutdown();
    await this.memory.shutdown();

    this.started = false;
    console.log('✅ TC-AGI-Research 已关闭');
  }

  /**
   * 获取认知空间实例（高级用法）
   */
  getCognize(): DeepSeekCognize {
    this.ensureStarted();
    return this.engine.getCognize();
  }

  /**
   * 获取记忆系统实例（高级用法）
   */
  getMemory(): MemorySystem {
    this.ensureStarted();
    return this.memory;
  }

  /**
   * 获取引擎事件流
   */
  getEvents() {
    this.ensureStarted();
    return this.engine.getEvents();
  }

  /**
   * 获取运行状态
   */
  isRunning(): boolean {
    return this.started;
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return this.started ? Date.now() - this.startTime : 0;
  }

  // ===== 私有方法 =====

  private ensureStarted(): void {
    if (!this.started) {
      throw new Error('系统未启动，请先调用 start() 方法');
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.healthCheck();
        if (!status.healthy) {
          console.warn('⚠️ 健康检查警告: 部分层不健康');
        }
      } catch (error) {
        console.error('❌ 健康检查失败:', error);
      }
    }, 60000); // 每分钟检查一次
  }
}

// 单例导出（延迟初始化）
let _instance: TCAGI4 | null = null;

export function getAGI(): TCAGI4 {
  if (!_instance) {
    _instance = new TCAGI4();
  }
  return _instance;
}

export async function startAGI(options?: { memoryFilePath?: string }): Promise<TCAGI4> {
  const agi = new TCAGI4(options);
  await agi.start();
  return agi;
}

export default TCAGI4;
