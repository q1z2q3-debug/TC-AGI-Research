/**
 * 三元索引记忆系统 (Memory System)
 * 基于 卦象索引(0~19682) + π展开深度(1~10) + e呼吸相位(权重)
 * 实现长期记忆的存储、检索、遗忘与进化
 */

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
}

export class MemorySystem {
  private memories: Memory[] = [];
  private readonly HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

  async initialize() {
    console.log(`🧠 记忆系统初始化: ${this.memories.length} 条记忆`);
  }

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
    return fullMemory;
  }

  retrieve(query: string, limit: number = 10): Memory[] {
    const queryHex = this.calcHexagramIndex(query);
    const scored = this.memories.map(m => {
      const hexScore = 1 - Math.abs(m.hexagramIndex - queryHex) / 19682;
      const piScore = Math.abs(m.piDepth - this.calcPiDepth(query)) / 10;
      const eScore = m.eWeight * this.calcDecay(m.timestamp);
      const totalScore = hexScore * 0.5 + piScore * 0.3 + eScore * 0.2;
      return { memory: m, score: totalScore };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(s => s.memory);
    for (const m of top) {
      m.accessCount++;
      m.lastAccess = Date.now();
    }
    return top;
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
    const length = content.length;
    const uniqueChars = new Set(content).size;
    const complexity = uniqueChars / Math.max(length, 1);
    return Math.min(10, Math.max(1, Math.floor(complexity * 10) + 1));
  }

  private calcEWeight(content: string): number {
    return 0.5 + Math.random() * 0.5;
  }

  private calcDecay(timestamp: number): number {
    const age = Date.now() - timestamp;
    const halfLives = age / this.HALF_LIFE_MS;
    return Math.exp(-halfLives);
  }

  async flush(): Promise<void> {}
  async shutdown(): Promise<void> {
    console.log('💾 记忆系统已关闭');
  }

  getAllMemories(): Memory[] {
    return this.memories;
  }
}
