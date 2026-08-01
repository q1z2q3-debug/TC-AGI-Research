/**
 * 全局类型定义
 */

export type MemoryType = 'user' | 'feedback' | 'topic' | 'reference';

export interface AGIConfig {
  name: string;
  version: string;
  ideology: {
    beliefs: string[];
    values: Record<string, number>;
  };
  memory: {
    path: string;
    halfLifeDays: number;
  };
  skills: {
    sources: string[];
    builtin: string[];
  };
  tools: {
    mcpServers: string[];
  };
  scheduler: {
    tasks: any[];
  };
}
