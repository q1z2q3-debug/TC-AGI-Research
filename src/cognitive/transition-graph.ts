/**
 * 认知转移图 (Cognitive Transition Graph)
 * ─────────────────────────────────────────────────────────────
 * P1 升级：让 19683 态空间从"计数空间"变成学出来的"认知地图"。
 *
 * 现状瓶颈：
 *   - 19683 个状态的邻接关系只是隐式 Hamming 邻接（假设的拓扑）
 *   - 五大原型是手编的，未从真实轨迹验证
 *   - 实现间隙断言 |S*| ≪ 3⁹，但 S* 从未被真正构建
 *
 * 本模块从真实认知轨迹学习稀疏有向转移图 G = (S*, E, W)：
 *   1. recordTransition：积累 P(s'|s) 经验转移计数
 *   2. pagerank：在转移图上求平稳分布 → 数据驱动的真实吸引子
 *      （验证或证伪手编的五行原型假设）
 *   3. detectCommunities：加权标签传播 → 认知相区（phase regions）
 *   4. getSubmanifold：落地 S* 稀疏子流形（大小/稀疏比/覆盖率）
 *   5. compareWithPrototypes：手编原型 vs 学习吸引子的可证伪对比
 *
 * 所有计算基于稀疏 Map，复杂度 O(|E|)，与 19683 全空间无关。
 */

import { TritVector, TritVectorOps } from './trit-vector';
import { CognitiveDistance } from './distance';
import { PROTOTYPES } from './prototypes';

/** 态空间总大小 3⁹ */
export const FULL_SPACE_SIZE = 19683;

/** 学习到的吸引子信息 */
export interface AttractorInfo {
  hexagramIndex: number;
  vector: TritVector;
  /** PageRank 平稳概率 */
  pagerank: number;
  /** 作为转移目标的访问次数 */
  visits: number;
  /** 驻留强度：自环计数 / 出边总计数（0~1，越高越"粘"） */
  dwellRatio: number;
  /** 最近的手编原型及其复合距离 */
  nearestPrototype: { name: string; distance: number };
  /** 是否为新颖吸引子（距所有手编原型 > noveltyThreshold） */
  isNovel: boolean;
}

/** 认知相区（转移图社区） */
export interface Community {
  id: number;
  /** 成员卦象索引 */
  members: number[];
  size: number;
  /** 相区内 PageRank 最高的代表态 */
  topNode: number;
  /** 相区总 PageRank 质量 */
  pagerankMass: number;
}

/** 手编原型 vs 学习吸引子的对比报告 */
export interface PrototypeComparison {
  /** 每个手编原型到最近已访问态的距离（覆盖率指标） */
  prototypeCoverage: { name: string; nearestVisitedDistance: number; visited: boolean }[];
  /** 学习吸引子中无法被手编原型解释的新颖吸引子 */
  novelAttractors: AttractorInfo[];
  /** 结论：手编原型是否被轨迹数据支持 */
  supported: boolean;
  summary: string;
}

export class TransitionGraph {
  /** 有向加权边：from → (to → count) */
  private edges: Map<number, Map<number, number>> = new Map();
  /** 出边总权重 */
  private outWeight: Map<number, number> = new Map();
  /** 状态访问计数（作为转移目标或轨迹元素） */
  private visitCounts: Map<number, number> = new Map();
  private totalTransitions = 0;

  /** 记录一次状态转移 */
  recordTransition(from: TritVector | number, to: TritVector | number, weight: number = 1): void {
    const fromIdx = typeof from === 'number' ? from : TritVectorOps.toHexagramIndex(from);
    const toIdx = typeof to === 'number' ? to : TritVectorOps.toHexagramIndex(to);

    if (!this.edges.has(fromIdx)) this.edges.set(fromIdx, new Map());
    const row = this.edges.get(fromIdx)!;
    row.set(toIdx, (row.get(toIdx) || 0) + weight);
    this.outWeight.set(fromIdx, (this.outWeight.get(fromIdx) || 0) + weight);
    this.visitCounts.set(fromIdx, (this.visitCounts.get(fromIdx) || 0) + weight);
    this.visitCounts.set(toIdx, (this.visitCounts.get(toIdx) || 0) + weight);
    this.totalTransitions += weight;
  }

  /** 记录整条轨迹（连续转移 + 自环驻留） */
  recordTrajectory(vectors: (TritVector | number)[]): void {
    const toIndex = (v: TritVector | number): number =>
      typeof v === 'number' ? v : TritVectorOps.toHexagramIndex(v);
    for (let i = 0; i < vectors.length; i++) {
      const idx = toIndex(vectors[i]);
      this.visitCounts.set(idx, (this.visitCounts.get(idx) || 0) + 1);
      if (i > 0) {
        this.recordTransition(toIndex(vectors[i - 1]), idx);
      }
    }
  }

