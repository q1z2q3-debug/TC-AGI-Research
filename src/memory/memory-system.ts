/**
 * 三元索引记忆系统 (Memory System)
 * 基于 卦象索引(0~19682) + π展开深度(1~10) + e呼吸相位(权重)
 * 实现长期记忆的存储、检索、遗忘与进化
 */

import { MemoryStore } from './memory-store';
import { v4 as uuidv4 } from 'uuid';

export interface Memory {
  id: string;
  type: 'user' | 'feedback' | 'topic' | 'reference';
  name: string;
  content: string;
  tags: string[];
  hexagramIndex: number;
  piDepth: number;
  eWeight: number;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  importance: number; // 0~1
}

export interface MemoryQuery {
  query: string;
  type?: 'user' | 'feedback' | 'topic' | 'reference';
  tags?: string[];
  limit?: number;
  minImportance?: number;
}

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
    this.initialized = true;
    console.log(`🧠 记忆系统初始化: ${this.memories.length} 条记忆`);
  }

  /**
   * 保存记忆
   */
  async save(memory: Omit<Memory, 'id' | 'hexagramIndex' | 'piDepth' | 'eWeight' | 'timestamp' | 'accessCount' | 'lastAccess' | 'importance'>): Promise<Memory> {
    await this.ensureInitialized();

    const fullMemory: Memory = {
      id: uuidv4(),
      ...memory,
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
   * 检索记忆
   */
  retrieve(query: string, limit: number = 10, type?: Memory['type']): Memory[] {
    // 先使用简单关键词匹配，后续可升级为embedding
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    let scored = this.memories.map(m => {
      let score = 0;
      const contentLower = m.content.toLowerCase();
      const nameLower = m.name.toLowerCase();
      const tagMatch = m.tags.some(t => keywords.some(k => t.toLowerCase().includes(k)));

      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) score += 3;
        if (nameLower.includes(keyword)) score += 2;
        if (tagMatch) score += 1;
      }

      // 卦象相似度
      const queryHex = this.calcHexagramIndex(query);
      const hexScore = 1 - Math.abs(m.hexagramIndex - queryHex) / 19682;
      score += hexScore * 0.5;

      // e活性权重
      const eScore = m.eWeight * this.calcDecay(m.timestamp);
      score += eScore * 0.3;

      // 访问频率
      const accessBoost = Math.min(1, m.accessCount / 10) * 0.2;
      score += accessBoost;

      // 重要性
      score += m.importance * 0.3;

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
   * 统计信息
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
    totalAccesses: number;
  } {
    const byType: Record<string, number> = {};
    let totalImportance = 0;
    let totalAccesses = 0;

    for (const m of this.memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
      totalImportance += m.importance;
      totalAccesses += m.accessCount;
    }

    return {
      total: this.memories.length,
      byType,
      avgImportance: this.memories.length > 0 ? totalImportance / this.memories.length : 0,
      totalAccesses
    };
  }

  /**
   * 查找相似记忆（去重）
   */
  private findSimilar(memory: Memory): Memory | null {
    const threshold = 0.8;
    for (const existing of this.memories) {
      if (existing.type !== memory.type) continue;
      const dist = this.calcDistance(memory.content, existing.content);
      if (dist < 1 - threshold) {
        return existing;
      }
    }
    return null;
  }

  private calcDistance(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return 1 - intersection.size / union.size;
  }

  private calcHexagramIndex(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 19683;
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
    console.log('💾 记忆系统已关闭');
  }
}
