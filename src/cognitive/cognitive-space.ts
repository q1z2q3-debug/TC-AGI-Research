/**
 * 认知空间层
 * 管理认知状态、卦象坐标、π精度、e活性
 */

import { TritVector, TritVectorOps, Trit } from './trit-vector';

export interface CognitiveState {
  vector: TritVector;
  hexagramIndex: number;
  piDepth: number;
  eWeight: number;
  timestamp: number;
  summary: string;
}

export interface CognitiveSnapshot {
  state: CognitiveState;
  timePropagation: TritVector;
  causePropagation: TritVector;
  majority: Trit;
  dimensionAnalysis: Record<string, string>;
}

export class CognitiveSpace {
  private currentState: CognitiveState;
  private history: CognitiveState[] = [];
  private readonly MAX_HISTORY = 100;

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

    return {
      state: { ...this.currentState },
      timePropagation: timeProp,
      causePropagation: causeProp,
      majority,
      dimensionAnalysis: dimAnalysis
    };
  }

  private dimLabel(t: Trit): string {
    switch (t) {
      case 1: return '☯ 阳 (+1)';
      case -1: return '☯ 阴 (-1)';
      default: return '◯ 中 (0)';
    }
  }

  update(updates: Partial<Omit<CognitiveState, 'timestamp'>>): void {
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

  perceive(input: string): CognitiveState {
    const vector = this.analyzeContent(input);
    const hexagramIndex = TritVectorOps.toHexagramIndex(vector);
    const piDepth = this.calcPiDepth(input);
    const eWeight = this.calcEWeight(input);
    const summary = this.generateSummary(vector);

    this.update({ vector, hexagramIndex, piDepth, eWeight, summary });
    return this.currentState;
  }

  private analyzeContent(input: string): TritVector {
    let past = 0, present = 0, future = 0;
    let internal = 0, medial = 0, external = 0;
    let cause = 0, condition = 0, effect = 0;

    const lower = input.toLowerCase();

    if (/过去|历史|曾经|以前/.test(lower)) past = 1;
    else if (/遗忘|忘记|损失/.test(lower)) past = -1;

    if (/现在|当前|目前|正在/.test(lower)) present = 1;
    else if (/混乱|迷惑|不清/.test(lower)) present = -1;

    if (/未来|将来|计划|目标/.test(lower)) future = 1;
    else if (/焦虑|担心|恐惧/.test(lower)) future = -1;

    if (/自己|内心|自我|信念/.test(lower)) internal = 1;
    else if (/内耗|矛盾|冲突/.test(lower)) internal = -1;

    if (/连接|沟通|协调|桥梁/.test(lower)) medial = 1;
    else if (/阻塞|断裂|无法/.test(lower)) medial = -1;

    if (/世界|环境|市场|外部/.test(lower)) external = 1;
    else if (/威胁|危险|危机/.test(lower)) external = -1;

    if (/因为|所以|原因|动机/.test(lower)) cause = 1;
    if (/条件|机会|资源/.test(lower)) condition = 1;
    if (/结果|成果|实现/.test(lower)) effect = 1;

    if ([past, present, future, internal, medial, external, cause, condition, effect]
      .every(v => v === 0)) {
      return TritVectorOps.zero();
    }

    return {
      past, present, future,
      internal, medial, external,
      cause, condition, effect
    };
  }

  private calcPiDepth(input: string): number {
    const length = input.length;
    const uniqueRatio = new Set(input).size / length;
    const complexity = Math.min(1, (length / 200) * 0.5 + uniqueRatio * 0.5);
    return Math.max(1, Math.min(10, Math.floor(complexity * 10) + 1));
  }

  private calcEWeight(input: string): number {
    const hasUrgency = /现在|立即|紧急|重要|尽快/.test(input);
    const hasFuture = /未来|计划|目标|方向/.test(input);
    let weight = 0.5;
    if (hasUrgency) weight += 0.3;
    if (hasFuture) weight += 0.2;
    return Math.min(1, weight);
  }

  private generateSummary(vector: TritVector): string {
    const parts: string[] = [];
    const majority = TritVectorOps.majority(vector);
    const labels: Record<Trit, string> = {
      1: '扩张',
      0: '观察',
      '-1': '收缩'
    };
    parts.push(`态势: ${labels[majority]}`);

    if (vector.internal === 1 && vector.external === -1) {
      parts.push('内核稳固·外境受压');
    }
    if (vector.medial === 1) {
      parts.push('通道畅通·内外调和');
    }
    if (vector.cause === 1 && vector.condition === 1) {
      parts.push('因缘具足·果可期待');
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
}
