/**
 * 全局类型定义
 *
 * 注意：MemoryType 已迁移至 memory/memory-types.ts，此处不再重复定义。
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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
    maxMemories: number;
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
  cognitive: {
    defaultPiDepth: number;
    defaultEWeight: number;
    historyLimit: number;
  };
}

export interface HealthStatus {
  healthy: boolean;
  components: {
    ideology: boolean;
    cognitive: boolean;
    memory: boolean;
    engine: boolean;
    instance: boolean;
    skills: boolean;
    tools: boolean;
    scheduler: boolean;
  };
  message?: string;
  uptime?: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  data?: any;
}
