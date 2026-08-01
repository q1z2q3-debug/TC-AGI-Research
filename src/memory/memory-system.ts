/**
 * 三元索引记忆系统 (Memory System)
 * 基于 卦象索引(0~19682) + π展开深度(1~10) + e呼吸相位(权重)
 * 实现长期记忆的存储、检索、遗忘与进化
 *
 * 升级：检索算法从"关键词匹配 + 卦象索引线性差"升级为
 *      "关键词匹配 + 三元认知距离（复合距离）+ 时间衰减 + 重要性"多维融合评分。
 */

import { MemoryStore } from './memory-store';
import { v4 as uuidv4 } from 'uuid';
import { contentHexagram, contentToTritVector } from '../cognitive/semantic';
import { CognitiveDistance } from '../cognitive/distance';
import { TritVector, TritVectorOps } from '../cognitive/trit-vector';
import { Memory, MemoryQuery, MemoryStats } from './memory-types';

export { Memory, MemoryQuery };

export class MemorySystem {
  private store: MemoryStore;
  private memories: Memory[] = [];
  private initialized = false;
  private readonly HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
  private readonly MAX_MEMORIES = 10000;

  constructor() {
    this.store = new MemoryStore();
  }

  async initialize() {
    if (this.initialized) return;
    await this.store.initialize();
    this.memories = await this.store.loadAll();

    // 迁移：为旧记忆补充 tritVector 字段（向后兼容）
    let migrated = 0;
    for (const m of this.memories) {
      if (!m.tritVector) {
        m.tritVector = contentToTritVector(m.content);
        migrated++;
      }
    }
    if (migrated > 0) {
      console.log(`🔄 记忆迁移: 为 ${migrated} 条旧记忆补充认知向量`);
      // 持久化迁移结果
      await this.store.saveAll(this.memories);
    }

    this.initialized = true;
    console.log(`🧠 记忆系统初始化: ${this.memories.length} 条记忆`);
  }

  /**
   * 保存记忆
   */
  async save(memory: Omit<Memory, 'id' | 'hexagramIndex' | 'tritVector' | 'piDepth' | 'eWeight' | 'timestamp' | 'accessCount' | 'lastAccess' | 'importance'>): Promise<Memory> {
    await this.ensureInitialized();

    const tritVector = contentToTritVector(memory.content);
    const fullMemory: Memory = {
      id: uuidv4(),
      ...memory,
      tritVector,
      hexagramIndex: this.calcHexagramIndex(memory.content),
      piDepth: this.calcPiDepth(memory.content),
      eWeight: this.calcEWeight(memory.content),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      importance: this.calcImportance(memory.content)
    };

    // 去重：检查是否有相似记忆
    const similar = this.findSimilar(fullMemory);
    if (similar) {
      // 更新已有记忆而不是新增
      return await this.update(similar.id, {
        content: fullMemory.content,
        importance: Math.min(1, similar.importance + 0.1),
        eWeight: Math.min(1, similar.eWeight + 0.05)
      });
    }

    this.memories.push(fullMemory);
    await this.store.save(fullMemory);
    this.prune();
    return fullMemory;
  }

