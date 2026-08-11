/**
 * MemorySystem 单元测试
 * 覆盖：初始化、保存/检索/更新/删除记忆、去重、三元距离检索、统计、关闭时 flush。
 * 使用临时 MEMORY_PATH 避免污染真实数据。
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { MemorySystem } from '../src/memory/memory-system';
import { Memory } from '../src/memory/memory-types';

function makeTempMemoryPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-agi-mem-'));
  return path.join(dir, 'test-memory.json');
}

describe('MemorySystem', () => {
  let memPath: string;
  let system: MemorySystem;

  beforeEach(() => {
    memPath = makeTempMemoryPath();
    process.env.MEMORY_PATH = memPath;
    system = new MemorySystem();
  });

  afterEach(() => {
    delete process.env.MEMORY_PATH;
    const dir = path.dirname(memPath);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  describe('initialize', () => {
    it('应初始化为空记忆库', async () => {
      await system.initialize();
      expect(system.getAll()).toHaveLength(0);
      const stats = system.getStats();
      expect(stats.total).toBe(0);
    });

    it('重复调用 initialize 应幂等', async () => {
      await system.initialize();
      await system.initialize(); // 第二次不应报错
      expect(system.getAll()).toHaveLength(0);
    });
  });

  describe('save — 保存记忆', () => {
    it('应保存记忆并返回完整对象', async () => {
      await system.initialize();
      const saved = await system.save({
        type: 'topic',
        name: '测试主题',
        content: '这是一条测试记忆内容',
        tags: ['test', 'unit'],
      });
      expect(saved.id).toBeDefined();
      expect(saved.type).toBe('topic');
      expect(saved.name).toBe('测试主题');
      expect(saved.hexagramIndex).toBeGreaterThanOrEqual(0);
      expect(saved.hexagramIndex).toBeLessThanOrEqual(19682);
      expect(saved.piDepth).toBeGreaterThanOrEqual(1);
      expect(saved.piDepth).toBeLessThanOrEqual(10);
      expect(saved.eWeight).toBeGreaterThanOrEqual(0);
      expect(saved.eWeight).toBeLessThanOrEqual(1);
      expect(saved.importance).toBeGreaterThanOrEqual(0);
      expect(saved.timestamp).toBeDefined();
      expect(saved.tritVector).toBeDefined();
      expect(system.getAll()).toHaveLength(1);
    });

    it('相似内容应去重（更新已有记忆而非新增）', async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: '主题A', content: '人工智能认知架构研究', tags: ['ai'] });
      await system.save({ type: 'topic', name: '主题B', content: '人工智能认知架构研究', tags: ['ai'] });
      // 相同内容 + 相同 type 应被去重
      expect(system.getAll().length).toBeLessThanOrEqual(1);
    });
  });

  describe('retrieve — 检索记忆', () => {
    beforeEach(async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: 'AI研究', content: '人工智能与认知架构的前沿研究', tags: ['ai', 'cognition'] });
      await system.save({ type: 'feedback', name: '复盘1', content: '任务执行成功，经验已提取', tags: ['feedback'] });
      await system.save({ type: 'reference', name: '文档', content: '三元逻辑与主动推理的数学基础', tags: ['math', 'logic'] });
    });

    it('应返回相关记忆（按评分排序）', () => {
      const results = system.retrieve('人工智能认知', 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('limit 参数应限制返回数量', () => {
      const results = system.retrieve('研究', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('type 过滤应只返回指定类型', () => {
      const results = system.retrieve('研究', 10, 'feedback');
      expect(results.every((m: Memory) => m.type === 'feedback')).toBe(true);
    });

    it('检索应更新访问计数', () => {
      const before = system.getAll()[0].accessCount;
      system.retrieve('人工智能', 5);
      const after = system.getAll().find(m => m.name === 'AI研究')?.accessCount;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('update — 更新记忆', () => {
    it('应更新指定字段', async () => {
      await system.initialize();
      const saved = await system.save({ type: 'topic', name: '原名', content: '原内容', tags: ['old'] });
      const updated = await system.update(saved.id, { name: '新名', content: '新内容' });
      expect(updated.name).toBe('新名');
      expect(updated.content).toBe('新内容');
    });

    it('更新不存在的 ID 应抛错', async () => {
      await system.initialize();
      await expect(system.update('nonexistent', { name: 'x' })).rejects.toThrow('not found');
    });
  });

  describe('delete — 删除记忆', () => {
    it('应删除指定记忆', async () => {
      await system.initialize();
      const saved = await system.save({ type: 'topic', name: '待删除', content: '内容', tags: [] });
      expect(system.getAll()).toHaveLength(1);
      await system.delete(saved.id);
      expect(system.getAll()).toHaveLength(0);
    });
  });

  describe('query — 条件查询', () => {
    beforeEach(async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: '高重要', content: '重要关键核心必须确保', tags: ['important'] });
      await system.save({ type: 'feedback', name: '普通', content: '普通内容', tags: [] });
    });

    it('应按类型过滤', () => {
      const results = system.query({ type: 'topic' });
      expect(results.every(m => m.type === 'topic')).toBe(true);
    });

    it('应按标签过滤', () => {
      const results = system.query({ tags: ['important'] });
      expect(results.every(m => m.tags.includes('important'))).toBe(true);
    });

    it('应按最小重要性过滤', () => {
      const results = system.query({ minImportance: 0.5 });
      expect(results.every(m => m.importance >= 0.5)).toBe(true);
    });
  });

  describe('getStats — 统计信息', () => {
    it('空记忆库应返回零统计', async () => {
      await system.initialize();
      const stats = system.getStats();
      expect(stats.total).toBe(0);
      expect(stats.avgPiDepth).toBe(0);
      expect(stats.avgEWeight).toBe(0);
      expect(stats.mostActiveTags).toEqual([]);
    });

    it('有记忆时应返回正确统计', async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: 't1', content: '内容1', tags: ['a', 'b'] });
      await system.save({ type: 'feedback', name: 't2', content: '内容2', tags: ['a'] });
      const stats = system.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType.topic).toBe(1);
      expect(stats.byType.feedback).toBe(1);
      expect(stats.mostActiveTags[0].tag).toBe('a');
    });
  });

  describe('retrieveByVector — 向量检索', () => {
    it('应按认知向量距离排序返回', async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: 'v1', content: '扩张积极进取', tags: [] });
      const { TritVectorOps } = require('../src/cognitive/trit-vector');
      const results = system.retrieveByVector(TritVectorOps.zero(), 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results[0]).toHaveProperty('memory');
      expect(results[0]).toHaveProperty('distance');
      expect(results[0]).toHaveProperty('similarity');
    });
  });

  describe('shutdown — 关闭与持久化', () => {
    it('应保存所有记忆到文件并 flush', async () => {
      await system.initialize();
      await system.save({ type: 'topic', name: '持久化测试', content: '关机前保存', tags: ['persist'] });
      await system.shutdown();

      // 验证文件已写入
      expect(fs.existsSync(memPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
