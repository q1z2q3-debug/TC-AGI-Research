/**
 * 三元知识图谱 (Ternary Knowledge Graph)
 * 将认知状态、记忆、原型组织为图结构，支持推理和语义检索
 * 对应 DaoNovice 架构的"数字生命知识图谱"
 */

import { TritVector, TritVectorOps } from './trit-vector';

export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'memory' | 'prototype' | 'skill' | 'relation';
  label: string;
  tritVector: TritVector;
  weight: number;        // e权重——时间衰减
  depth: number;         // π深度——精度
  createdAt: number;
  lastAccessed: number;
  metadata: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  source: string;        // 源节点ID
  target: string;        // 目标节点ID
  relation: 'causes' | 'contains' | 'relates_to' | 'evolves_from' | 'contradicts' | 'reinforces';
  strength: number;      // 0~1
  createdAt: number;
}

export interface GraphQuery {
  vector?: TritVector;          // 按认知向量搜索
  nodeType?: KnowledgeNode['type'];
  relation?: KnowledgeEdge['relation'];
  maxDepth?: number;            // 遍历深度
  minWeight?: number;           // 最小权重过滤
  limit?: number;
}

export interface GraphPath {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  totalWeight: number;
  pathLength: number;
}

/**
 * 三元知识图谱
 * 组织认知空间中的所有实体为图结构，支持推理和路径搜索
 */
export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  /**
   * 添加节点
   */
  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }
  }

  /**
   * 添加边
   */
  addEdge(edge: KnowledgeEdge): void {
    this.edges.set(edge.id, edge);
    
    // 更新邻接表
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, new Set());
    }
    if (!this.adjacencyList.has(edge.target)) {
      this.adjacencyList.set(edge.target, new Set());
    }
    this.adjacencyList.get(edge.source)!.add(edge.target);
    this.adjacencyList.get(edge.target)!.add(edge.source);
  }

  /**
   * 从认知向量查询最相关节点
   */
  queryByVector(vector: TritVector, limit: number = 10): KnowledgeNode[] {
    const scored: Array<{ node: KnowledgeNode; score: number }> = [];
    
    for (const node of this.nodes.values()) {
      const distance = TritVectorOps.manhattanDistance(node.tritVector, vector);
      const recency = Math.exp(-0.1 * (Date.now() - node.lastAccessed) / (24 * 3600 * 1000));
      const score = (1 / (1 + distance)) * 0.7 + node.weight * recency * 0.3;
      scored.push({ node, score });
    }
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.node);
  }

  /**
   * 图谱推理——查找两个节点之间的认知路径
   */
  findPaths(sourceId: string, targetId: string, maxDepth: number = 5): GraphPath[] {
    const paths: GraphPath[] = [];
    const visited = new Set<string>();
    
    const dfs = (
      currentId: string, 
      depth: number, 
      nodePath: KnowledgeNode[], 
      edgePath: KnowledgeEdge[]
    ) => {
      if (depth > maxDepth) return;
      if (currentId === targetId) {
        paths.push({
          nodes: [...nodePath],
          edges: [...edgePath],
          totalWeight: nodePath.reduce((sum, n) => sum + n.weight, 0),
          pathLength: depth
        });
        return;
      }
      
      visited.add(currentId);
      const neighbors = this.adjacencyList.get(currentId) || new Set();
      
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        
        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;
        
        // 找到连接边
        const connectingEdges = Array.from(this.edges.values()).filter(
          e => (e.source === currentId && e.target === neighborId) ||
               (e.source === neighborId && e.target === currentId)
        );
        
        dfs(neighborId, depth + 1, [...nodePath, neighborNode], [...edgePath, ...connectingEdges]);
      }
      visited.delete(currentId);
    };
    
    const sourceNode = this.nodes.get(sourceId);
    if (sourceNode) {
      dfs(sourceId, 0, [sourceNode], []);
    }
    
    // 按路径总权重排序
    paths.sort((a, b) => b.totalWeight - a.totalWeight);
    return paths;
  }

  /**
   * 语义关系发现——自动发现节点间的新关系
   */
  discoverRelations(threshold: number = 0.7): KnowledgeEdge[] {
    const newEdges: KnowledgeEdge[] = [];
    const nodeList = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const a = nodeList[i];
        const b = nodeList[j];
        
        // 计算认知距离
        const distance = TritVectorOps.manhattanDistance(a.tritVector, b.tritVector);
        const similarity = 1 / (1 + distance);
        
        if (similarity > threshold) {
          // 检查是否已存在边
          const existingEdge = Array.from(this.edges.values()).find(
            e => (e.source === a.id && e.target === b.id) ||
                 (e.source === b.id && e.target === a.id)
          );
          
          if (!existingEdge) {
            const newEdge: KnowledgeEdge = {
              id: `discovered-${a.id}-${b.id}`,
              source: a.id,
              target: b.id,
              relation: 'relates_to',
              strength: similarity,
              createdAt: Date.now()
            };
            newEdges.push(newEdge);
            this.addEdge(newEdge);
          }
        }
      }
    }
    
    console.log(`🔗 发现 ${newEdges.length} 条新语义关系`);
    return newEdges;
  }

  /**
   * 图谱演化——时间衰减和权重更新
   */
  evolve(): void {
    const now = Date.now();
    const halfLife = 7 * 24 * 3600 * 1000; // 7天半衰期
    
    for (const node of this.nodes.values()) {
      const age = now - node.lastAccessed;
      node.weight = node.weight * Math.exp(-Math.LN2 * age / halfLife);
    }
    
    // 清理权重过低的节点
    for (const [id, node] of this.nodes) {
      if (node.weight < 0.01) {
        this.removeNode(id);
      }
    }
  }

  /**
   * 获取节点的认知上下文——该节点及其邻居
   */
  getContext(nodeId: string, radius: number = 2): KnowledgeNode[] {
    const context: KnowledgeNode[] = [];
    const visited = new Set<string>();
    
    const bfs = (startId: string, depth: number) => {
      if (depth > radius || visited.has(startId)) return;
      visited.add(startId);
      
      const node = this.nodes.get(startId);
      if (node) context.push(node);
      
      const neighbors = this.adjacencyList.get(startId) || new Set();
      for (const neighborId of neighbors) {
        bfs(neighborId, depth + 1);
      }
    };
    
    bfs(nodeId, 0);
    return context;
  }

  /**
   * 导出图谱为JSON
   */
  export(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  /**
   * 从JSON导入图谱
   */
  import(data: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    
    for (const node of data.nodes) {
      this.addNode(node);
    }
    for (const edge of data.edges) {
      this.addEdge(edge);
    }
  }

  private removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.adjacencyList.delete(nodeId);
    
    // 移除相关边
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edgeId);
      }
    }
    
    // 从邻接表中移除引用
    for (const [, neighbors] of this.adjacencyList) {
      neighbors.delete(nodeId);
    }
  }

  get stats(): { nodeCount: number; edgeCount: number; density: number } {
    const n = this.nodes.size;
    const e = this.edges.size;
    const maxEdges = n * (n - 1) / 2;
    return {
      nodeCount: n,
      edgeCount: e,
      density: maxEdges > 0 ? e / maxEdges : 0
    };
  }
}
