/**
 * 记忆持久化存储层
 * 支持 IndexedDB（浏览器）+ 本地文件（Node）双写
 * 自动降级，内存缓存加速
 */

import { Memory, MemoryQuery, MemoryStats, MEMORY_TYPES } from './memory-types';

export interface StoreAdapter {
  loadAll(): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  saveAll(memories: Memory[]): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  stats(): Promise<{ count: number; lastModified: number }>;
}

/**
 * 内存缓存适配器（开发/降级用）
 */
class MemoryCacheAdapter implements StoreAdapter {
  private memories: Memory[] = [];
  private lastModified = Date.now();

  async loadAll(): Promise<Memory[]> {
    return [...this.memories];
  }

  async save(memory: Memory): Promise<void> {
    const idx = this.memories.findIndex(m => m.id === memory.id);
    if (idx >= 0) {
      this.memories[idx] = memory;
    } else {
      this.memories.push(memory);
    }
    this.lastModified = Date.now();
  }

  async saveAll(memories: Memory[]): Promise<void> {
    for (const m of memories) {
      await this.save(m);
    }
  }

  async delete(id: string): Promise<void> {
    this.memories = this.memories.filter(m => m.id !== id);
    this.lastModified = Date.now();
  }

  async clear(): Promise<void> {
    this.memories = [];
    this.lastModified = Date.now();
  }

  async stats(): Promise<{ count: number; lastModified: number }> {
    return { count: this.memories.length, lastModified: this.lastModified };
  }
}

/**
 * IndexedDB 适配器（浏览器环境）
 */
class IndexedDBAdapter implements StoreAdapter {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TCAGI_Memory';
  private readonly STORE_NAME = 'memories';
  private readonly VERSION = 2;
  private initialized = false;
  private memoryCache: Memory[] = [];

  async init(): Promise<void> {
    if (this.initialized) return;
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('hexagramIndex', 'hexagramIndex', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initialized = true;
        resolve();
      };
      request.onerror = (event: Event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
  }

  async loadAll(): Promise<Memory[]> {
    this.ensureInitialized();
    if (this.memoryCache.length > 0) return [...this.memoryCache];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        this.memoryCache = request.result || [];
        resolve([...this.memoryCache]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(memory: Memory): Promise<void> {
    this.ensureInitialized();
    // 更新缓存
    const idx = this.memoryCache.findIndex(m => m.id === memory.id);
    if (idx >= 0) {
      this.memoryCache[idx] = memory;
    } else {
      this.memoryCache.push(memory);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(memory);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAll(memories: Memory[]): Promise<void> {
    this.ensureInitialized();
    for (const m of memories) {
      const idx = this.memoryCache.findIndex(c => c.id === m.id);
      if (idx >= 0) {
        this.memoryCache[idx] = m;
      } else {
        this.memoryCache.push(m);
      }
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      let completed = 0;
      let hasError = false;
      for (const m of memories) {
        const req = store.put(m);
        req.onsuccess = () => {
          completed++;
          if (completed === memories.length && !hasError) resolve();
        };
        req.onerror = () => {
          hasError = true;
          reject(req.error);
        };
      }
      if (memories.length === 0) resolve();
    });
  }

  async delete(id: string): Promise<void> {
    this.ensureInitialized();
    this.memoryCache = this.memoryCache.filter(m => m.id !== id);

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    this.memoryCache = [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async stats(): Promise<{ count: number; lastModified: number }> {
    const all = await this.loadAll();
    const lastModified = all.reduce((max, m) => Math.max(max, m.timestamp), 0);
    return { count: all.length, lastModified };
  }
}

/**
 * 本地文件适配器（Node 环境）
 */
class FileAdapter implements StoreAdapter {
  private memoryCache: Memory[] = [];
  private filePath: string;

  constructor(basePath?: string) {
    this.filePath = basePath || './.tc-agi-memory.json';
  }

  private async readFile(): Promise<Memory[]> {
    try {
      // 使用动态 import 避免浏览器环境报错
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async writeFile(memories: Memory[]): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(this.filePath, JSON.stringify(memories, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to write memory file:', error);
    }
  }

  async loadAll(): Promise<Memory[]> {
    if (this.memoryCache.length > 0) return [...this.memoryCache];
    this.memoryCache = await this.readFile();
    return [...this.memoryCache];
  }

  async save(memory: Memory): Promise<void> {
    const idx = this.memoryCache.findIndex(m => m.id === memory.id);
    if (idx >= 0) {
      this.memoryCache[idx] = memory;
    } else {
      this.memoryCache.push(memory);
    }
    await this.writeFile(this.memoryCache);
  }

  async saveAll(memories: Memory[]): Promise<void> {
    for (const m of memories) {
      const idx = this.memoryCache.findIndex(c => c.id === m.id);
      if (idx >= 0) {
        this.memoryCache[idx] = m;
      } else {
        this.memoryCache.push(m);
      }
    }
    await this.writeFile(this.memoryCache);
  }

  async delete(id: string): Promise<void> {
    this.memoryCache = this.memoryCache.filter(m => m.id !== id);
    await this.writeFile(this.memoryCache);
  }

  async clear(): Promise<void> {
    this.memoryCache = [];
    await this.writeFile(this.memoryCache);
  }

  async stats(): Promise<{ count: number; lastModified: number }> {
    const all = await this.loadAll();
    const lastModified = all.reduce((max, m) => Math.max(max, m.timestamp), 0);
    return { count: all.length, lastModified };
  }
}

/**
 * 记忆存储工厂
 * 自动选择最佳适配器：IndexedDB > File > Memory
 */
export class MemoryStore {
  private adapter: StoreAdapter;
  private initialized = false;

  constructor(options?: { filePath?: string }) {
    // 检测环境并选择适配器
    if (typeof indexedDB !== 'undefined' && typeof window !== 'undefined') {
      this.adapter = new IndexedDBAdapter();
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      this.adapter = new FileAdapter(options?.filePath);
    } else {
      this.adapter = new MemoryCacheAdapter();
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.adapter instanceof IndexedDBAdapter) {
      await (this.adapter as IndexedDBAdapter).init();
    }
    this.initialized = true;
  }

  async loadAll(): Promise<Memory[]> {
    await this.ensureInitialized();
    return this.adapter.loadAll();
  }

  async save(memory: Memory): Promise<void> {
    await this.ensureInitialized();
    return this.adapter.save(memory);
  }

  async saveAll(memories: Memory[]): Promise<void> {
    await this.ensureInitialized();
    return this.adapter.saveAll(memories);
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    return this.adapter.delete(id);
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    return this.adapter.clear();
  }

  async stats(): Promise<{ count: number; lastModified: number }> {
    await this.ensureInitialized();
    return this.adapter.stats();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export { IndexedDBAdapter, FileAdapter, MemoryCacheAdapter };
