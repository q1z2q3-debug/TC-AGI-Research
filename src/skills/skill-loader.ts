/**
 * 技能加载器
 * 支持内置技能、GitHub 导入、本地文件夹导入
 */

import { MemorySystem } from '../memory/memory-system';
import { EmbeddingProvider, cosineSimilarity } from '../cognitive/embedding';

export interface Skill {
  name: string;
  description: string;
  instructions: string;
  memoryEnabled: boolean;
  execute: (params: any) => Promise<any>;
  /** 语义向量（由 EmbeddingClient 计算，用于余弦检索） */
  embedding?: number[];
}

/** 技能匹配结果 */
export interface SkillMatch {
  skill: Skill;
  score: number;
  /** 命中来源：embedding 语义检索 / keyword 关键词回退 */
  source: 'embedding' | 'keyword';
}

export class SkillLoader {
  private memory: MemorySystem;
  private skills: Map<string, Skill> = new Map();
  private loaded = false;
  private embeddingClient: EmbeddingProvider | null = null;
  private indexed = false;

  constructor(memory: MemorySystem) {
    this.memory = memory;
  }

  /** 接入嵌入客户端（本地 Ollama 等），用于语义检索 */
  setEmbeddingClient(client: EmbeddingProvider): void {
    this.embeddingClient = client;
  }

  /** 是否已配置嵌入客户端 */
  get hasEmbedding(): boolean {
    return this.embeddingClient !== null;
  }

  async loadAll(): Promise<void> {
    if (this.loaded) return;
    await this.loadBuiltinSkills();
    this.loaded = true;
    console.log(`🔧 技能加载完成: ${this.skills.size} 个技能`);
  }

  private async loadBuiltinSkills(): Promise<void> {
    // Web 搜索技能
    this.skills.set('web-search', {
      name: 'web-search',
      description: '搜索互联网获取信息',
      instructions: '使用搜索引擎查询实时信息',
      memoryEnabled: true,
      execute: async (params: any) => {
        const query = params.query || params.q || '';
        if (!query) return { error: '缺少查询参数' };
        try {
          // 使用内置 fetch 或模拟
          const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
          const data = await response.json() as any;
          return { results: data.RelatedTopics || [], query };
        } catch (e) {
          return { error: String(e), query, fallback: '请检查网络连接' };
        }
      }
    });

    // 浏览器控制技能
    this.skills.set('browser-control', {
      name: 'browser-control',
      description: '控制浏览器进行导航、点击、填写等操作',
      instructions: '通过浏览器 API 控制页面',
      memoryEnabled: false,
      execute: async (params: any) => {
        const action = params.action || 'navigate';
        const url = params.url || '';
        // 实际实现需要浏览器扩展 API
        return { status: 'browser action simulated', action, url };
      }
    });

    // 自我进化技能
    this.skills.set('self-evolve', {
      name: 'self-evolve',
      description: '复盘并提取经验，写入记忆',
      instructions: '分析任务结果，提取经验并存储',
      memoryEnabled: true,
      execute: async (params: any) => {
        const action = params.action || 'evolve';
        const goal = params.goal || 'unknown';
        const result = params.result || {};
        const memoryContent = JSON.stringify({ action, goal, result, timestamp: new Date() });
        await this.memory.save({
          type: 'feedback',
          name: `自进化-${goal.slice(0, 30)}`,
          content: memoryContent,
          tags: ['self-evolve', action]
        });
        return { status: 'evolved', action, goal };
      }
    });

    // 记忆检索技能
    this.skills.set('memory-retrieve', {
      name: 'memory-retrieve',
      description: '检索相关记忆',
      instructions: '根据查询检索记忆',
      memoryEnabled: true,
      execute: async (params: any) => {
        const query = params.query || '';
        const limit = params.limit || 5;
        if (!query) return { error: '缺少查询参数' };
        const memories = this.memory.retrieve(query, limit);
        return { memories, query, count: memories.length };
      }
    });

    // 内容生成技能
    this.skills.set('content-gen', {
      name: 'content-gen',
      description: '生成内容（文章、摘要、报告等）',
      instructions: '根据输入生成高质量内容',
      memoryEnabled: true,
      execute: async (params: any) => {
        const topic = params.topic || '';
        const type = params.type || 'article';
        const length = params.length || 'medium';
        // 模拟生成
        return {
          content: `# ${topic}\n\n这是关于 ${topic} 的 ${type} 内容。\n\n长度: ${length}`,
          topic,
          type,
          length
        };
      }
    });

    // 社交媒体推送技能
    this.skills.set('social-push', {
      name: 'social-push',
      description: '发布内容到社交媒体',
      instructions: '推送文章到公众号、微博等',
      memoryEnabled: true,
      execute: async (params: any) => {
        const content = params.content || '';
        const platform = params.platform || 'wechat';
        // 模拟发布
        return {
          status: 'published',
          platform,
          contentLength: content.length,
          url: `https://example.com/posts/${Date.now()}`
        };
      }
    });

    // 量化因子技能
    this.skills.set('alpha-factor', {
      name: 'alpha-factor',
      description: '开发和评估量化因子',
      instructions: '使用 ACE Expression 或 Python 生成 Alpha',
      memoryEnabled: true,
      execute: async (params: any) => {
        const expression = params.expression || 'rank(ts_delta(close,20))';
        const assets = params.assets || ['AAPL', 'GOOG', 'MSFT'];
        return {
          alpha: expression,
          assets,
          sharpe: 1.8 + Math.random() * 0.5,
          turnover: 0.3 + Math.random() * 0.2,
          status: 'simulated'
        };
      }
    });
  }

  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAvailableSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 构建技能语义索引：为每个技能计算嵌入向量。
   * 无客户端或任意技能嵌入失败时优雅跳过（不改写已有向量）。
   * 幂等：可重复调用（如运行时新增技能后重建）。
   */
  async buildIndex(): Promise<void> {
    if (!this.embeddingClient) return;
    for (const skill of this.skills.values()) {
      // 已索引则跳过，避免重复计算
      if (skill.embedding) continue;
      const text = `${skill.name} ${skill.description} ${skill.instructions}`;
      try {
        const vec = await this.embeddingClient.embed(text);
        if (vec) skill.embedding = vec;
      } catch {
        // 单条失败不影响其余
      }
    }
    this.indexed = true;
  }

