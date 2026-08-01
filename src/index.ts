/**
 * TC-AGI-Research 入口
 * 四元一体 AGI 生命体框架
 * 
 * @author q1z2q3-debug
 * @version 0.2.0-cognitive
 */

import { IdeologyLayer } from './core/ideology';
import { EngineLayer } from './core/engine';
import { InstanceLayer } from './core/instance';
import { MemorySystem } from './memory/memory-system';
import { SkillLoader } from './skills/skill-loader';
import { MCPAdapter } from './tools/mcp-adapter';
import { CronScheduler } from './scheduler/cron-scheduler';
import { DeepSeekCognize } from './cognitive/deepseek-cognize';

export class TCAGI {
  private ideology: IdeologyLayer;
  private engine: EngineLayer;
  private instance: InstanceLayer;
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;
  private cognitive: DeepSeekCognize;

  constructor() {
    // 初始化各层
    this.ideology = new IdeologyLayer();
    this.memory = new MemorySystem();
    this.skillLoader = new SkillLoader(this.memory);
    this.mcp = new MCPAdapter();
    this.scheduler = new CronScheduler();
    this.cognitive = new DeepSeekCognize();
    this.engine = new EngineLayer(this.ideology, this.memory, this.skillLoader, this.mcp, this.scheduler);
    this.instance = new InstanceLayer(this.engine, this.memory);
  }

  /**
   * 启动 AGI 生命体
   */
  async start() {
    console.log('🌀 TC-AGI-Research (四元一体) 启动...');
    await this.ideology.initialize();
    await this.memory.initialize();
    await this.skillLoader.loadAll();
    await this.mcp.initialize();
    await this.scheduler.initialize();
    // 认知空间自动初始化
    this.cognitive.perceive('系统启动 — 认知初始化');
    await this.engine.initialize();
    await this.instance.initialize();
    console.log('✅ TC-AGI-Research (四元一体) 已就绪');
    console.log(`🧠 认知态势: ${this.cognitive.getState().state.summary}`);
  }

  /**
   * 提交任务（带认知循环）
   */
  async submitTask(task: string, context?: any) {
    // 1. 先进行认知觉知
    const state = this.cognitive.perceive(task);
    console.log(`📌 认知定位: 卦象 ${state.hexagramIndex} | ${state.summary}`);

    // 2. 推理策略
    const strategy = this.cognitive.reason(state);
    console.log(`🎯 策略派生: ${strategy.name}`);

    // 3. 执行任务（附带策略指导）
    const result = await this.instance.executeTask(
      `${task} — 策略: ${strategy.name}`,
      { ...context, strategy, cognitiveState: state }
    );

    // 4. 进化 — 根据结果调整认知
    this.cognitive.evolve({
      success: true,
      goal: task,
      feedback: '任务执行完成'
    });

    return result;
  }

  /**
   * 获取完整认知态势
   */
  getCognitiveSnapshot() {
    return this.cognitive.getState();
  }

  /**
   * 关闭系统
   */
  async shutdown() {
    await this.scheduler.shutdown();
    await this.mcp.shutdown();
    await this.memory.shutdown();
    console.log('🛑 TC-AGI-Research (四元一体) 已关闭');
  }
}

// 单例导出
export const agi = new TCAGI();
