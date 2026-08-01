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
    this.ideology = new IdeologyLayer();
    this.memory = new MemorySystem();
    this.skillLoader = new SkillLoader(this.memory);
    this.mcp = new MCPAdapter();
    this.scheduler = new CronScheduler();
    this.cognitive = new DeepSeekCognize();
    this.engine = new EngineLayer(this.ideology, this.memory, this.skillLoader, this.mcp, this.scheduler);
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
    console.log('✅ TC-AGI-Research 已就绪');
  }

  async submitTask(task: string, context?: any) {
    const state = this.cognitive.perceive(task);
    console.log(`📌 认知定位: 卦象 ${state.hexagramIndex} | ${state.summary}`);
    const strategy = this.cognitive.reason(state);
    console.log(`🎯 策略派生: ${strategy.name}`);
    const result = await this.instance.executeTask(task, { ...context, strategy, cognitiveState: state });
    this.cognitive.evolve({ success: true, goal: task, feedback: '任务执行完成' });
    return result;
  }

  getCognitiveSnapshot() {
    return this.cognitive.getState();
  }

  async shutdown() {
    await this.scheduler.shutdown();
    await this.mcp.shutdown();
    await this.memory.shutdown();
    console.log('🛑 TC-AGI-Research 已关闭');
  }
}

export const agi = new TCAGI();
