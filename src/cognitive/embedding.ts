/**
 * 嵌入向量客户端 (Embedding Client)
 * ─────────────────────────────────────────────────────────────
 * 为技能/工具检索提供语义向量。默认走本地 Ollama（nomic-embed-text），
 * 零 API 成本、零密钥；失败时优雅降级（返回 null），由上层回退关键词匹配。
 *
 * Ollama embeddings API:
 *   POST {baseUrl}/api/embeddings
 *   body:  { model, prompt }
 *   resp:  { embedding: number[] }
 */

/** 可被注入的嵌入提供者接口（便于测试时替换） */
export interface EmbeddingProvider {
  embed(text: string): Promise<number[] | null>;
}

/**
 * 纯函数：余弦相似度。两向量任一为空或维度不一致返回 0。
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface EmbeddingClientOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  /** 显式关闭（例如明确不启用本地嵌入） */
  enabled?: boolean;
}

export class EmbeddingClient implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly _enabled: boolean;
  private _available: boolean | null = null;

  constructor(opts: EmbeddingClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || process.env.EMBEDDING_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.model = opts.model || process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    this.timeoutMs = opts.timeoutMs || 15000;
    this._enabled = opts.enabled !== false;
  }

  /** 是否被允许尝试（默认 true；可用环境变量关闭） */
  get enabled(): boolean {
    return this._enabled && process.env.EMBEDDING_ENABLED !== 'false';
  }

  /**
   * 探测 Ollama 是否可用（带缓存）。
   * 仅用于启动期日志，不阻塞主流程。
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    if (!this.enabled) {
      this._available = false;
      return false;
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: ctrl.signal });
      clearTimeout(t);
      this._available = res.ok;
    } catch {
      this._available = false;
    }
    return this._available;
  }

  /**
   * 获取文本向量。任何失败（网络/超时/解析）均返回 null，
   * 上层据此回退关键词匹配，绝不抛出。
   */
  async embed(text: string): Promise<number[] | null> {
    if (!this.enabled) return null;
    // 已知不可用时直接跳过，避免每次任务都撞连接
    if (this._available === false) return null;

    let ctrl: AbortController | undefined;
    try {
      ctrl = new AbortController();
      const timer = setTimeout(() => ctrl!.abort(), this.timeoutMs);
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        this._available = false;
        return null;
      }
      const data = (await res.json()) as any;
      const vec: number[] | undefined = data?.embedding;
      if (!Array.isArray(vec)) {
        this._available = false;
        return null;
      }
      this._available = true;
      return vec;
    } catch {
      // 连接被拒 / 超时 / DNS 失败 —— 标记不可用并降级
      this._available = false;
      return null;
    } finally {
      if (ctrl) ctrl.abort();
    }
  }
}
