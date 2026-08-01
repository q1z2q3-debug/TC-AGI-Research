/**
 * 三元索引记忆系统 (Memory System)
 * 基于 卦象索引(0~19682) + π展开深度(1~10) + e呼吸相位(0~1)
 *
 * 核心能力：
 * - 自动索引：内容 → 卦象/π/e
 * - 智能检索：基于语义相似度 + 时间衰减
 * - 记忆进化：访问频率 + 反馈闭环
 * - 跨窗口持久化
 */

import { Memory, MemoryType, MemoryQuery, MemoryStats, MEMORY_TYPES } from './memory-types';
import { MemoryStore } from './memory-store';
import { v4 as uuidv4 } from 'uuid';

export class MemorySystem {
  private store: MemoryStore;
  private cache: Memory[] = [];
  private initialized = false;
  private readonly HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7天
  private readonly PI_DIGITS = '31415926535897932384626433832795028841971693993751';

  constructor(options?: { filePath?: string }) {
    this.store = new MemoryStore(options);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.store.initialize();
    this.cache = await this.store.loadAll();
    this.initialized = true;
    console.log(`🧠 记忆系统初始化: ${this.cache.length} 条记忆`);
  }

  /**
   * 保存记忆
   */
  async save(
    memory: Omit<Memory, 'id' | 'hexagramIndex' | 'piDepth' | 'eWeight' | 'timestamp' | 'accessCount' | 'lastAccess'>
  ): Promise<Memory> {
    await this.ensureInitialized();

    const content = memory.content;
    const fullMemory: Memory = {
      id: uuidv4(),
      ...memory,
      hexagramIndex: this.calcHexagramIndex(content),
      piDepth: this.calcPiDepth(content),
      eWeight: this.calcEWeight(content),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    };

    this.cache.push(fullMemory);
    await this.store.save(fullMemory);
    return fullMemory;
  }

  /**
   * 批量保存
   */
  async saveAll(memories: Array<Omit<Memory, 'id' | 'hexagramIndex' | 'piDepth' | 'eWeight' | 'timestamp' | 'accessCount' | 'lastAccess'>>): Promise<Memory[]> {
    await this.ensureInitialized();
    const fullMemories: Memory[] = memories.map(m => ({
      id: uuidv4(),
      ...m,
      hexagramIndex: this.calcHexagramIndex(m.content),
      piDepth: this.calcPiDepth(m.content),
      eWeight: this.calcEWeight(m.content),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    }));
    this.cache.push(...fullMemories);
    await this.store.saveAll(fullMemories);
    return fullMemories;
  }

