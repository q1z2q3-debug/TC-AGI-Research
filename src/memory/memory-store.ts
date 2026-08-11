/**
 * 记忆持久化存储
 * 支持 IndexedDB（浏览器）和 本地文件（Node.js 环境）
 */

import { Memory } from './memory-types';

// 浏览器环境全局（Node 构建时无 DOM lib，这里做最小化环境声明）
declare const window: any;
declare const indexedDB: any;

export class MemoryStore {
  private db: any = null;
  private initialized = false;
  private memory: Memory[] = [];
  private isNode = typeof window === 'undefined';

  // 防抖写入：避免每次 save 都触发文件 I/O，合并为一次批量写入
  private dirty: boolean = false;
  private debounceTimer: any = null;
  private readonly DEBOUNCE_MS = 500;

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
      // 优先使用环境变量 MEMORY_PATH，其次使用项目 data/ 目录
      const memoryPath = process.env.MEMORY_PATH ||
        path.join(process.cwd(), 'data', 'memory.json');
      // 确保 data/ 目录存在
      const dir = path.dirname(memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(memoryPath)) {
        const data = fs.readFileSync(memoryPath, 'utf-8');
        this.memory = JSON.parse(data);
      }
    } catch {
      // 文件不存在或解析失败，使用空内存
      this.memory = [];
    }
  }

  /**
   * 调度一次防抖写入：标记 dirty 并设置定时器，在 DEBOUNCE_MS 后执行一次批量写入。
   * 定时器到期前的多次调用会重置计时，从而被合并为一次文件 I/O，显著降低写入压力。
   */
  private scheduleFlush(): void {
    this.dirty = true;
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.doFlush().catch((e) => {
        console.error('💾 记忆防抖写入失败:', e instanceof Error ? e.message : String(e));
      });
    }, this.DEBOUNCE_MS);
  }

  /**
   * 执行实际的文件写入（仅 Node 环境）。仅当 dirty 为 true 时写入，
   * 写入失败输出错误日志（不再静默忽略，便于排查持久化问题）。
   */
  private async doFlush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const fs = await import('fs');
      const path = await import('path');
      // 优先使用环境变量 MEMORY_PATH，其次使用项目 data/ 目录
      const memoryPath = process.env.MEMORY_PATH ||
        path.join(process.cwd(), 'data', 'memory.json');
      // 确保 data/ 目录存在
      const dir = path.dirname(memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(memoryPath, JSON.stringify(this.memory, null, 2), 'utf-8');
    } catch (e) {
      this.dirty = true; // 写入失败时恢复 dirty 标记，下次 flush 重试
      console.error('💾 记忆持久化写入失败:', e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * 强制立即写入所有待持久化的变更。
   * 清除待执行的防抖定时器并立即执行一次写入，适用于 shutdown 或显式持久化场景。
   */
  async flush(): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.doFlush();
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
      // 标记 dirty 并调度防抖写入，避免每次 save 都触发文件 I/O
      this.scheduleFlush();
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
    await this.ensureInitialized();
    if (this.isNode) {
      // Node 环境：先在内存中批量更新，再仅调度一次防抖写入（而非循环调用 save）
      for (const m of memories) {
        const index = this.memory.findIndex(existing => existing.id === m.id);
        if (index >= 0) {
          this.memory[index] = m;
        } else {
          this.memory.push(m);
        }
      }
      this.scheduleFlush();
      return;
    }
    // 浏览器环境：保持原有逐条写入逻辑（IndexedDB 本身是异步的）
    for (const m of memories) {
      await this.save(m);
    }
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
    if (this.isNode) {
      this.memory = this.memory.filter(m => m.id !== id);
      this.scheduleFlush();
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
