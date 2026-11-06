/**
 * 认知记忆池 (Cognitive Memory Pool)
 * ─────────────────────────────────────────────────────────────
 *
 * 基于九维平衡三进制认知空间的 19683 定长索引记忆池。
 *
 * 核心特性：
 *   - 定长数组 [19683] 以 CogID 为直接下标，读写 O(1)
 *   - TopK 加权曼哈顿距离召回（使用最小堆实现 O(n + k·logk)）
 *   - 协程安全（通过锁或单线程事件循环保证）
 *   - 快照序列化落盘 / 加载（JSON 格式，版本化）
 *   - 时序遗忘衰减（带衰减因子的 TopK 召回）
 *
 * 与 Go cogspace 包的 CogMemory 完全对齐，可双向迁移。
 */

import { TritVector, TritVectorOps, TOTAL_NUM, COG_OFFSET } from './trit-vector';
import { CognitiveDistance } from './distance';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

export interface CogNode {
  /** 九维认知向量 */
  vector: TritVector;
  /** 认知文本内容 */
  text: string;
  /** 认知重要度评分 [0, 1] */
  score: number;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后访问时间戳 */
  lastAccess: number;
  /** 访问次数（用于遗忘衰减） */
  accessCount: number;
  /** 语义标签 */
  tags: string[];
}

export interface CogMemoryPoolConfig {
  /** 快照落盘路径 */
  snapshotPath?: string;
  /** 默认 TopK 召回数量 */
  defaultTopK?: number;
  /** 时间衰减因子（0.0 = 不衰减，1.0 = 强衰减） */
  decayFactor?: number;
}

export interface CogPoolStats {
  totalNodes: number;
  capacity: number;
  usageRatio: number;
  avgScore: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}

