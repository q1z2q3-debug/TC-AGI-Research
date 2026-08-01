/**
 * 四元一体集成入口
 * 意识形态层 + 认知空间层 + 研究引擎层 + 生命体实例层
 */

import { IdeologyLayer } from '../core/ideology';
import { DeepSeekCognize } from '../cognitive/deepseek-cognize';
import { EngineLayer } from '../core/engine';
import { InstanceLayer } from '../core/instance';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';

export class TCAGI4 {
  private ideology: IdeologyLayer;
  private cognitive: DeepSeekCognize;
  private engine: EngineLayer;
  private instance: InstanceLayer;
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;

  constructor() {
    this.ideology = new IdeologyLayer();
    this.memory = new MemorySystem();
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

  async start() {
    console.log('🌀 TC-AGI-Research (四元一体) 启动...');
    await this.ideology.initialize();
    await this.memory.initialize();
    await this.skillLoader.loadAll();
    await this.mcp.initialize();
    await this.scheduler.initialize();
    this.cognitive.perceive('系统启动 — 认知初始化');
    await this.engine.initialize();
    await this.instance.initialize();
    console.log('✅ TC-AGI-Research (四元一体) 已就绪');
    console.log(`🧠 认知态势: ${this.cognitive.getState().state.summary}`);
  }

  async submitTask(task: string, context?: any) {
    const state = this.cognitive.perceive(task);
    console.log(`📌 认知定位: 卦象 ${state.hexagramIndex} | ${state.summary}`);
    const strategy = this.cognitive.reason(state);
    console.log(`🎯 策略派生: ${strategy.name}`);
    const result = await this.instance.executeTask(
      `${task} — 策略: ${strategy.name}`,
      { ...context, strategy, cognitiveState: state }
    );
    this.cognitive.evolve({
      success: true,
      goal: task,
      feedback: '任务执行完成'
    });
    return result;
  }

  getCognitiveSnapshot() {
    return this.cognitive.getState();
  }

  async shutdown() {
    await this.scheduler.shutdown();
    await this.mcp.shutdown();
    await this.memory.shutdown();
    console.log('🛑 TC-AGI-Research (四元一体) 已关闭');
  }
}

export const agi4 = new TCAGI4();