  /** 已访问状态数 |S*| */
  get nodeCount(): number {
    return this.visitCounts.size;
  }

  get edgeCount(): number {
    let n = 0;
    for (const row of this.edges.values()) n += row.size;
    return n;
  }

  get transitions(): number {
    return this.totalTransitions;
  }

  /** 稀疏子流形 S* 落地 */
  getSubmanifold(): { size: number; total: number; sparsityRatio: number; coveragePercent: number } {
    const size = this.nodeCount;
    return {
      size,
      total: FULL_SPACE_SIZE,
      sparsityRatio: size / FULL_SPACE_SIZE,
      coveragePercent: (size / FULL_SPACE_SIZE) * 100
    };
  }

  /** 状态的出转移分布 P(·|s) */
  getTransitionDistribution(from: TritVector | number): Map<number, number> {
    const fromIdx = typeof from === 'number' ? from : TritVectorOps.toHexagramIndex(from);
    const row = this.edges.get(fromIdx);
    const out = new Map<number, number>();
    if (!row) return out;
    const total = this.outWeight.get(fromIdx) || 1;
    for (const [to, w] of row) out.set(to, w / total);
    return out;
  }

  /**
   * PageRank 平稳分布（幂迭代）
   * PR'(i) = (1-d)/N + d·( danglingSum/N + Σ_{j→i} w_ji/outW(j) · PR(j) )
   */
  pagerank(damping: number = 0.85, maxIter: number = 100, tol: number = 1e-8): Map<number, number> {
    const nodes = Array.from(this.visitCounts.keys()).sort((a, b) => a - b);
    const N = nodes.length;
    const pr = new Map<number, number>();
    if (N === 0) return pr;

    // 反向邻接：to → [(from, weight)]
    const inEdges: Map<number, [number, number][]> = new Map();
    for (const [from, row] of this.edges) {
      for (const [to, w] of row) {
        if (!inEdges.has(to)) inEdges.set(to, []);
        inEdges.get(to)!.push([from, w]);
      }
    }

    for (const n of nodes) pr.set(n, 1 / N);

    for (let iter = 0; iter < maxIter; iter++) {
      let danglingSum = 0;
      for (const n of nodes) {
        if (!this.outWeight.get(n)) danglingSum += pr.get(n)!;
      }

      const next = new Map<number, number>();
      let diff = 0;
      for (const n of nodes) {
        let rank = (1 - damping) / N + damping * danglingSum / N;
        const ins = inEdges.get(n);
        if (ins) {
          for (const [from, w] of ins) {
            const outW = this.outWeight.get(from) || 1;
            rank += damping * (w / outW) * pr.get(from)!;
          }
        }
        next.set(n, rank);
        diff += Math.abs(rank - pr.get(n)!);
      }
      for (const [k, v] of next) pr.set(k, v);
      if (diff < tol) break;
    }
    return pr;
  }

  /**
   * 发现真实吸引子：PageRank top-K + 驻留强度 + 原型对照
   */
  findAttractors(topK: number = 10, noveltyThreshold: number = 0.25): AttractorInfo[] {
    const pr = this.pagerank();
    const sorted = Array.from(pr.entries()).sort((a, b) => b[1] - a[1]).slice(0, topK);

    return sorted.map(([idx, rank]) => {
      const vector = TritVectorOps.fromHexagramIndex(idx);
      const outW = this.outWeight.get(idx) || 0;
      const selfLoop = this.edges.get(idx)?.get(idx) || 0;

      let nearest = { name: '无', distance: Infinity };
      for (const proto of PROTOTYPES) {
        const d = CognitiveDistance.composite(vector, proto.vector);
        if (d < nearest.distance) nearest = { name: proto.name, distance: d };
      }

      return {
        hexagramIndex: idx,
        vector,
        pagerank: rank,
        visits: this.visitCounts.get(idx) || 0,
        dwellRatio: outW > 0 ? selfLoop / outW : 0,
        nearestPrototype: nearest,
        isNovel: nearest.distance > noveltyThreshold
      };
    });
  }

