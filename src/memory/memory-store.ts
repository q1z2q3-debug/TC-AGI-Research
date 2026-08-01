/**
 * 记忆持久化存储
 * 使用 IndexedDB 或本地文件（Node环境模拟）
 */

import { Memory } from './memory-system';

export class MemoryStore {
  private db: any;
  private initialized = false;

  async initialize() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      await this.initIndexedDB();
    } else {
      this.db = { memories: [] };
    }
    this.initialized = true;
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TCAGI_Memory', 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('memories')) {
          db.createObjectStore('memories', { keyPath: 'id' });
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

  async loadAll(): Promise<Memory[]> {
    if (!this.initialized) await this.initialize();
    if (this.db && this.db.memories) {
      return this.db.memories;
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
    if (this.db && this.db.memories) {
      const index = this.db.memories.findIndex((m: Memory) => m.id === memory.id);
      if (index >= 0) {
        this.db.memories[index] = memory;
      } else {
        this.db.memories.push(memory);
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
    if (this.db && this.db.memories) {
      this.db.memories = this.db.memories.filter((m: Memory) => m.id !== id);
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
}
