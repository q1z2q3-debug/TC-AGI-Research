/**
 * 语义锚点投影 (Semantic Anchor Projection)
 * ─────────────────────────────────────────────────────────────
 * P0 语义接地革命：取代纯正则关键词的文本→九维三元向量映射。
 *
 * 问题：contentToTritVector 依赖 18 组正则关键词，复杂/含蓄输入
 * 大量坍缩到卦象 0（全零悬置态），19683 态空间的实际利用率极低。
 * 入口映射质量决定整个认知空间是否被有效使用。
 *
 * 方案：三级回退链
 *   1. embedding 锚点投影（主路径，本地 Ollama，零成本）
 *      每个维度预置正/负锚点短语，启动时嵌入缓存；
 *      输入嵌入后与锚点求余弦相似度，按 相似度阈值 + 胜负边际 判定三态。
 *   2. LLM 抽取（次路径，DeepSeek extractTritVector）
 *      嵌入不可用时启用，语义保真度最高但有 API 成本。
 *   3. 关键词规则（兜底路径，contentToTritVector）
 *      永远可用，保证系统无外部依赖时仍可运行。
 *
 * 判定规则（embedding 路径）：
 *   posSim = max cosine(input, 正锚点)，negSim = max cosine(input, 负锚点)
 *   - 有负锚点：posSim ≥ minSim 且 posSim - negSim ≥ margin → +1
 *               negSim ≥ minSim 且 negSim - posSim ≥ margin → -1
 *               否则 → 0（悬置：证据不足或正负相当，和态涌现）
 *   - 无负锚点（因/缘/果维度）：posSim ≥ minSim → +1，否则 → 0
 */

import { TritVector, Trit, TritDimension, ALL_DIMENSIONS } from './trit-vector';
import { EmbeddingProvider, cosineSimilarity } from './embedding';
import { contentToTritVector, tritJSONToVector, TritVectorJSON } from './semantic';

/** 能从文本抽取三元向量的 LLM 接口（DeepSeekClient 结构满足） */
export interface TritExtractor {
  extractTritVector(input: string): Promise<TritVectorJSON | null>;
}

/** 每个维度的正负锚点短语（中文+英文各一条，嵌入模型对短语对最敏感） */
const DIM_ANCHORS: Record<TritDimension, { pos: string[]; neg: string[] }> = {
  past: {
    pos: ['过去的历史经验与回忆', 'past events, history, memories and experience'],
    neg: ['遗忘与失去的记忆', 'forgetting, losing and missing']
  },
  present: {
    pos: ['此时此刻正在发生的当下', 'the present moment, happening right now'],
    neg: ['混乱迷茫与失控的局面', 'chaos, confusion and being lost']
  },
  future: {
    pos: ['未来的计划目标与愿景', 'future plans, goals and vision'],
    neg: ['对未来的焦虑恐惧与担忧', 'anxiety, fear and worry about the future']
  },
  internal: {
    pos: ['内心自我信念与价值观', 'inner self, beliefs and values'],
    neg: ['内耗矛盾与自我冲突', 'internal conflict, self-contradiction and struggle']
  },
  medial: {
    pos: ['连接沟通协调的桥梁', 'connection, communication, coordination and bridges'],
    neg: ['阻塞断裂与隔阂', 'blockage, disconnection and barriers']
  },
  external: {
    pos: ['外部世界环境与他人', 'the external world, environment and other people'],
    neg: ['外部威胁危机与风险', 'external threats, crisis and risks']
  },
  cause: {
    pos: ['原因动机与目的', 'causes, motives and purposes'],
    neg: []
  },
  condition: {
    pos: ['条件资源机会与工具', 'conditions, resources, opportunities and tools'],
    neg: []
  },
  effect: {
    pos: ['结果成果与完成实现', 'results, outcomes and achievements'],
    neg: []
  }
};

export type ProjectionSource = 'embedding' | 'llm' | 'rules';

export interface DimScore {
  pos: number;
  neg: number;
  trit: Trit;
}

export interface ProjectionResult {
  vector: TritVector;
  source: ProjectionSource;
  /** 决策置信度：已判定维度上 |pos-neg| 边际的均值（rules 路径为 0.3 占位） */
  confidence: number;
  /** 各维度相似度明细（仅 embedding 路径有值） */
  scores: Record<TritDimension, DimScore> | null;
}

export interface AnchorProjectorOptions {
  embedding?: EmbeddingProvider | null;
  llm?: TritExtractor | null;
  /** 相似度激活阈值：低于此值视为该极不相关，默认 0.5 */
  minSim?: number;
  /** 正负边际阈值：|pos-neg| 小于此值判和态，默认 0.05 */
  margin?: number;
}

export class AnchorProjector {
  private embedding: EmbeddingProvider | null;
  private llm: TritExtractor | null;
  private readonly minSim: number;
  private readonly margin: number;