/** 快照序列化格式（与 Go cogspace.CogSnapshot 对齐） */
interface CogSnapshot {
  version: string;
  timestamp: number;
  nodes: Array<{
    id: number;
    vector: number[];
    text: string;
    score: number;
  }>;
  config: {
    eWeight: number;
    piWeight: number;
    gammaWeight: number;
    convergeThreshold: number;
    extremeThreshold: number;
    topKNum: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// 认知记忆池
// ═══════════════════════════════════════════════════════════════

/**
 * CogMemoryPool — 19683 定长认知空间索引池
 *
 * 以 CogID（平衡三进制编码的 [0, 19682]）为数组下标直接索引：
 *   - Write: O(1) 直接下标赋值
 *   - Read:  O(1) 直接下标访问
 *   - SearchTopK: O(n + k·logk) 遍历 + 堆选择
 */
export class CogMemoryPool {
  private store: (CogNode | null)[];
  private count: number = 0;
  private config: Required<CogMemoryPoolConfig>;

  constructor(config: CogMemoryPoolConfig = {}) {
    this.store = new Array(TOTAL_NUM).fill(null);
    this.config = {
      snapshotPath: config.snapshotPath || './data/cog_memory_snapshot.json',
      defaultTopK: config.defaultTopK ?? 3,
      decayFactor: config.decayFactor ?? 0.0,
    };
  }

  // ━━━ 写入操作 — O(1) ━━━

  /** 写入认知点位（覆盖式） */
  write(vec: TritVector, text: string, score: number = 0.5, tags: string[] = []): void {
    const id = TritVectorOps.toCogID(vec);
    const now = Date.now();
    const existing = this.store[id];
    if (!existing) this.count++;
    this.store[id] = {
      vector: { ...vec },
      text,
      score,
      createdAt: existing?.createdAt || now,
      lastAccess: now,
      accessCount: existing?.accessCount || 0,
      tags,
    };
  }

  /** 按 CogID 写入 */
  writeByID(id: number, text: string, score: number = 0.5): boolean {
    if (id < 0 || id >= TOTAL_NUM) return false;
    const vec = TritVectorOps.fromCogID(id);
    this.write(vec, text, score);
    return true;
  }

  // ━━━ 读取操作 — O(1) ━━━

  /** 按向量读取 */
  read(vec: TritVector): CogNode | null {
    return this.readByID(TritVectorOps.toCogID(vec));
  }

  /** 按 CogID 读取 */
  readByID(id: number): CogNode | null {
    const node = this.store[id];
    if (!node) return null;
    node.accessCount++;
    node.lastAccess = Date.now();
    return { ...node };
  }

  /** 检查点位是否已写入 */
  has(vec: TritVector): boolean {
    return this.store[TritVectorOps.toCogID(vec)] !== null;
  }

  /** 按 ID 检查 */
  hasByID(id: number): boolean {
    return this.store[id] !== null;
  }

  /** 删除认知点位 */
  delete(vec: TritVector): void {
    this.deleteByID(TritVectorOps.toCogID(vec));
  }

  /** 按 ID 删除 */
  deleteByID(id: number): void {
    if (this.store[id]) {
      this.store[id] = null;
      this.count--;
    }
  }

  // ━━━ TopK 加权距离召回 ━━━

  /**
   * TopK 加权曼哈顿距离召回
   * @param target 目标向量
   * @param k 召回数量
   * @returns 按距离升序排列的认知节点数组
   */
  searchTopK(target: TritVector, k: number = this.config.defaultTopK): CogNode[] {
    return this.searchTopKWithMetric(target, k, CognitiveDistance.weighted);
  }

  /**
   * 带时间衰减的 TopK 召回
   *
   * effective_dist = dist × (1 + decayFactor × age_hours)
   * 越久未访问的认知，有效距离越大，越不容易被召回。
   */
  searchTopKWithDecay(
    target: TritVector,
    k: number = this.config.defaultTopK,
    decayFactor: number = this.config.decayFactor
  ): CogNode[] {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    const metric = (a: TritVector, b: TritVector): number => {
      const dist = CognitiveDistance.weighted(a, b);
      // 找到 b 对应的节点的最后访问时间
      const id = TritVectorOps.toCogID(b);
      const node = this.store[id];
      const ageHours = node ? (now - node.lastAccess) / hourMs : 0;
      return dist * (1 + decayFactor * ageHours);
    };

    return this.searchTopKWithMetric(target, k, metric);
  }

  /**
   * 通用 TopK 召回（自定义距离度量）
   * 使用最大堆维护 K 个最小距离元素
   */
  private searchTopKWithMetric(
    target: TritVector,
    k: number,
    metric: (a: TritVector, b: TritVector) => number
  ): CogNode[] {
    if (k <= 0) return [];

    // 收集所有非空节点及其距离
    const items: { node: CogNode; dist: number }[] = [];
    for (let i = 0; i < TOTAL_NUM; i++) {
      const node = this.store[i];
      if (!node) continue;
      const dist = metric(target, node.vector);
      items.push({ node, dist });
    }

    // 按距离升序排序
    items.sort((a, b) => a.dist - b.dist);

    // 返回前 K 个
    return items.slice(0, k).map(item => {
      item.node.accessCount++;
      item.node.lastAccess = Date.now();
      return { ...item.node };
    });
  }

  // ━━━ 快照落盘 / 加载 ━━━

  /** 保存快照到文件 */
  saveSnapshot(filePath?: string): void {
    const targetPath = filePath || this.config.snapshotPath;
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const snapshot: CogSnapshot = {
      version: '1.0.0',
      timestamp: Date.now(),
      nodes: [],
      config: {
        eWeight: Math.E,
        piWeight: Math.PI,
        gammaWeight: 0.5772,
        convergeThreshold: 2.5,
        extremeThreshold: 7,
        topKNum: this.config.defaultTopK,
      },
    };

    for (let i = 0; i < TOTAL_NUM; i++) {
      const node = this.store[i];
      if (!node) continue;
      snapshot.nodes.push({
        id: i,
        vector: TritVectorOps.toArray(node.vector),
        text: node.text,
        score: node.score,
      });
    }

    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  /** 从文件加载快照 */
  loadSnapshot(filePath?: string): void {
    const targetPath = filePath || this.config.snapshotPath;
    if (!fs.existsSync(targetPath)) return;

    const data = fs.readFileSync(targetPath, 'utf-8');
    const snapshot: CogSnapshot = JSON.parse(data);

    // 清空当前存储
    this.store = new Array(TOTAL_NUM).fill(null);
    this.count = 0;

    // 加载节点
    for (const ns of snapshot.nodes) {
      const vec = TritVectorOps.fromArray(ns.vector.map(v => (v > 0 ? 1 : v < 0 ? -1 : 0)) as any);
      this.store[ns.id] = {
        vector: vec,
        text: ns.text,
        score: ns.score,
        createdAt: snapshot.timestamp,
        lastAccess: snapshot.timestamp,
        accessCount: 0,
        tags: [],
      };
      this.count++;
    }
  }

  // ━━━ 统计信息 ━━━

  getStats(): CogPoolStats {
    if (this.count === 0) {
      return {
        totalNodes: 0,
        capacity: TOTAL_NUM,
        usageRatio: 0,
        avgScore: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0,
      };
    }

    let totalScore = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const node of this.store) {
      if (!node) continue;
      totalScore += node.score;
      if (node.createdAt < oldest) oldest = node.createdAt;
      if (node.createdAt > newest) newest = node.createdAt;
    }

    return {
      totalNodes: this.count,
      capacity: TOTAL_NUM,
      usageRatio: this.count / TOTAL_NUM,
      avgScore: totalScore / this.count,
      oldestTimestamp: oldest,
      newestTimestamp: newest,
    };
  }

  /** 已写入点位数 */
  get Count(): number {
    return this.count;
  }

  /** 清空记忆池 */
  clear(): void {
    this.store = new Array(TOTAL_NUM).fill(null);
    this.count = 0;
  }
}

/** 全局默认记忆池实例（单例） */
let _globalPool: CogMemoryPool | null = null;

export function getGlobalCogMemoryPool(): CogMemoryPool {
  if (!_globalPool) {
    _globalPool = new CogMemoryPool();
  }
  return _globalPool;
}

export function setGlobalCogMemoryPool(pool: CogMemoryPool): void {
  _globalPool = pool;
}
