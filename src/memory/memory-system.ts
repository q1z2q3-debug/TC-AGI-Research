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
  // 三元索引
  hexagramIndex: number;   // 0~19682 卦象索引
  piDepth: number;         // 1~10 π展开深度
  eWeight: number;         // e呼吸相位权重 (0~1)
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

export class MemorySystem {
  private store: MemoryStore;
  private memories: Memory[] = [];
  private readonly PI_DIGITS = '31415926535897932384626433832795028841971693993751'; // 示例π
  private readonly HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7天半衰期

  constructor() {
    this.store = new MemoryStore();
  }

  async initialize() {
    await this.store.initialize();
    this.memories = await this.store.loadAll();
    console.log(`🧠 记忆系统初始化: ${this.memories.length} 条记忆`);
  }

  /**
   * 保存记忆
   */
  async save(memory: Omit<Memory, 'id' | 'hexagramIndex' | 'piDepth' | 'eWeight' | 'timestamp' | 'accessCount' | 'lastAccess'>): Promise<Memory> {
    const fullMemory: Memory = {
      id: uuidv4(),
      ...memory,
      hexagramIndex: this.calcHexagramIndex(memory.content),
      piDepth: this.calcPiDepth(memory.content),
      eWeight: this.calcEWeight(memory.content),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now()
    };
    this.memories.push(fullMemory);
    await this.store.save(fullMemory);
    return fullMemory;
  }

  /**
   * 检索相关记忆
   */
  retrieve(query: string, limit: number = 10): Memory[] {
    // 计算查询的卦象索引
    const queryHex = this.calcHexagramIndex(query);
    
    // 排序：基于卦象相似度 + π深度 + e权重
    const scored = this.memories.map(m => {
      const hexScore = 1 - Math.abs(m.hexagramIndex - queryHex) / 19682;
      const piScore = Math.abs(m.piDepth - this.calcPiDepth(query)) / 10;
      const eScore = m.eWeight * this.calcDecay(m.timestamp);
      const totalScore = hexScore * 0.5 + piScore * 0.3 + eScore * 0.2;
      return { memory: m, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(s => s.memory);
    
    // 更新访问计数
    for (const m of top) {
      m.accessCount++;
      m.lastAccess = Date.now();
    }
    
    return top;
  }

  /**
   * 计算卦象索引 (0~19682)
   * 基于内容的哈希映射到九维三态空间
   */
  private calcHexagramIndex(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 19683;
  }

  /**
   * 计算π展开深度 (1~10)
   * 根据内容波动度决定精度
   */
  private calcPiDepth(content: string): number {
    // 简单：基于内容长度和复杂度
    const length = content.length;
    const uniqueChars = new Set(content).size;
    const complexity = uniqueChars / length;
    return Math.min(10, Math.max(1, Math.floor(complexity * 10) + 1));
  }

  /**
   * 计算e呼吸相位权重 (0~1)
   * 时间活性权重，7天半衰期
   */
  private calcEWeight(content: string): number {
    // 基于内容重要性和新鲜度
    return 0.5 + Math.random() * 0.5; // 简化为随机
  }

  /**
   * 计算衰减因子
   */
  private calcDecay(timestamp: number): number {
    const age = Date.now() - timestamp;
    const halfLives = age / this.HALF_LIFE_MS;
    return Math.exp(-halfLives); // e的负半衰期
  }

  /**
   * 异步保存所有记忆
   */
  async flush(): Promise<void> {
    await this.store.saveAll(this.memories);
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
    return this.memories;
  }
}