  /**
   * 更新记忆
   */
  async update(id: string, updates: Partial<Omit<Memory, 'id' | 'timestamp' | 'accessCount'>>): Promise<Memory> {
    await this.ensureInitialized();
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Memory ${id} not found`);

    const updated = { ...this.memories[index], ...updates, timestamp: Date.now() };
    this.memories[index] = updated;
    await this.store.save(updated);
    return updated;
  }

  /**
   * 检索记忆（三元距离检索）
   *
   * 升级：从"关键词匹配 + 卦象索引线性差"升级为多维融合评分：
   *   1. 关键词匹配（文本相关度）     权重: 0.25
   *   2. 三元认知距离（复合距离倒数）  权重: 0.35  ← 核心升级
   *   3. e活性 × 时间衰减             权重: 0.15
   *   4. 访问频率                     权重: 0.10
   *   5. 重要性                       权重: 0.15
   *
   * 三元认知距离使用 CognitiveDistance.composite()，
   * 融合 Hamming/Manhattan/Euclidean/Cosine 四种距离度量，
   * 比原先的卦象索引线性差更准确地捕捉语义相似性。
   */
  retrieve(query: string, limit: number = 10, type?: Memory['type']): Memory[] {
    // 关键词匹配
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // 查询的认知向量（用于三元距离计算）
    const queryVector = contentToTritVector(query);

    let scored = this.memories.map(m => {
      // ── 1. 关键词匹配 ──
      let keywordScore = 0;
      const contentLower = m.content.toLowerCase();
      const nameLower = m.name.toLowerCase();
      const tagMatch = m.tags.some(t => keywords.some(k => t.toLowerCase().includes(k)));

      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) keywordScore += 3;
        if (nameLower.includes(keyword)) keywordScore += 2;
        if (tagMatch) keywordScore += 1;
      }
      // 归一化关键词分数到 0~1
      const keywordNorm = keywords.length > 0
        ? Math.min(1, keywordScore / (keywords.length * 6))
        : 0;

      // ── 2. 三元认知距离（核心升级）──
      // 使用复合距离（Hamming+Manhattan+Euclidean+Cosine 融合）
      // 距离越小 → 相似度越高
      const compositeDist = CognitiveDistance.composite(queryVector, m.tritVector);
      const cognitiveSimilarity = 1 - compositeDist; // 0~1，1=完全相似

      // 同时计算加权距离作为补充信号
      const weightedDist = CognitiveDistance.weightedNormalized(queryVector, m.tritVector);
      const weightedSimilarity = 1 - weightedDist;

      // 融合两种距离的相似度
      const distScore = 0.7 * cognitiveSimilarity + 0.3 * weightedSimilarity;

      // ── 3. e活性 × 时间衰减 ──
      const eScore = m.eWeight * this.calcDecay(m.timestamp);

      // ── 4. 访问频率 ──
      const accessBoost = Math.min(1, m.accessCount / 10);

      // ── 5. 重要性 ──
      const importanceScore = m.importance;

      // ── 多维融合评分 ──
      const score =
        keywordNorm * 0.25 +
        distScore * 0.35 +
        eScore * 0.15 +
        accessBoost * 0.10 +
        importanceScore * 0.15;

      return { memory: m, score };
    });

    // 类型过滤
    if (type) {
      scored = scored.filter(s => s.memory.type === type);
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(s => s.memory);

    // 更新访问计数
    for (const m of top) {
      m.accessCount++;
      m.lastAccess = Date.now();
      this.store.save(m);
    }

    return top;
  }

  /**
   * 按条件查询
   */
  query(options: MemoryQuery): Memory[] {
    let results = [...this.memories];

    if (options.type) {
      results = results.filter(m => m.type === options.type);
    }
    if (options.tags && options.tags.length > 0) {
      results = results.filter(m => options.tags!.some(t => m.tags.includes(t)));
    }
    if (options.minImportance !== undefined) {
      results = results.filter(m => m.importance >= options.minImportance!);
    }

    // 按重要性排序
    results.sort((a, b) => b.importance - a.importance);

    return results.slice(0, options.limit || 20);
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    this.memories = this.memories.filter(m => m.id !== id);
    await this.store.delete(id);
  }

  /**
   * 获取所有记忆
   */
  getAll(): Memory[] {
    return [...this.memories];
  }

  /**
   * 统计信息（返回 MemoryStats 统一类型）
   *
   * 升级：返回 memory-types.ts 中定义的 MemoryStats，
   *      包含 avgPiDepth/avgEWeight/mostActiveTags 等完整字段。
   */
  getStats(): MemoryStats {
    const byType: Record<string, number> = {};
    let totalPiDepth = 0;
    let totalEWeight = 0;
    const tagCounts: Record<string, number> = {};
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const m of this.memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      totalPiDepth += m.piDepth;
      totalEWeight += m.eWeight;
      if (m.timestamp < oldestTimestamp) oldestTimestamp = m.timestamp;
      if (m.timestamp > newestTimestamp) newestTimestamp = m.timestamp;
      for (const tag of m.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const mostActiveTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.memories.length,
      byType: byType as MemoryStats['byType'],
      avgPiDepth: this.memories.length > 0 ? totalPiDepth / this.memories.length : 0,
      avgEWeight: this.memories.length > 0 ? totalEWeight / this.memories.length : 0,
      mostActiveTags,
      oldestTimestamp: this.memories.length > 0 ? oldestTimestamp : 0,
      newestTimestamp
    };
  }

  /**
   * 查找相似记忆（去重）
   *
   * 升级：从 Jaccard 词汇距离升级为三元认知距离（复合距离）。
   *      当新记忆与已有记忆的认知距离 < 0.2（即相似度 > 0.8）时视为重复。
   */
  private findSimilar(memory: Memory): Memory | null {
    const threshold = 0.2; // 复合距离阈值，小于此值视为相似
    for (const existing of this.memories) {
      if (existing.type !== memory.type) continue;
      const dist = CognitiveDistance.composite(memory.tritVector, existing.tritVector);
      if (dist < threshold) {
        return existing;
      }
    }
    return null;
  }

  /**
   * 按认知向量检索记忆（三元距离检索的向量版）
   *
   * 直接使用认知向量进行距离计算，无需文本关键词。
   * 适用于认知空间内部的状态迁移参考。
   */
  retrieveByVector(
    vector: TritVector,
    limit: number = 10,
    type?: Memory['type']
  ): { memory: Memory; distance: number; similarity: number }[] {
    let scored = this.memories.map(m => {
      const dist = CognitiveDistance.composite(vector, m.tritVector);
      return { memory: m, distance: dist, similarity: 1 - dist };
    });

    if (type) {
      scored = scored.filter(s => s.memory.type === type);
    }

    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, limit);
  }

  /**
   * 卦象索引：使用与认知空间一致的"真实语义坐标"，
   * 取代原先的字符串哈希随机桶（那不是语义坐标）。
   */
  private calcHexagramIndex(content: string): number {
    return contentHexagram(content);
  }

  private calcPiDepth(content: string): number {
    const length = Math.min(content.length, 1000);
    const uniqueRatio = new Set(content).size / Math.max(length, 1);
    const complexity = Math.min(1, (length / 200) * 0.5 + uniqueRatio * 0.5);
    return Math.max(1, Math.min(10, Math.floor(complexity * 10) + 1));
  }

  private calcEWeight(content: string): number {
    const hasUrgency = /现在|立即|紧急|重要/.test(content);
    const hasEmotion = /爱|恨|喜|怒|哀|乐|感/.test(content);
    let weight = 0.4;
    if (hasUrgency) weight += 0.3;
    if (hasEmotion) weight += 0.2;
    if (content.length > 100) weight += 0.1;
    return Math.min(1, weight);
  }

  private calcImportance(content: string): number {
    let score = 0.3;
    const keywords = ['重要', '关键', '核心', '必须', '一定', '确保', '否则'];
    for (const kw of keywords) {
      if (content.includes(kw)) score += 0.1;
    }
    if (content.length > 200) score += 0.1;
    return Math.min(1, score);
  }

  private calcDecay(timestamp: number): number {
    const age = Date.now() - timestamp;
    const halfLives = age / this.HALF_LIFE_MS;
    return Math.exp(-halfLives);
  }

  private prune(): void {
    if (this.memories.length <= this.MAX_MEMORIES) return;
    // 按重要性排序，保留最重要的
    const sorted = [...this.memories].sort((a, b) => {
      const scoreA = a.importance * a.eWeight * (1 + Math.log1p(a.accessCount));
      const scoreB = b.importance * b.eWeight * (1 + Math.log1p(b.accessCount));
      return scoreB - scoreA;
    });
    this.memories = sorted.slice(0, this.MAX_MEMORIES);
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async shutdown(): Promise<void> {
    await this.store.saveAll(this.memories);
    // saveAll 仅调度防抖写入，shutdown 时需强制立即落盘，避免丢失尚未刷写的变更
    await this.store.flush();
    console.log('💾 记忆系统已关闭');
  }
}
