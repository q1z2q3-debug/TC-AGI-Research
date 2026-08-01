/**
 * MCP 工具适配器 (MCP Adapter)
 * 管理远程或本机 MCP 服务的连接与调用
 * 支持自动执行、超时、重试、降级
 */

export interface MCPTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (params: any) => Promise<any>;
  timeout?: number;
  retryCount?: number;
}

export interface MCPServer {
  name: string;
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
}

export class MCPAdapter {
  private tools: Map<string, MCPTool> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 加载内置工具
    this.registerBuiltinTools();

    // 加载配置的服务器（示例）
    // await this.loadServers();

    this.initialized = true;
    console.log(`🔌 MCP适配器初始化: ${this.tools.size} 个工具`);
  }

  private registerBuiltinTools(): void {
    // 文件操作工具
    this.tools.set('local_file', {
      name: 'local_file',
      description: '本地文件读写操作',
      parameters: { operation: 'read|write|list', path: 'string', content: 'optional string' },
      execute: async (params: { operation: string; path: string; content?: string }) => {
        // 实际实现会调用 local_file_read/write
        return { status: 'executed', operation: params.operation, path: params.path };
      },
      timeout: 10000,
      retryCount: 2
    });

    // Shell 执行工具
    this.tools.set('shell', {
      name: 'shell',
      description: '执行 Shell 命令',
      parameters: { command: 'string', cwd: 'optional string' },
      execute: async (params: { command: string; cwd?: string }) => {
        return { status: 'executed', command: params.command, cwd: params.cwd || '.' };
      },
      timeout: 30000,
      retryCount: 2
    });

    // Web 抓取工具
    this.tools.set('web_fetch', {
      name: 'web_fetch',
      description: '抓取网页内容',
      parameters: { url: 'string' },
      execute: async (params: { url: string }) => {
        return { status: 'fetched', url: params.url, content: '模拟网页内容...' };
      },
      timeout: 15000,
      retryCount: 3
    });

    // 记忆操作工具
    this.tools.set('memory', {
      name: 'memory',
      description: '记忆系统操作',
      parameters: { operation: 'save|retrieve|delete', query: 'string' },
      execute: async (params: { operation: string; query: string }) => {
        return { status: 'executed', operation: params.operation, query: params.query };
      },
      timeout: 5000,
      retryCount: 1
    });
  }

  /**
   * 获取工具
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有可用工具名
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 注册工具
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    console.log(`🔧 工具已注册: ${tool.name}`);
  }

  /**
   * 移除工具
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * 添加 MCP 服务器
   */
  addServer(server: MCPServer): void {
    this.servers.set(server.name, server);
    console.log(`🌐 MCP 服务器已添加: ${server.name}`);
  }

  /**
   * 移除 MCP 服务器
   */
  removeServer(name: string): boolean {
    return this.servers.delete(name);
  }

  /**
   * 获取所有服务器
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    console.log('🔌 MCP适配器关闭');
    this.tools.clear();
    this.servers.clear();
    this.initialized = false;
  }

  /**
   * 执行工具（带超时和重试）
   */
  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`工具 ${name} 不存在`);
    }

    const maxRetries = tool.retryCount || 1;
    const timeout = tool.timeout || 10000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 带超时的执行
        const result = await this.executeWithTimeout(tool.execute, params, timeout);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          console.log(`🔄 工具 ${name} 执行失败，重试 ${attempt + 1}/${maxRetries}...`);
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw new Error(`工具 ${name} 执行失败: ${lastError?.message || '未知错误'}`);
  }

  private async executeWithTimeout(
    fn: (params: any) => Promise<any>,
    params: any,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`执行超时 (${timeout}ms)`));
      }, timeout);

      fn(params)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
