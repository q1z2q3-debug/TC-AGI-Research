/**
 * 认知空间层 (Cognitive Space)
 * 管理认知状态、卦象坐标、π精度、e活性
 * 包含内容感知、状态更新、历史追踪
 *
 * 语义映射已抽取到 ./semantic（认知空间与记忆系统共用，单一事实来源）
 */

import { TritVector, TritVectorOps, Trit } from './trit-vector';
import { contentToTritVector } from './semantic';
import type { AnchorProjector } from './semantic-anchor';
import { TransitionGraph } from './transition-graph';
import { CogMemoryPool, getGlobalCogMemoryPool } from './cognitive-memory-pool';
import { CognitiveDistance } from './distance';
import { getCogConfig } from './cog-config';

export interface CognitiveState {
  vector: TritVector;
  hexagramIndex: number;
  piDepth: number;    // 1~10
  eWeight: number;    // 0~1
  timestamp: number;
  summary: string;
}

export interface CognitiveSnapshot {
  state: CognitiveState;
  timePropagation: TritVector;
  causePropagation: TritVector;
  majority: Trit;
  dimensionAnalysis: Record<string, string>;
  hexagramDescription: string;
}

export class CognitiveSpace {
  private currentState: CognitiveState;
  private history: CognitiveState[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7天
  /** 语义锚点投影器（P0）：注入后 perceiveDeep 走 embedding→LLM→规则 三级链 */
  private projector: AnchorProjector | null = null;
  /** 认知转移图（P1）：启用后在 update() 中自动记录状态转移 */
  private transitionGraph: TransitionGraph | null = null;
  /** 认知记忆池（19683定长索引），可通过 setCogMemory 注入 */
  private cogMemory: CogMemoryPool;

  constructor(cogMemory?: CogMemoryPool) {
    this.cogMemory = cogMemory || getGlobalCogMemoryPool();
    const zeroVector = TritVectorOps.zero();
    this.currentState = {
      vector: zeroVector,
      hexagramIndex: TritVectorOps.toHexagramIndex(zeroVector),
      piDepth: 5,
      eWeight: 0.5,
      timestamp: Date.now(),
      summary: '认知初始化 — 悬置观察态'
    };
  }

  /** 注入自定义认知记忆池 */
  setCogMemory(pool: CogMemoryPool): void {
    this.cogMemory = pool;
  }

  /** 获取认知记忆池 */
  getCogMemory(): CogMemoryPool {
    return this.cogMemory;
  }

  getState(): CognitiveState {
    return { ...this.currentState };
  }

  getSnapshot(): CognitiveSnapshot {
    const state = this.currentState;
    const timeProp = TritVectorOps.propagateTime(state.vector);
    const causeProp = TritVectorOps.propagateCause(state.vector);
    const majority = TritVectorOps.majority(state.vector);

    const dimAnalysis: Record<string, string> = {
      '时间维度': `${this.dimLabel(state.vector.past)} → ${this.dimLabel(state.vector.present)} → ${this.dimLabel(state.vector.future)}`,
      '空间维度': `内:${this.dimLabel(state.vector.internal)} 中:${this.dimLabel(state.vector.medial)} 外:${this.dimLabel(state.vector.external)}`,
      '因果维度': `因:${this.dimLabel(state.vector.cause)} 缘:${this.dimLabel(state.vector.condition)} 果:${this.dimLabel(state.vector.effect)}`
    };

    const hexDesc = this.describeHexagram(state.hexagramIndex);

    return {
      state: { ...this.currentState },
      timePropagation: timeProp,
      causePropagation: causeProp,
      majority,
      dimensionAnalysis: dimAnalysis,
      hexagramDescription: hexDesc
    };
  }

  private dimLabel(t: Trit): string {
    switch (t) {
      case 1: return '☯ 阳 (+1)';
      case -1: return '☯ 阴 (-1)';
      default: return '◯ 中 (0)';
    }
  }

  private describeHexagram(idx: number): string {
    const vector = TritVectorOps.fromHexagramIndex(idx);
    const parts: string[] = [];
    const arr = TritVectorOps.toArray(vector);
    const labels = ['过去', '现在', '未来', '内', '中', '外', '因', '缘', '果'];
    for (let i = 0; i < 9; i++) {
      const v = arr[i];
      if (v === 1) parts.push(`${labels[i]}阳`);
      else if (v === -1) parts.push(`${labels[i]}阴`);
    }
    return parts.length ? `卦象 ${idx}: ${parts.join(', ')}` : `卦象 ${idx}: 全中平衡态`;
  }

  /**
   * 启用认知转移图（P1）：自动学习 P(s'|s)。
   * 注意：history 有 100 条上限，转移图是长期认知地图（跨会话累计）。
   */
  enableTransitionGraph(graph?: TransitionGraph): TransitionGraph {
    this.transitionGraph = graph || new TransitionGraph();
    return this.transitionGraph;
  }

  getTransitionGraph(): TransitionGraph | null {
    return this.transitionGraph;
  }

  /**
   * 更新认知状态
   */
  update(updates: Partial<Omit<CognitiveState, 'timestamp'>>): void {
    // 保存历史
    this.history.push({ ...this.currentState });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    const newVector = updates.vector || this.currentState.vector;

    // P1：记录认知转移（含自环驻留）
    if (this.transitionGraph) {
      this.transitionGraph.recordTransition(this.currentState.vector, newVector);
    }

    this.currentState = {
      vector: newVector,
      hexagramIndex: updates.hexagramIndex ?? TritVectorOps.toHexagramIndex(newVector),
      piDepth: updates.piDepth ?? this.currentState.piDepth,
      eWeight: updates.eWeight ?? this.currentState.eWeight,
      timestamp: Date.now(),
      summary: updates.summary ?? this.currentState.summary
    };
  }

  /**
   * 感知输入内容，更新认知状态
   */
  perceive(input: string): CognitiveState {
    // 1. 内容分析 → Trit向量（共享语义映射）
    const vector = this.analyzeContent(input);
    return this.applyPerception(input, vector);
  }

  /** 注入语义锚点投影器（P0 语义接地） */
  setProjector(projector: AnchorProjector | null): void {
    this.projector = projector;
  }

  get hasProjector(): boolean {
    return this.projector !== null;
  }

  /**
   * 深度感知（P0）：embedding锚点 → LLM → 规则 三级回退链。
   * 未注入投影器时退化为同步 perceive（规则路径），行为完全一致。
   */
  async perceiveDeep(input: string): Promise<CognitiveState> {
    if (!this.projector) {
      return this.perceive(input);
    }
    const proj = await this.projector.project(input);
    return this.applyPerception(input, proj.vector);
  }

  /** 感知内部实现：由向量更新完整认知状态 */
  private applyPerception(input: string, vector: TritVector): CognitiveState {
    // 2. 计算卦象索引
    const hexagramIndex = TritVectorOps.toHexagramIndex(vector);

    // 3. 动态π深度（内容复杂度）
    const piDepth = this.calcPiDepth(input);

    // 4. 动态e活性（新鲜度/重要性）
    const eWeight = this.calcEWeight(input);

    // 5. 生成摘要
    const summary = this.generateSummary(vector);

    // 6. 更新状态
    this.update({ vector, hexagramIndex, piDepth, eWeight, summary });

    return this.currentState;
  }

  /**
   * 内容分析 → Trit向量（委托共享语义映射，可扩展为 embedding）
   */
  private analyzeContent(input: string): TritVector {
    return contentToTritVector(input);
  }

  private calcPiDepth(input: string): number {
    const length = Math.min(input.length, 1000);
    const uniqueRatio = new Set(input).size / Math.max(length, 1);
    const complexity = Math.min(1, (length / 200) * 0.5 + uniqueRatio * 0.5);
    return Math.max(1, Math.min(10, Math.floor(complexity * 10) + 1));
  }

  private calcEWeight(input: string): number {
    const hasUrgency = /现在|立即|紧急|重要|尽快/.test(input);
    const hasFuture = /未来|计划|目标|方向/.test(input);
    const hasRisk = /风险|危险|危机|问题/.test(input);
    let weight = 0.5;
    if (hasUrgency) weight += 0.25;
    if (hasFuture) weight += 0.15;
    if (hasRisk) weight += 0.1;
    // 新鲜度衰减：如果输入长度短，可能更紧急
    if (input.length < 20) weight += 0.1;
    return Math.min(1, weight);
  }

  private generateSummary(vector: TritVector): string {
    const parts: string[] = [];
    const majority = TritVectorOps.majority(vector);
    const labels: Record<Trit, string> = {
      1: '扩张', 0: '观察', '-1': '收缩'
    };
    parts.push(`态势: ${labels[majority]}`);

    if (vector.internal === 1 && vector.external === -1) {
      parts.push('内核稳固·外境受压');
    } else if (vector.internal === -1 && vector.external === 1) {
      parts.push('外境有利·内核待稳');
    } else if (vector.internal === 1 && vector.external === 1) {
      parts.push('内外和谐·全面有利');
    }

    if (vector.medial === 1) {
      parts.push('通道畅通·内外调和');
    } else if (vector.medial === -1) {
      parts.push('通道阻塞·连接断裂');
    }

    if (vector.cause === 1 && vector.condition === 1) {
      parts.push('因缘具足·果可期待');
    } else if (vector.cause === -1 || vector.condition === -1) {
      parts.push('因缘不全·宜谨慎');
    }

    if (vector.present === 1 && vector.future === 1) {
      parts.push('现在专注·未来可期');
    }

    return parts.join(' | ') || '认知平衡·静观其变';
  }

  getHistory(): CognitiveState[] {
    return [...this.history];
  }

  reset(): void {
    const zero = TritVectorOps.zero();
    this.currentState = {
      vector: zero,
      hexagramIndex: TritVectorOps.toHexagramIndex(zero),
      piDepth: 5,
      eWeight: 0.5,
      timestamp: Date.now(),
      summary: '认知重置 — 悬置观察态'
    };
    this.history = [];
  }

  /**
   * 计算e衰减：基于时间半衰期
   */
  getDecayedWeight(timestamp: number): number {
    const age = Date.now() - timestamp;
    const halfLives = age / this.HALF_LIFE_MS;
    return Math.exp(-halfLives);
  }

  // ═══════════════════════════════════════════════════════════════
  // 认知算子集成（收敛检测 / 极端中和 / 记忆召回）
  // ═══════════════════════════════════════════════════════════════

  /** 当前认知状态是否收敛（到原点偏差 < 收敛阈值） */
  isConverged(): boolean {
    return CognitiveDistance.isConverged(this.currentState.vector);
  }

  /** 获取收敛状态详情 */
  getConvergenceStatus() {
    return CognitiveDistance.convergenceStatus(this.currentState.vector);
  }

  /** 当前认知是否极端（非中和维度数 >= 极端阈值） */
  isExtreme(): boolean {
    const config = getCogConfig();
    return TritVectorOps.isExtreme(this.currentState.vector, config.extremeThreshold);
  }

  /**
   * 前置认知处理钩子（AgentStep）
   *
   * 每轮推理前执行：
   *   1. 文本 → 九维向量映射
   *   2. 极端认知自动中和修正
   *   3. 召回历史相似认知补充上下文
   *   4. 收敛校验，未收敛生成反思指令
   *
   * @param intentText 用户意图文本
   * @returns 补充上下文 + 处理后的向量 + 收敛状态
   */
  preStep(intentText: string): {
    supplement: string;
    targetVector: TritVector;
    isExtreme: boolean;
    isConverged: boolean;
    needsReflection: boolean;
    reflectionPrompt: string;
  } {
    const config = getCogConfig();
    let targetVec = contentToTritVector(intentText);

    // 2. 极端认知自动中和
    const isExtreme = TritVectorOps.isExtreme(targetVec, config.extremeThreshold);
    if (isExtreme) {
      targetVec = TritVectorOps.neutralizeWithOrigin(targetVec);
    }

    // 3. 召回历史相似认知
    const hist = this.cogMemory.searchTopK(targetVec, config.topKNum);
    const parts: string[] = hist.map(n => `[历史认知] ${n.text}`);

    // 4. 收敛校验
    const converged = CognitiveDistance.isConverged(targetVec);
    let needsReflection = false;
    let reflectionPrompt = '';

    if (!converged) {
      needsReflection = true;
      reflectionPrompt =
        '【认知空间未收敛】当前认知向量偏离原点距离过大，' +
        '请继续分步推理至目标认知点位收敛，禁止直接结束任务。' +
        '建议：补充缺失维度的分析，平衡阴阳态势，使认知趋向中和态。';
      parts.push(reflectionPrompt);
    }

    return {
      supplement: parts.join('\n'),
      targetVector: targetVec,
      isExtreme,
      isConverged: converged,
      needsReflection,
      reflectionPrompt,
    };
  }

  /**
   * 后置认知处理钩子（AgentPostStep）
   *
   * 每轮推理后执行：将推理结果编码为新认知点位写入记忆池
   *
   * @param resultText 推理结果文本
   * @param score 认知重要度评分 [0, 1]
   */
  postStep(resultText: string, score: number = 0.5): void {
    const vec = contentToTritVector(resultText);
    this.cogMemory.write(vec, resultText, score, ['reasoning', 'post-step']);
  }

  /**
   * 双重终止校验
   *
   * 第一层：业务完成判定（由调用方传入）
   * 第二层：认知空间收敛距离阈值
   *
   * 只有两层都通过才允许终止，否则强制继续迭代。
   *
   * @param businessDone 业务是否完成
   * @returns 是否可以终止 + 收敛详情
   */
  checkTermination(businessDone: boolean): {
    canTerminate: boolean;
    businessDone: boolean;
    cogConverged: boolean;
    bias: number;
    threshold: number;
  } {
    const status = this.getConvergenceStatus();
    return {
      canTerminate: businessDone && status.converged,
      businessDone,
      cogConverged: status.converged,
      bias: status.bias,
      threshold: status.threshold,
    };
  }
}
