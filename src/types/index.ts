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

export interface AgentContext {
  sessionId: string;
  userId?: string;
  timestamp: number;
  task?: string;
  parameters?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
