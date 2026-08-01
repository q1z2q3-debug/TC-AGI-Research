/**
 * 记忆系统类型定义
 * 三元索引：卦象索引(0~19682) + π展开深度(1~10) + e呼吸相位权重(0~1)
 */

export type MemoryType = 'user' | 'feedback' | 'topic' | 'reference';

export interface Memory {
  id: string;
  type: MemoryType;
  name: string;
  content: string;
  tags: string[];
  // 三元索引
  hexagramIndex: number;   // 0~19682 卦象索引
  piDepth: number;         // 1~10 π展开深度
  eWeight: number;         // 0~1 e呼吸相位权重
  // 元数据
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  // 来源追踪
  source?: string;
  sourceUrl?: string;
}

export interface MemoryQuery {
  query?: string;
  type?: MemoryType;
  tags?: string[];
  hexagramIndex?: number;
  piDepth?: number;
  minEWeight?: number;
  maxEWeight?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'accessCount' | 'eWeight' | 'hexagramIndex';
  sortOrder?: 'asc' | 'desc';
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  avgPiDepth: number;
  avgEWeight: number;
  mostActiveTags: Array<{ tag: string; count: number }>;
  oldestTimestamp: number;
  newestTimestamp: number;
}

export const MEMORY_TYPES: MemoryType[] = ['user', 'feedback', 'topic', 'reference'];

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  user: '用户画像',
  feedback: '行为反馈',
  topic: '话题上下文',
  reference: '参考资料'
};