  /**
   * 语义检索最相关技能（替代脆弱的 goal.includes 关键词匹配）。
   * 有嵌入向量时按余弦相似度排序；否则回退关键词子串匹配。
   *
   * @param goal   任务目标
   * @param topK   返回数量上限
   * @param threshold 最小相似度阈值（余弦，-1~1）；低于此值不返回
   */
  async matchSkills(goal: string, topK = 3, threshold = 0.25): Promise<SkillMatch[]> {
    if (!goal) return [];

    // 优先：嵌入语义检索
    if (this.embeddingClient) {
      let goalVec: number[] | null = null;
      try {
        goalVec = await this.embeddingClient.embed(goal);
      } catch {
        goalVec = null;
      }
      if (goalVec) {
        const scored: SkillMatch[] = [];
        for (const skill of this.skills.values()) {
          if (!skill.embedding) continue;
          const score = cosineSimilarity(goalVec, skill.embedding);
          if (score >= threshold) {
            scored.push({ skill, score, source: 'embedding' });
          }
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
      }
    }

    // 回退：关键词子串匹配（无嵌入或嵌入失败）
    const g = goal.toLowerCase();
    const scored: SkillMatch[] = [];
    for (const skill of this.skills.values()) {
      if (g.includes(skill.name.toLowerCase()) || g.includes(skill.description.toLowerCase())) {
        scored.push({ skill, score: 1, source: 'keyword' });
      }
    }
    return scored.slice(0, topK);
  }

  /**
   * 注册自定义技能
   */
  registerSkill(skill: Skill): void {
    this.skills.set(skill.name, skill);
    console.log(`📦 注册技能: ${skill.name}`);
  }

  /**
   * 从 GitHub 导入技能
   */
  async importFromGitHub(repoUrl: string): Promise<void> {
    // 实际实现：fetch SKILL.md 并解析
    console.log(`📦 从GitHub导入技能: ${repoUrl}`);
    // 占位实现
  }

  /**
   * 从本地文件夹导入技能
   */
  async importFromLocal(path: string): Promise<void> {
    console.log(`📁 从本地导入技能: ${path}`);
    // 占位实现
  }
}
