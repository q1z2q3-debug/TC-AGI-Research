/**
 * 四元一体集成入口
 * 意识形态层 + 认知空间层 + 研究引擎层 + 生命体实例层
 */

import { IdeologyLayer } from '../core/ideology';
import { EngineLayer } from '../core/engine';
import { InstanceLayer } from '../core/instance';
import { CognitiveSpace } from '../cognitive/cognitive-space';
import { DeepSeekCognize } from '../cognitive/deepseek-cognize';
import { EmbeddingProvider } from '../cognitive/embedding';
import { DeepSeekClient } from '../cognitive/llm';
import { AnchorProjector } from '../cognitive/semantic-anchor';
import { validateOwnTrajectories, SelfValidationReport, SelfValidationOptions } from '../cognitive/self-validation';
import { CognitiveWavefunction } from '../cognitive/wavefunction';
import { MemorySystem } from '../memory/memory-system';
import { SkillLoader } from '../skills/skill-loader';
import { MCPAdapter } from '../tools/mcp-adapter';
import { CronScheduler } from '../scheduler/cron-scheduler';
import { HealthStatus } from '../types';

export class TCAGI4 {
  // 四层
  private ideology: IdeologyLayer;
  private cognitive: CognitiveSpace;
  private engine: EngineLayer;
  private instance: InstanceLayer;

  // 认知循环（DeepSeekCognize 提供 觉知→推理→进化→自知）
  private cognize: DeepSeekCognize;

  // 基础组件
  private memory: MemorySystem;
  private skillLoader: SkillLoader;
  private mcp: MCPAdapter;
  private scheduler: CronScheduler;

  /** P0 语义接地：锚点投影器（embedding→LLM→规则） */
  private projector: AnchorProjector;
  private embeddingProvider: EmbeddingProvider | null = null;
  private llmClient: DeepSeekClient | null = null;

  private started = false;
  private startTime: Date | null = null;

  constructor() {
    // 初始化各层
    this.ideology = new IdeologyLayer();
    this.cognitive = new CognitiveSpace();
    this.memory = new MemorySystem();
    this.skillLoader = new SkillLoader(this.memory);
    this.mcp = new MCPAdapter();
    this.scheduler = new CronScheduler();
    this.engine = new EngineLayer(
      this.ideology,
      this.cognitive,
      this.memory,
      this.skillLoader,
      this.mcp,
      this.scheduler
    );
    this.instance = new InstanceLayer(this.engine, this.memory, this.cognitive);
    this.cognize = new DeepSeekCognize(this.cognitive);

    // P0：锚点投影器注入认知空间（embedding/LLM 后至时经 setEmbedding/setLLM 更新）
    this.projector = new AnchorProjector();
    this.cognitive.setProjector(this.projector);

    // P1：启用认知转移图（自动学习 P(s'|s)，落地 S* 稀疏子流形）
    this.cognitive.enableTransitionGraph();
  }

  /** P1：获取认知地图分析（真实吸引子 / 认知相区 / S* 子流形 / 原型对照） */
  getCognitiveMap() {
    const graph = this.cognitive.getTransitionGraph();
    if (!graph) return null;
    return {
      submanifold: graph.getSubmanifold(),
      attractors: graph.findAttractors(10),
      communities: graph.detectCommunities().map(c => ({
        id: c.id, size: c.size, topNode: c.topNode,
        pagerankMass: Number(c.pagerankMass.toFixed(6))
      })),
      prototypeComparison: graph.compareWithPrototypes()
    };
  }

  /** P1：自我实证闭环——在自身认知轨迹上验证 H₄ 禁带 / 转移结构 / Φ 聚集 */
  validateSelf(opts?: SelfValidationOptions): SelfValidationReport {
    const history = this.cognitive.getHistory().map(h => h.vector);
    return validateOwnTrajectories(history, opts);
  }

  /** P2：认知波函数——由历史轨迹构建的分布化认知态（decay<1 时近期权重更高） */
  getWavefunction(decay: number = 0.95): CognitiveWavefunction {
    const history = this.cognitive.getHistory().map(h => h.vector);
    if (history.length === 0) return CognitiveWavefunction.uniform();
    return CognitiveWavefunction.fromTrajectory(history, decay);
  }

  /** 是否已启动 */
  isRunning(): boolean {
    return this.started;
  }

  /**
   * 接入嵌入客户端（本地 Ollama 等），供技能/工具语义检索。
   * 应在 start() 之前调用，以便启动时构建向量索引。
   */
  setEmbedding(client: EmbeddingProvider): void {
    this.embeddingProvider = client;
    this.skillLoader.setEmbeddingClient(client);
    this.mcp.setEmbeddingClient(client);
    this.projector.setEmbedding(client);
  }

