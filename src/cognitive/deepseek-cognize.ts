/**
 * DeepSeekCognize 认知循环
 * 觉知 → 推理 → 进化 → 自知
 *
 * 四步闭环：
 * 1. 觉知 (perceive): 输入 → Trit分解 → 卦象坐标 → π/e调节
 * 2. 推理 (reason): 基于认知状态 → 派生行动策略
 * 3. 进化 (evolve): 任务结果反馈 → 调整认知向量
 * 4. 自知 (get_state): 返回完整认知态势快照
 */

import { CognitiveSpace, CognitiveState, CognitiveSnapshot } from './cognitive-space';
import { TritVector, TritVectorOps } from './trit-vector';

export interface ActionStrategy {
  name: string;
  description: string;
  priority: number;
  steps: string[];
  confidence: number;
}

export interface TaskResult {
  success: boolean;
  goal: string;
  feedback: string;
  metrics?: Record<string, number>;
}

export class DeepSeekCognize {
  private cognitiveSpace: CognitiveSpace;
  private strategyHistory: ActionStrategy[] = [];

  constructor() {
    this.cognitiveSpace = new CognitiveSpace();
  }

  perceive(input: string): CognitiveState {
    console.log(`🧠 觉知: 解析 "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}"`);
    const state = this.cognitiveSpace.perceive(input);
    console.log(`   卦象: ${state.hexagramIndex} | π深度: ${state.piDepth} | e活性: ${state.eWeight.toFixed(2)}`);
    console.log(`   摘要: ${state.summary}`);
    return state;
  }

  reason(state?: CognitiveState): ActionStrategy {
    const currentState = state || this.cognitiveSpace.getState();
    const snapshot = this.cognitiveSpace.getSnapshot();
    const vector = currentState.vector;
    const majority = snapshot.majority;

    let strategy: ActionStrategy;

    if (majority === 1) {
      strategy = this.deriveExpansionStrategy(vector);
    } else if (majority === -1) {
      strategy = this.deriveContractionStrategy(vector);
    } else {
      strategy = this.deriveObservationStrategy(vector);
    }

    console.log(`🎯 推理: ${strategy.name} (置信度: ${(strategy.confidence * 100).toFixed(0)}%)`);
    this.strategyHistory.push(strategy);
    return strategy;
  }

  private deriveExpansionStrategy(vector: TritVector): ActionStrategy {
    const steps: string[] = [];
    let name = '主动扩张策略';
    let confidence = 0.6;

    if (vector.internal === 1 && vector.external === 1) {
      name = '内外协同·全面扩张';
      steps.push('评估外部机会', '调动内部资源', '制定行动方案', '执行并监控');
      confidence = 0.85;
    } else if (vector.internal === 1 && vector.external === 0) {
      name = '由内向外·稳健扩张';
      steps.push('巩固核心优势', '逐步向外渗透', '建立反馈通道');
      confidence = 0.75;
    } else if (vector.internal === 0 && vector.external === 1) {
      name = '借势扩张·顺势而为';
      steps.push('识别外部趋势', '快速响应', '善用外部资源');
      confidence = 0.7;
    } else {
      steps.push('评估当前认知状态', '寻找扩张切入点', '小步快跑验证');
      confidence = 0.55;
    }

    if (vector.cause === 1 && vector.condition === 1) {
      steps.push('因缘具足·加速推进');
      confidence = Math.min(1, confidence + 0.1);
    }
    if (vector.effect === 1) {
      steps.push('已有正向成果·放大优势');
      confidence = Math.min(1, confidence + 0.05);
    }

    return {
      name,
      description: '认知处于扩张态，适合主动行动',
      priority: 1,
      steps,
      confidence
    };
  }

  private deriveContractionStrategy(vector: TritVector): ActionStrategy {
    const steps: string[] = [];
    let name = '收缩防御策略';
    let confidence = 0.6;

    if (vector.internal === -1) {
      name = '修复内核·稳固根基';
      steps.push('停止外部扩张', '梳理内部矛盾', '重建核心信念', '逐步恢复元气');
      confidence = 0.8;
    } else if (vector.external === -1) {
      name = '环境收缩·保存实力';
      steps.push('收缩业务范围', '降低外部依赖', '储备资源待机');
      confidence = 0.75;
    } else if (vector.medial === -1) {
      name = '疏通通道·恢复连接';
      steps.push('识别阻塞点', '建立新连接', '修复断裂关系');
      confidence = 0.7;
    } else {
      steps.push('暂停外部行动', '内部深度反思', '等待认知恢复');
      confidence = 0.5;
    }

    if (vector.cause === -1) {
      steps.push('重新审视动机·纠正方向');
      confidence = Math.min(1, confidence + 0.1);
    }
    if (vector.effect === -1) {
      steps.push('止损·停止恶化');
      confidence = Math.min(1, confidence + 0.1);
    }

    return {
      name,
      description: '认知处于收缩态，适合防御与修复',
      priority: 2,
      steps,
      confidence
    };
  }

