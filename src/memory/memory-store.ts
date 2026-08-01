/**
 * 记忆持久化存储
 * 支持 IndexedDB（浏览器）和 本地文件（Node.js 环境）
 */

import { Memory } from './memory-system';

export class MemoryStore {
  private db: any = null;
  private initialized = false;
  private memory: Memory[] = [];
  private isNode = typeof window === 'undefined';

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.isNode) {
      // Node 环境：使用内存存储，并尝试加载文件
      await this.loadFromFile();
    } else {
      // 浏览器环境：使用 IndexedDB
      await this.initIndexedDB();
    }
    this.initialized = true;
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        // 降级到内存
        resolve();
        return;
      }
      const request = indexedDB.open('TCAGI_Memory', 2);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('memories')) {
          const store = db.createObjectStore('memories', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('hexagramIndex', 'hexagramIndex', { unique: false });
        }
      };
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });
  }

  private async loadFromFile(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const home = process.env.HOME || process.env.USERPROFILE || '.';
      const memoryPath = path.join(home, '.tc-agi-memory.json');
      if (fs.existsSync(memoryPath)) {
        const data = fs.readFileSync(memoryPath, 'utf-8');
        this.memory = JSON.parse(data);
      }
    } catch (e) {
      // 文件不存在或解析失败，使用空内存
      this.memory = [];
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const home = process.env.HOME || process.env.USERPROFILE || '.';
      const memoryPath = path.join(home, '.tc-agi-memory.json');
      fs.writeFileSync(memoryPath, JSON.stringify(this.memory, null, 2), 'utf-8');
    } catch (e) {
      // 忽略写入错误
    }
  }

  async loadAll(): Promise<Memory[]> {
    await this.ensureInitialized();
    if (this.isNode) {
      return [...this.memory];
    }
    if (!this.db) {
      return [];
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async save(memory: Memory): Promise<void> {
    await this.ensureInitialized();
    if (this.isNode) {
      const index = this.memory.findIndex(m => m.id === memory.id);
      if (index >= 0) {
        this.memory[index] = memory;
      } else {
        this.memory.push(memory);
      }
      await this.saveToFile();
      return;
    }
    if (!this.db) {
      // IndexedDB 不可用，降级到内存
      const index = this.memory.findIndex(m => m.id === memory.id);
      if (index >= 0) {
        this.memory[index] = memory;
      } else {
        this.memory.push(memory);
      }
      return;
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.put(memory);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAll(memories: Memory[]): Promise<void> {
    for (const m of memories) {
      await this.save(m);
    }
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    if (this.isNode) {
      this.memory = this.memory.filter(m => m.id !== id);
      await this.saveToFile();
      return;
    }
    if (!this.db) {
      this.memory = this.memory.filter(m => m.id !== id);
      return;
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