  /**
   * 接入 LLM（真实 DeepSeek）：同时驱动认知层的语义觉知与引擎层的失败归因。
   * 应在 start() 之前或之后调用皆可（setLLM 仅注册引用，不触发网络）。
   */
  setLLM(client: DeepSeekClient): void {
    this.llmClient = client;
    this.cognize.setLLM(client);
    this.engine.setLLM(client);
    this.projector.setLLM(client);
  }

  async start(): Promise<void> {
    if (this.started) {
      console.log('⚠️ 系统已在运行中');
      return;
    }

    console.log('🌀 TC-AGI-Research (四元一体) 启动...');
    this.startTime = new Date();

    try {
      // 1. 意识形态层
      await this.ideology.initialize();

      // 2. 认知空间层（自动初始化）
      this.cognitive.perceive('系统启动 — 认知初始化');

      // 3. 记忆系统
      await this.memory.initialize();

      // 4. 技能系统
      await this.skillLoader.loadAll();

      // 5. MCP 工具
      await this.mcp.initialize();

      // 5.5 构建技能/工具语义索引（若已接入嵌入客户端）
      await this.skillLoader.buildIndex();
      await this.mcp.buildIndex();

      // 5.6 P0：初始化语义锚点投影（嵌入锚点缓存；不可用时自动回退 LLM/规则）
      const projectorReady = await this.projector.initialize();
      if (projectorReady) {
        console.log('🧭 语义锚点投影已就绪（embedding 主路径）');
      }

      // 6. 调度器
      await this.scheduler.initialize();

      // 7. 研究引擎
      await this.engine.initialize();

      // 8. 生命体实例
      await this.instance.initialize();

      this.started = true;
      const snapshot = this.cognitive.getSnapshot();
      console.log('✅ TC-AGI-Research (四元一体) 已就绪');
      console.log(`🧠 认知态势: ${snapshot.state.summary}`);
      console.log(`📊 记忆数量: ${this.memory.getAll().length}`);
      console.log(`🔧 技能数量: ${this.skillLoader.getAvailableSkills().length}`);
      console.log(`🔌 工具数量: ${this.mcp.getAvailableTools().length}`);
    } catch (error) {
      console.error('❌ 启动失败:', error);
      throw error;
    }
  }

  /**
   * 提交任务
   */
  async submitTask(task: string, context?: any): Promise<any> {
    if (!this.started) {
      await this.start();
    }

    // 1. 先进行认知觉知（P0：深度感知）
    const state = await this.cognitive.perceiveDeep(task);
    console.log(`📌 认知定位: 卦象 ${state.hexagramIndex} | ${state.summary}`);

    // 2. 执行任务
    const result = await this.instance.executeTask(task, context);

    return result;
  }

  /**
   * 获取完整认知态势
   */
  getCognitiveSnapshot() {
    return this.cognitive.getSnapshot();
  }

  /**
   * 获取记忆统计
   */
  getMemoryStats() {
    return this.memory.getStats();
  }

  /**
   * 获取系统统计
   */
  getStats() {
    const instanceStats = this.instance.getStats();
    const schedulerStats = this.scheduler.getStats();
    const memoryStats = this.memory.getStats();
    const skills = this.skillLoader.getAvailableSkills();
    const tools = this.mcp.getAvailableTools();

    return {
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      memory: memoryStats,
      instance: instanceStats,
      scheduler: schedulerStats,
      skills: skills.length,
      tools: tools.length,
      cognitive: this.cognitive.getSnapshot().state.summary
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const components = {
      ideology: true,
      cognitive: true,
      memory: this.memory.getAll().length >= 0,
      engine: true,
      instance: true,
      skills: this.skillLoader.getAvailableSkills().length > 0,
      tools: this.mcp.getAvailableTools().length > 0,
      scheduler: true
    };

    const allHealthy = Object.values(components).every(v => v === true);

    return {
      healthy: allHealthy,
      components,
      message: allHealthy ? '所有组件运行正常' : '部分组件异常',
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0
    };
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    console.log('🛑 正在关闭 TC-AGI-Research...');

    await this.scheduler.shutdown();
    await this.mcp.shutdown();
    await this.memory.shutdown();

    this.started = false;
    this.startTime = null;
    console.log('✅ TC-AGI-Research 已关闭');
  }

  /**
   * 获取各组件引用（用于调试）
   */
  getComponents() {
    return {
      ideology: this.ideology,
      cognitive: this.cognitive,
      memory: this.memory,
      skillLoader: this.skillLoader,
      mcp: this.mcp,
      scheduler: this.scheduler,
      engine: this.engine,
      instance: this.instance,
      cognize: this.cognize
    };
  }
}

// 单例导出
export const agi4 = new TCAGI4();

// 便捷启动函数
export async function startAGI() {
  await agi4.start();
  return agi4;
}

// 便捷任务提交函数
export async function runTask(task: string, context?: any) {
  return agi4.submitTask(task, context);
}
