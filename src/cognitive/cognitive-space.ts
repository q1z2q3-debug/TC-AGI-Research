/**
 * 认知空间层 (Cognitive Space)
 * 管理认知状态、卦象坐标、π精度、e活性
 * 包含内容感知、状态更新、历史追踪
 */

import { TritVector, TritVectorOps, Trit, TritDimension } from './trit-vector';

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

  constructor() {
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
   * 更新认知状态
   */
  update(updates: Partial<Omit<CognitiveState, 'timestamp'>>): void {
    // 保存历史
    this.history.push({ ...this.currentState });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    const newVector = updates.vector || this.currentState.vector;
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
    // 1. 内容分析 → Trit向量
    const vector = this.analyzeContent(input);

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
   * 内容分析 → Trit向量（可扩展NLP）
   */
  private analyzeContent(input: string): TritVector {
    const lower = input.toLowerCase();
    let past = 0, present = 0, future = 0;
    let internal = 0, medial = 0, external = 0;
    let cause = 0, condition = 0, effect = 0;

    // 时间维度
    if (/过去|历史|曾经|以前|经验|回顾/.test(lower)) past = 1;
    else if (/遗忘|忘记|失去|损失/.test(lower)) past = -1;

    if (/现在|当前|目前|正在|此刻/.test(lower)) present = 1;
    else if (/混乱|迷惑|不清|迷茫/.test(lower)) present = -1;

    if (/未来|将来|计划|目标|预期|展望/.test(lower)) future = 1;
    else if (/焦虑|担心|恐惧|绝望/.test(lower)) future = -1;

    // 空间维度
    if (/自己|内心|自我|信念|价值观/.test(lower)) internal = 1;
    else if (/内耗|矛盾|冲突|纠结/.test(lower)) internal = -1;

    if (/连接|沟通|协调|桥梁|关系/.test(lower)) medial = 1;
    else if (/阻塞|断裂|无法|隔阂/.test(lower)) medial = -1;

    if (/世界|环境|市场|外部|他人/.test(lower)) external = 1;
    else if (/威胁|危险|危机|风险/.test(lower)) external = -1;

    // 因果维度
    if (/因为|所以|原因|动机|目的/.test(lower)) cause = 1;
    if (/条件|机会|资源|工具/.test(lower)) condition = 1;
    if (/结果|成果|实现|完成/.test(lower)) effect = 1;

    // 如果全部为0，使用观察态
    if ([past, present, future, internal, medial, external, cause, condition, effect]
      .every(v => v === 0)) {
      return TritVectorOps.zero();
    }

    // 时间链传播
    let v: TritVector = { past, present, future, internal, medial, external, cause, condition, effect };
    v = TritVectorOps.propagateTime(v);
    v = TritVectorOps.propagateCause(v);
    return v;
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
}