  /**
   * 认知相区发现：加权标签传播（确定性，按节点索引序）
   * 无向化：边权取 w_ij + w_ji；标签取邻居中权重最大者，平局取最小标签。
   */
  detectCommunities(maxIter: number = 50): Community[] {
    const nodes = Array.from(this.visitCounts.keys()).sort((a, b) => a - b);
    if (nodes.length === 0) return [];

    // 无向加权邻接
    const undirected: Map<number, Map<number, number>> = new Map();
    const addEdge = (a: number, b: number, w: number) => {
      if (!undirected.has(a)) undirected.set(a, new Map());
      const row = undirected.get(a)!;
      row.set(b, (row.get(b) || 0) + w);
    };
    for (const [from, row] of this.edges) {
      for (const [to, w] of row) {
        if (from === to) continue; // 自环不参与社区结构
        addEdge(from, to, w);
        addEdge(to, from, w);
      }
    }

    const labels = new Map<number, number>();
    for (const n of nodes) labels.set(n, n);

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (const n of nodes) {
        const neighbors = undirected.get(n);
        if (!neighbors || neighbors.size === 0) continue;
        // 统计邻居标签的权重
        const labelWeight = new Map<number, number>();
        for (const [nb, w] of neighbors) {
          const lb = labels.get(nb)!;
          labelWeight.set(lb, (labelWeight.get(lb) || 0) + w);
        }
        // 最大权重，平局取最小标签
        let bestLabel = labels.get(n)!;
        let bestWeight = -1;
        for (const [lb, w] of Array.from(labelWeight.entries()).sort((a, b) => a[0] - b[0])) {
          if (w > bestWeight) { bestWeight = w; bestLabel = lb; }
        }
        if (bestLabel !== labels.get(n)) {
          labels.set(n, bestLabel);
          changed = true;
        }
      }
      if (!changed) break;
    }

    // 按标签分组
    const groups = new Map<number, number[]>();
    for (const n of nodes) {
      const lb = labels.get(n)!;
      if (!groups.has(lb)) groups.set(lb, []);
      groups.get(lb)!.push(n);
    }

    const pr = this.pagerank();
    const communities: Community[] = Array.from(groups.values()).map(members => {
      let topNode = members[0];
      let mass = 0;
      for (const m of members) {
        const r = pr.get(m) || 0;
        mass += r;
        if ((pr.get(m) || 0) > (pr.get(topNode) || 0)) topNode = m;
      }
      return { id: 0, members, size: members.length, topNode, pagerankMass: mass };
    });

    // 按 PageRank 质量降序编号
    communities.sort((a, b) => b.pagerankMass - a.pagerankMass);
    communities.forEach((c, i) => { c.id = i; });
    return communities;
  }

  /**
   * 可证伪对比：手编五行原型 vs 轨迹学到的吸引子
   */
  compareWithPrototypes(topK: number = 10): PrototypeComparison {
    const visited = Array.from(this.visitCounts.keys());
    const attractors = this.findAttractors(topK);

    const prototypeCoverage = PROTOTYPES.map(proto => {
      let nearest = Infinity;
      for (const idx of visited) {
        const d = CognitiveDistance.composite(proto.vector, TritVectorOps.fromHexagramIndex(idx));
        if (d < nearest) nearest = d;
      }
      return {
        name: proto.name,
        nearestVisitedDistance: nearest === Infinity ? 1 : nearest,
        visited: nearest < 0.15
      };
    });

    const novelAttractors = attractors.filter(a => a.isNovel);
    const visitedCount = prototypeCoverage.filter(p => p.visited).length;
    const supported = visitedCount >= 3 && novelAttractors.length <= attractors.length / 2;

    const summary = visited.length === 0
      ? '无轨迹数据：无法验证手编原型'
      : `手编原型覆盖 ${visitedCount}/5；学习吸引子中新颖占比 ${novelAttractors.length}/${attractors.length}。` +
        (supported
          ? '五行原型假设获得轨迹数据支持。'
          : '五行原型假设与轨迹数据存在偏差——真实吸引子结构与手编原型不完全一致。');

    return { prototypeCoverage, novelAttractors, supported, summary };
  }

  /** 快照（监控/调试） */
  snapshot() {
    const sub = this.getSubmanifold();
    return {
      nodes: this.nodeCount,
      edges: this.edgeCount,
      transitions: this.totalTransitions,
      submanifold: sub,
      topAttractors: this.findAttractors(5).map(a => ({
        hexagramIndex: a.hexagramIndex,
        pagerank: Number(a.pagerank.toFixed(6)),
        visits: a.visits,
        dwellRatio: Number(a.dwellRatio.toFixed(3)),
        nearestPrototype: a.nearestPrototype.name,
        isNovel: a.isNovel
      }))
    };
  }

  reset(): void {
    this.edges.clear();
    this.outWeight.clear();
    this.visitCounts.clear();
    this.totalTransitions = 0;
  }
}
