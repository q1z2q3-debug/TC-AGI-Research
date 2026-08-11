/**
 * 万物皆备于我——资源管理器 (Resource Manager)
 * 文件/技能/工具/记忆的统一索引与管理
 * 对应 DaoNovice 的"万物皆备于我"资源哲学
 */

import { TritVector, TritVectorOps } from './trit-vector';

export enum ResourceType {
  FILE = 'file',
  SKILL = 'skill',
  TOOL = 'tool',
  MEMORY = 'memory',
  KNOWLEDGE = 'knowledge',
  SCRIPT = 'script',
  CONFIG = 'config'
}

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  path: string;         // 逻辑路径
  localPath?: string;   // 物理路径
  tags: string[];
  tritVector?: TritVector;
  version: string;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  size: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface ResourceSpace {
  name: string;
  path: string;
  description: string;
  resources: string[];
  createdAt: number;
}

/**
 * 统一资源管理器
 * 提供文件、技能、工具、记忆的统一索引和检索
 */
export class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private spaces: Map<string, ResourceSpace> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<ResourceType, Set<string>> = new Map();

  /**
   * 注册资源
   */
  register(resource: Resource): void {
    this.resources.set(resource.id, resource);
    
    // 更新标签索引
    for (const tag of resource.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(resource.id);
    }
    
    // 更新类型索引
    if (!this.typeIndex.has(resource.type)) {
      this.typeIndex.set(resource.type, new Set());
    }
    this.typeIndex.get(resource.type)!.add(resource.id);
  }

  /**
   * 按认知向量搜索资源
   */
  searchByVector(vector: TritVector, limit: number = 10): Resource[] {
    const scored: Array<{ resource: Resource; score: number }> = [];
    
    for (const resource of this.resources.values()) {
      if (!resource.tritVector) {
        // 无向量的资源降级到标签匹配
        scored.push({ resource, score: 0.1 });
        continue;
      }
      
      const distance = TritVectorOps.manhattanDistance(resource.tritVector, vector);
      const recency = Math.exp(-0.05 * (Date.now() - resource.updatedAt) / (24 * 3600 * 1000));
      const popularity = Math.log(1 + resource.accessCount);
      const score = (1 / (1 + distance)) * 0.5 + recency * 0.3 + popularity * 0.2;
      scored.push({ resource, score });
    }
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.resource);
  }

  /**
   * 按标签搜索
   */
  searchByTags(tags: string[]): Resource[] {
    const resultIds = new Set<string>();
    
    for (const tag of tags) {
      const ids = this.tagIndex.get(tag);
      if (ids) {
        for (const id of ids) {
          resultIds.add(id);
        }
      }
    }
    
    return Array.from(resultIds)
      .map(id => this.resources.get(id)!)
      .filter(Boolean);
  }

  /**
   * 创建资源空间
   */
  createSpace(name: string, path: string, description: string): ResourceSpace {
    const space: ResourceSpace = {
      name,
      path,
      description,
      resources: [],
      createdAt: Date.now()
    };
    this.spaces.set(path, space);
    return space;
  }

  /**
   * 将资源分配到空间
   */
  assignToSpace(resourceId: string, spacePath: string): void {
    const space = this.spaces.get(spacePath);
    if (space && this.resources.has(resourceId)) {
      space.resources.push(resourceId);
    }
  }

  /**
   * 智能空间组织——自动将资源分配到推荐空间
   */
  autoOrganize(): Record<string, string[]> {
    const assignments: Record<string, string[]> = {};
    
    // 按类型自动分配
    const typeSpaceMap: Record<ResourceType, string> = {
      [ResourceType.FILE]: '/files',
      [ResourceType.SKILL]: '/skills',
      [ResourceType.TOOL]: '/tools',
      [ResourceType.MEMORY]: '/memory',
      [ResourceType.KNOWLEDGE]: '/knowledge',
      [ResourceType.SCRIPT]: '/scripts',
      [ResourceType.CONFIG]: '/config'
    };
    
    for (const [id, resource] of this.resources) {
      const spacePath = typeSpaceMap[resource.type];
      
      if (!this.spaces.has(spacePath)) {
        this.createSpace(resource.type, spacePath, `${resource.type} 资源空间`);
      }
      
      if (!assignments[spacePath]) {
        assignments[spacePath] = [];
      }
      assignments[spacePath].push(id);
      this.assignToSpace(id, spacePath);
    }
    
    return assignments;
  }

  /**
   * 检测资源冗余——移除重复或无用资源
   */
  detectRedundancy(threshold: number = 0.9): Array<{ a: Resource; b: Resource; similarity: number }> {
    const redundancies: Array<{ a: Resource; b: Resource; similarity: number }> = [];
    const resourceList = Array.from(this.resources.values());
    
    for (let i = 0; i < resourceList.length; i++) {
      for (let j = i + 1; j < resourceList.length; j++) {
        const a = resourceList[i];
        const b = resourceList[j];
        
        if (!a.tritVector || !b.tritVector) continue;
        
        const distance = TritVectorOps.manhattanDistance(a.tritVector, b.tritVector);
        const similarity = 1 / (1 + distance);
        
        if (similarity > threshold) {
          redundancies.push({ a, b, similarity });
        }
      }
    }
    
    return redundancies;
  }

  /**
   * 获取资源空间概览
   */
  getOverview(): { spaces: ResourceSpace[]; totalResources: number; totalSize: number } {
    let totalSize = 0;
    for (const resource of this.resources.values()) {
      totalSize += resource.size;
    }
    
    return {
      spaces: Array.from(this.spaces.values()),
      totalResources: this.resources.size,
      totalSize
    };
  }

  /**
   * 空索引——"万物皆备于我"的核心
   * 当资源不存在时，标记为待创建，触发空引擎
   */
  getMissingResources(): Resource[] {
    const missing: Resource[] = [];
    
    // 检查常见必要资源
    const requiredPaths = [
      '/config/settings',
      '/skills/default',
      '/tools/shell',
      '/memory/index'
    ];
    
    for (const path of requiredPaths) {
      const exists = Array.from(this.resources.values()).some(r => r.path === path);
      if (!exists) {
        missing.push({
          id: `missing-${path.replace(/\//g, '-')}`,
          type: ResourceType.CONFIG,
          name: path,
          path,
          tags: ['missing', 'required'],
          version: '0.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          accessCount: 0,
          size: 0,
          dependencies: [],
          metadata: { status: 'missing' }
        });
      }
    }
    
    return missing;
  }

  /**
   * 资源使用统计
   */
  getUsageStats(): { byType: Record<string, number>; topAccessed: Resource[]; recentlyUpdated: Resource[] } {
    const byType: Record<string, number> = {};
    
    for (const resource of this.resources.values()) {
      byType[resource.type] = (byType[resource.type] || 0) + 1;
    }
    
    const sorted = Array.from(this.resources.values());
    
    return {
      byType,
      topAccessed: [...sorted].sort((a, b) => b.accessCount - a.accessCount).slice(0, 10),
      recentlyUpdated: [...sorted].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10)
    };
  }

  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  getSpace(path: string): ResourceSpace | undefined {
    return this.spaces.get(path);
  }
}
