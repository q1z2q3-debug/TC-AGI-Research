/**
 * MCP 工具适配器
 * 连接并管理远程或本机 MCP 服务
 */

import { EmbeddingProvider, cosineSimilarity } from '../cognitive/embedding';

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
  /** 语义向量（用于余弦检索） */
  embedding?: number[];
}

/** 工具匹配结果 */
export interface ToolMatch {
  tool: MCPTool;
  score: number;
  source: 'embedding' | 'keyword';
}

export interface MCPServer {
  name: string;
  url: string;
  tools: MCPTool[];
  status: 'connected' | 'disconnected' | 'error';
  lastError?: string;
}

export class MCPAdapter {
  private tools: Map<string, MCPTool> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private initialized = false;
  private embeddingClient: EmbeddingProvider | null = null;

  /** 接入嵌入客户端，用于工具语义检索 */
  setEmbeddingClient(client: EmbeddingProvider): void {
    this.embeddingClient = client;
  }

  get hasEmbedding(): boolean {
    return this.embeddingClient !== null;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // 加载默认工具
    this.registerDefaultTools();
    this.initialized = true;
    console.log(`🔌 MCP适配器初始化: ${this.tools.size} 个工具`);
  }

  private registerDefaultTools(): void {
    // 文件操作工具
    this.tools.set('file-read', {
      name: 'file-read',
      description: '读取本地文件',
      parameters: { path: 'string' },
      execute: async (params: any) => {
        // 实际实现需要文件系统 API
        return { content: `读取文件: ${params.path}`, status: 'simulated' };
      }
    });

    this.tools.set('file-write', {
      name: 'file-write',
      description: '写入本地文件',
      parameters: { path: 'string', content: 'string' },
      execute: async (params: any) => {
        return { path: params.path, status: 'simulated' };
      }
    });

    // Shell 执行工具
    this.tools.set('shell-exec', {
      name: 'shell-exec',
      description: '执行 Shell 命令',
      parameters: { command: 'string' },
      execute: async (params: any) => {
        return { command: params.command, stdout: 'simulated output', stderr: '' };
      }
    });

    // HTTP 请求工具
    this.tools.set('http-request', {
      name: 'http-request',
      description: '发送 HTTP 请求',
      parameters: { url: 'string', method: 'string' },
      execute: async (params: any) => {
        try {
          const response = await fetch(params.url, { method: params.method || 'GET' });
          const data = await response.text();
          return { url: params.url, status: response.status, data: data.slice(0, 500) };
        } catch (e) {
          return { error: String(e), url: params.url };
        }
      }
    });

    // 数据处理工具
    this.tools.set('data-transform', {
      name: 'data-transform',
      description: '数据转换和处理',
      parameters: { data: 'any', operation: 'string' },
      execute: async (params: any) => {
        return { result: params.data, operation: params.operation, status: 'simulated' };
      }
    });
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 构建工具语义索引（同 SkillLoader.buildIndex 语义）。
   */
  async buildIndex(): Promise<void> {
    if (!this.embeddingClient) return;
    for (const tool of this.tools.values()) {
      if (tool.embedding) continue;
      const text = `${tool.name} ${tool.description}`;
      try {
        const vec = await this.embeddingClient.embed(text);
        if (vec) tool.embedding = vec;
      } catch {
        // 单条失败忽略
      }
    }
  }

  /**
   * 语义检索最相关工具（替代 goal.includes 关键词匹配）。
   * 有向量时按余弦相似度；否则回退关键词子串匹配。
   */
  async matchTools(goal: string, topK = 3, threshold = 0.25): Promise<ToolMatch[]> {
    if (!goal) return [];

    if (this.embeddingClient) {
      let goalVec: number[] | null = null;
      try {
        goalVec = await this.embeddingClient.embed(goal);
      } catch {
        goalVec = null;
      }
      if (goalVec) {
        const scored: ToolMatch[] = [];
        for (const tool of this.tools.values()) {
          if (!tool.embedding) continue;
          const score = cosineSimilarity(goalVec, tool.embedding);
          if (score >= threshold) {
            scored.push({ tool, score, source: 'embedding' });
          }
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
      }
    }

    const g = goal.toLowerCase();
    const scored: ToolMatch[] = [];
    for (const tool of this.tools.values()) {
      if (g.includes(tool.name.toLowerCase()) || g.includes(tool.description.toLowerCase())) {
        scored.push({ tool, score: 1, source: 'keyword' });
      }
    }
    return scored.slice(0, topK);
  }

  /**
   * 注册 MCP 服务器
   */
  registerServer(server: MCPServer): void {
    this.servers.set(server.name, server);
    for (const tool of server.tools) {
      this.tools.set(tool.name, tool);
    }
    console.log(`🔌 注册MCP服务器: ${server.name} (${server.tools.length} 个工具)`);
  }

  /**
   * 连接远程 MCP 服务器
   */
  async connectServer(name: string, url: string): Promise<void> {
    try {
      const response = await fetch(`${url}/tools`);
      const data = await response.json() as any;
      const server: MCPServer = {
        name,
        url,
        tools: data.tools || [],
        status: 'connected'
      };
      this.registerServer(server);
    } catch (e) {
      const server = this.servers.get(name);
      if (server) {
        server.status = 'error';
        server.lastError = String(e);
      }
      console.log(`❌ 连接MCP服务器失败: ${name} - ${e}`);
    }
  }

  /**
   * 执行工具（带重试）
   */
  async executeTool(name: string, params: any, retries: number = 2): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`工具 ${name} 未注册`);
    }

    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await tool.execute(params);
      } catch (e) {
        lastError = e;
        if (i < retries) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw new Error(`执行工具 ${name} 失败: ${lastError}`);
  }

  async shutdown(): Promise<void> {
    // 清理连接
    this.servers.clear();
    console.log('🔌 MCP适配器关闭');
  }
}