  private deriveObservationStrategy(vector: TritVector): ActionStrategy {
    const steps: string[] = [];
    let name = '观察学习策略';
    let confidence = 0.5;

    const zeroDims = TritVectorOps.toArray(vector).filter(v => v === 0).length;
    if (zeroDims >= 5) {
      name = '信息饥渴·全面观察';
      steps.push('扩大信息收集范围', '多角度观察', '不急于行动', '等待认知清晰');
      confidence = 0.65;
    } else if (vector.internal === 1 && vector.external === 0) {
      name = '内核稳固·探索外部';
      steps.push('保持内部稳定', '主动了解外部环境', '寻找切入点');
      confidence = 0.6;
    } else if (vector.internal === 0 && vector.external === 1) {
      name = '外部明朗·内观整合';
      steps.push('收集外部信息', '整理内部认知', '建立内外连接');
      confidence = 0.6;
    } else {
      steps.push('保持开放心态', '收集各方信息', '分析认知差距', '逐步形成判断');
      confidence = 0.5;
    }

    if (vector.past === 1) {
      steps.push('调用历史经验参考');
      confidence += 0.05;
    }

    return {
      name,
      description: '认知处于观察态，适合信息收集与学习',
      priority: 3,
      steps,
      confidence
    };
  }

  evolve(result: TaskResult): void {
    console.log(`🔄 进化: ${result.success ? '✅ 成功' : '❌ 失败'} — ${result.goal}`);

    const current = this.cognitiveSpace.getState();
    const vector = current.vector;

    if (result.success) {
      const updated = {
        past: 1 as const,
        present: 1 as const,
        future: vector.future !== -1 ? 1 : 0,
        internal: vector.internal !== -1 ? 1 : 0,
        medial: vector.medial !== -1 ? 1 : 0,
        external: vector.external !== -1 ? 1 : 0,
        cause: vector.cause !== -1 ? 1 : 0,
        condition: vector.condition !== -1 ? 1 : 0,
        effect: 1 as const
      };
      const newVector: TritVector = {
        past: updated.past,
        present: updated.present,
        future: updated.future,
        internal: updated.internal,
        medial: updated.medial,
        external: updated.external,
        cause: updated.cause,
        condition: updated.condition,
        effect: updated.effect
      };
      this.cognitiveSpace.update({
        vector: newVector,
        summary: `成功进化: ${result.goal}`
      });
    } else {
      const newVector: TritVector = {
        past: vector.past !== 1 ? -1 : 1,
        present: -1,
        future: vector.future !== 1 ? -1 : 0,
        internal: vector.internal !== 1 ? -1 : 0,
        medial: vector.medial !== 1 ? -1 : 0,
        external: vector.external !== 1 ? -1 : 0,
        cause: vector.cause !== 1 ? -1 : 0,
        condition: vector.condition !== 1 ? -1 : 0,
        effect: -1
      };
      this.cognitiveSpace.update({
        vector: newVector,
        summary: `失败进化: ${result.goal} — 学习教训`
      });
    }

    console.log(`   认知已更新: ${this.cognitiveSpace.getState().summary}`);
  }

  getState(): CognitiveSnapshot {
    return this.cognitiveSpace.getSnapshot();
  }

  async cycle(input: string, callback?: (strategy: ActionStrategy) => Promise<TaskResult>): Promise<{
    state: CognitiveState;
    strategy: ActionStrategy;
    result?: TaskResult;
    snapshot: CognitiveSnapshot;
  }> {
    const state = this.perceive(input);
    const strategy = this.reason(state);
    let result: TaskResult | undefined;
    if (callback) {
      result = await callback(strategy);
      this.evolve(result);
    }
    const snapshot = this.getState();
    return { state, strategy, result, snapshot };
  }

  getCognitiveSpace(): CognitiveSpace {
    return this.cognitiveSpace;
  }

  getStrategyHistory(): ActionStrategy[] {
    return [...this.strategyHistory];
  }
}