  /** 锚点嵌入缓存：dim → { pos: number[][], neg: number[][] } */
  private anchorVectors: Map<TritDimension, { pos: number[][]; neg: number[][] }> | null = null;
  private initAttempted = false;
  private lastResult: ProjectionResult | null = null;

  constructor(opts: AnchorProjectorOptions = {}) {
    this.embedding = opts.embedding ?? null;
    this.llm = opts.llm ?? null;
    this.minSim = opts.minSim ?? 0.5;
    this.margin = opts.margin ?? 0.05;
  }

  setLLM(llm: TritExtractor | null): void {
    this.llm = llm;
  }

  setEmbedding(embedding: EmbeddingProvider | null): void {
    this.embedding = embedding;
    // 嵌入提供者更换后需重建锚点缓存
    this.anchorVectors = null;
    this.initAttempted = false;
  }

  /** 最近一次投影结果（用于观测走了哪条路径） */
  getLastResult(): ProjectionResult | null {
    return this.lastResult;
  }

  /**
   * 初始化：嵌入全部锚点短语并缓存。
   * 嵌入不可用时不抛错——标记后回退到 LLM/规则路径。
   * @returns true 表示 embedding 锚点路径可用
   */
  async initialize(): Promise<boolean> {
    this.initAttempted = true;
    if (!this.embedding) return false;

    const vectors = new Map<TritDimension, { pos: number[][]; neg: number[][] }>();
    for (const dim of ALL_DIMENSIONS) {
      const anchors = DIM_ANCHORS[dim];
      const pos: number[][] = [];
      const neg: number[][] = [];
      let failed = false;

      for (const phrase of anchors.pos) {
        const v = await this.embedding.embed(phrase);
        if (!v) { failed = true; break; }
        pos.push(v);
      }
      if (!failed) {
        for (const phrase of anchors.neg) {
          const v = await this.embed(phrase);
          if (!v) { failed = true; break; }
          neg.push(v);
        }
      }
      if (failed) {
        this.anchorVectors = null;
        return false;
      }
      vectors.set(dim, { pos, neg });
    }

    this.anchorVectors = vectors;
    return true;
  }

  private embed(text: string): Promise<number[] | null> {
    return this.embedding!.embed(text);
  }

  /** embedding 锚点路径是否就绪 */
  get embeddingReady(): boolean {
    return this.anchorVectors !== null;
  }

  /**
   * 投影：文本 → 九维三元向量（三级回退链）
   */
  async project(input: string): Promise<ProjectionResult> {
    // 1. embedding 锚点投影
    if (this.embedding && (this.anchorVectors || !this.initAttempted)) {
      if (!this.anchorVectors && !this.initAttempted) {
        await this.initialize();
      }
      if (this.anchorVectors) {
        const inputVec = await this.embed(input);
        if (inputVec) {
          const result = this.projectViaAnchors(inputVec);
          this.lastResult = result;
          return result;
        }
      }
    }

    // 2. LLM 抽取
    if (this.llm) {
      try {
        const json = await this.llm.extractTritVector(input);
        if (json) {
          const result: ProjectionResult = {
            vector: tritJSONToVector(json),
            source: 'llm',
            confidence: 0.8,
            scores: null
          };
          this.lastResult = result;
          return result;
        }
      } catch {
        // 落入规则兜底
      }
    }

    // 3. 关键词规则兜底
    const result: ProjectionResult = {
      vector: contentToTritVector(input),
      source: 'rules',
      confidence: 0.3,
      scores: null
    };
    this.lastResult = result;
    return result;
  }

  /** 锚点相似度判定核心 */
  private projectViaAnchors(inputVec: number[]): ProjectionResult {
    const scores = {} as Record<TritDimension, DimScore>;
    const vector = {} as TritVector;
    let marginSum = 0;
    let decidedDims = 0;

    for (const dim of ALL_DIMENSIONS) {
      const anchors = this.anchorVectors!.get(dim)!;
      const posSim = Math.max(...anchors.pos.map(a => cosineSimilarity(inputVec, a)));
      const negSim = anchors.neg.length > 0
        ? Math.max(...anchors.neg.map(a => cosineSimilarity(inputVec, a)))
        : -1;

      let trit: Trit = 0;
      if (anchors.neg.length > 0) {
        // 有负锚点：双向竞争
        if (posSim >= this.minSim && posSim - negSim >= this.margin) {
          trit = 1;
        } else if (negSim >= this.minSim && negSim - posSim >= this.margin) {
          trit = -1;
        }
        // 否则 → 0（证据不足或正负相当：和态涌现）
      } else {
        // 无负锚点：单向激活
        if (posSim >= this.minSim) trit = 1;
      }

      scores[dim] = { pos: posSim, neg: negSim, trit };
      vector[dim] = trit;
      if (trit !== 0) {
        marginSum += anchors.neg.length > 0
          ? Math.abs(posSim - negSim)
          : posSim;
        decidedDims++;
      }
    }

    return {
      vector,
      source: 'embedding',
      confidence: decidedDims > 0 ? marginSum / decidedDims : 0,
      scores
    };
  }
}