  /**
   * 检索记忆（基于查询）
   */
  async retrieve(query: string | MemoryQuery, limit: number = 10): Promise<Memory[]> {
    await this.ensureInitialized();

    let q: MemoryQuery;
    if (typeof query === 'string') {
      q = { query, limit };
    } else {
      q = { ...query, limit: query.limit || limit };
    }

    let results = [...this.cache];

    // 类型过滤
    if (q.type) {
      results = results.filter(m => m.type === q.type);
    }

    // 标签过滤
    if (q.tags && q.tags.length > 0) {
      results = results.filter(m => q.tags!.some(tag => m.tags.includes(tag)));
    }

    // e权重过滤
    if (q.minEWeight !== undefined) {
      results = results.filter(m => m.eWeight >= q.minEWeight!);
    }
    if (q.maxEWeight !== undefined) {
      results = results.filter(m => m.eWeight <= q.maxEWeight!);
    }

    // 如果有关键词查询，计算相似度排序
    if (q.query) {
      const queryHex = this.calcHexagramIndex(q.query);
      const queryPi = this.calcPiDepth(q.query);

      results = results.map(m => {
        const hexScore = 1 - Math.abs(m.hexagramIndex - queryHex) / 19683;
        const piScore = 1 - Math.abs(m.piDepth - queryPi) / 10;
        const eScore = m.eWeight * this.calcDecay(m.timestamp);
        const accessBoost = Math.min(1, m.accessCount / 10) * 0.1;
        const totalScore = hexScore * 0.4 + piScore * 0.2 + eScore * 0.3 + accessBoost;
        return { memory: m, score: totalScore };
      });

      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, q.limit || 10).map(item => item.memory);
    } else {
      // 排序
      const sortBy = q.sortBy || 'timestamp';
      const sortOrder = q.sortOrder || 'desc';
      results.sort((a, b) => {
        const aVal = a[sortBy as keyof Memory] as number;
        const bVal = b[sortBy as keyof Memory] as number;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
      results = results.slice(q.offset || 0, (q.offset || 0) + (q.limit || 10));
    }

    // 更新访问计数
    for (const m of results) {
      m.accessCount++;
      m.lastAccess = Date.now();
    }
    await this.flush();

    return results;
  }

  /**
   * 按ID获取记忆
   */
  async get(id: string): Promise<Memory | undefined> {
    await this.ensureInitialized();
    const memory = this.cache.find(m => m.id === id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccess = Date.now();
      await this.flush();
    }
    return memory;
  }

  /**
   * 更新记忆
   */
  async update(id: string, updates: Partial<Omit<Memory, 'id' | 'hexagramIndex' | 'piDepth' | 'eWeight' | 'timestamp'>>): Promise<Memory | undefined> {
    await this.ensureInitialized();
    const idx = this.cache.findIndex(m => m.id === id);
    if (idx === -1) return undefined;

    const memory = this.cache[idx];
    const newContent = updates.content || memory.content;

    // 如果内容变化，重新计算索引
    const updated: Memory = {
      ...memory,
      ...updates,
      content: newContent,
      hexagramIndex: updates.content ? this.calcHexagramIndex(newContent) : memory.hexagramIndex,
      piDepth: updates.content ? this.calcPiDepth(newContent) : memory.piDepth,
      eWeight: updates.content ? this.calcEWeight(newContent) : memory.eWeight,
      timestamp: Date.now()
    };

    this.cache[idx] = updated;
    await this.store.save(updated);
    return updated;
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const idx = this.cache.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.cache.splice(idx, 1);
    await this.store.delete(id);
    return true;
  }

  /**
   * 清空所有记忆
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.cache = [];
    await this.store.clear();
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MemoryStats> {
    await this.ensureInitialized();
    const memories = this.cache;
    const byType: Record<MemoryType, number> = {
      user: 0,
      feedback: 0,
      topic: 0,
      reference: 0
    };

    const tagCount: Record<string, number> = {};
    let totalPi = 0;
    let totalE = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      totalPi += m.piDepth;
      totalE += m.eWeight;
      if (m.timestamp < oldest) oldest = m.timestamp;
      if (m.timestamp > newest) newest = m.timestamp;
      for (const tag of m.tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }

    const mostActiveTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      total: memories.length,
      byType,
      avgPiDepth: memories.length > 0 ? totalPi / memories.length : 0,
      avgEWeight: memories.length > 0 ? totalE / memories.length : 0,
      mostActiveTags,
      oldestTimestamp: oldest,
      newestTimestamp: newest
    };
  }

  /**
   * 异步刷新到存储
   */
  async flush(): Promise<void> {
    await this.store.saveAll(this.cache);
  }

  /**
   * 关闭记忆系统
   */
  async shutdown(): Promise<void> {
    await this.flush();
    console.log('💾 记忆系统已关闭');
  }

  /**
   * 获取所有记忆（用于调试）
   */
  getAllMemories(): Memory[] {
    return [...this.cache];
  }

  // ===== 私有方法 =====

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 计算卦象索引 (0~19682)
   */
  private calcHexagramIndex(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) & 0x7FFFFFFF;
    }
    return Math.abs(hash) % 19683;
  }

  /**
   * 计算π展开深度 (1~10)
   */
  private calcPiDepth(content: string): number {
    const length = Math.min(content.length, 1000);
    if (length === 0) return 5;
    const uniqueChars = new Set(content).size;
    const complexity = uniqueChars / Math.max(length, 1);
    return Math.max(1, Math.min(10, Math.floor(complexity * 12) + 1));
  }

  /**
   * 计算e呼吸相位权重 (0~1)
   */
  private calcEWeight(content: string): number {
    // 基于内容重要性和新鲜度
    let weight = 0.5;
    const lower = content.toLowerCase();
    if (/重要|关键|核心|必须|紧急/.test(lower)) weight += 0.2;
    if (/未来|计划|目标|方向/.test(lower)) weight += 0.15;
    if (/经验|教训|总结/.test(lower)) weight += 0.1;
    if (/风险|威胁|危机/.test(lower)) weight += 0.1;
    if (content.length > 100) weight += 0.05;
    return Math.min(1, weight);
  }

  /**
   * 计算衰减因子
   */
  private calcDecay(timestamp: number): number {
    const age = Date.now() - timestamp;
    const halfLives = age / this.HALF_LIFE_MS;
    return Math.exp(-halfLives);
  }

  /**
   * 自动清理：删除衰减过度的记忆（可配置）
   */
  async autoCleanup(threshold: number = 0.01): Promise<number> {
    await this.ensureInitialized();
    const toDelete: string[] = [];
    for (const m of this.cache) {
      const decay = this.calcDecay(m.timestamp);
      if (decay < threshold && m.accessCount < 2) {
        toDelete.push(m.id);
      }
    }
    for (const id of toDelete) {
      await this.delete(id);
    }
    return toDelete.length;
  }
}
