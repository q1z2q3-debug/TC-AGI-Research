import { cosineSimilarity, EmbeddingProvider } from '../src/cognitive/embedding';
import { SkillLoader } from '../src/skills/skill-loader';
import { MCPAdapter } from '../src/tools/mcp-adapter';
import { MemorySystem } from '../src/memory/memory-system';

/**
 * 确定性假嵌入：基于字符频率哈希到定长向量。
 * 共享字符越多 → 余弦相似度越高（足以验证检索排序逻辑，无需真实模型）。
 */
function fakeEmbed(text: string, dim = 64): number[] {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[text.charCodeAt(i) % dim] += 1;
    if (i + 1 < text.length) {
      v[(text.charCodeAt(i) * 31 + text.charCodeAt(i + 1)) % dim] += 1;
    }
  }
  return v;
}

class FakeEmbedder implements EmbeddingProvider {
  constructor(private mode: 'ok' | 'null' = 'ok') {}
  async embed(text: string): Promise<number[] | null> {
    if (this.mode === 'null') return null;
    return fakeEmbed(text);
  }
}

function newSkillLoader(): SkillLoader {
  return new SkillLoader(new MemorySystem());
}

describe('cosineSimilarity 纯函数', () => {
  test('完全相同的向量 → 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
  test('正交向量 → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  test('相反向量 → -1', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
  });
  test('维度不一致或空 → 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [1])).toBe(0);
  });
});

describe('SkillLoader 语义检索', () => {
  test('无嵌入客户端时回退关键词匹配', async () => {
    const loader = newSkillLoader();
    await loader.loadAll();
    const matches = await loader.matchSkills('请执行 web-search 查询', 3, 0.25);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].skill.name).toBe('web-search');
    expect(matches[0].source).toBe('keyword');
  });

  test('接入嵌入后按余弦相似度命中语义最相关技能', async () => {
    const loader = newSkillLoader();
    await loader.loadAll();
    loader.setEmbeddingClient(new FakeEmbedder('ok'));
    await loader.buildIndex();

    // 所有内置技能应被索引
    const all = loader.getAllSkills();
    expect(all.every(s => Array.isArray(s.embedding))).toBe(true);

    // 目标含"控制浏览器导航"语义 → 应命中 browser-control
    const matches = await loader.matchSkills('控制浏览器进行自动导航点击操作', 3, 0);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].skill.name).toBe('browser-control');
    expect(matches[0].source).toBe('embedding');
    expect(matches[0].score).toBeGreaterThan(0);
  });

  test('嵌入客户端返回 null 时优雅降级（不抛错，回退关键词）', async () => {
    const loader = newSkillLoader();
    await loader.loadAll();
    loader.setEmbeddingClient(new FakeEmbedder('null'));
    await expect(loader.buildIndex()).resolves.toBeUndefined();
    // 索引未建立 → 走关键词路径
    const matches = await loader.matchSkills('memory-retrieve 一下', 3, 0.25);
    expect(matches[0].source).toBe('keyword');
    expect(matches[0].skill.name).toBe('memory-retrieve');
  });
});

describe('MCPAdapter 工具语义检索', () => {
  test('无嵌入时回退关键词匹配', async () => {
    const mcp = new MCPAdapter();
    await mcp.initialize();
    const matches = await mcp.matchTools('使用 file-read 读取配置', 3, 0.25);
    expect(matches[0].tool.name).toBe('file-read');
    expect(matches[0].source).toBe('keyword');
  });

  test('接入嵌入后按语义命中 shell-exec', async () => {
    const mcp = new MCPAdapter();
    await mcp.initialize();
    mcp.setEmbeddingClient(new FakeEmbedder('ok'));
    await mcp.buildIndex();
    const matches = await mcp.matchTools('执行 shell 命令运行脚本', 3, 0);
    expect(matches[0].tool.name).toBe('shell-exec');
    expect(matches[0].source).toBe('embedding');
  });
});
