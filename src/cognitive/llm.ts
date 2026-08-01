/**
 * DeepSeek LLM 客户端
 * 为认知循环提供真实语义理解：
 *   - 将输入文本抽取为九维三元认知向量（TritVectorJSON）
 *   - 为"觉知 / 推理"提供 LLM 级语义（取代纯规则）
 *
 * 设计原则：无密钥 / 网络异常时优雅降级（返回 null，调用方回退本地规则引擎）。
 * 密钥只从环境变量或构造参数读取，绝不硬编码进仓库。
 */

import { TritVectorJSON } from './semantic';

export interface DeepSeekOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * LLM 提供者抽象接口。
 * 引擎层（失败归因）/ 认知层（觉知）只依赖此接口，便于注入真实 DeepSeekClient，
 * 也便于在测试中注入 FakeLLM（无需真实密钥与网络）。
 */
export interface LLMProvider {
  /** 给定 system / user 提示，返回模型文本补全（实现方应自行处理超时与错误） */
  complete(system: string, user: string): Promise<string>;
}

const SYSTEM_PROMPT = `你是一个认知解析器。给定一段输入文本，请将其映射到九维三元认知向量（每个维度取值 -1 / 0 / 1）：
- 时间：past(过去) / present(现在) / future(未来)
- 空间：internal(内) / medial(中) / external(外)
- 因果：cause(因) / condition(缘) / effect(果)
-1=收缩/否定，0=观察/中性，1=扩张/肯定。
只输出 JSON，格式严格为：
{"past":0,"present":1,"future":1,"internal":1,"medial":0,"external":0,"cause":1,"condition":1,"effect":0,"reasoning":"一句话理由"}`;

export class DeepSeekClient implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(opts: DeepSeekOptions = {}) {
    this.apiKey = opts.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = opts.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = opts.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.timeoutMs = opts.timeoutMs || 20000;
    if (!this.apiKey) {
      throw new Error('DeepSeekClient: 未提供 DEEPSEEK_API_KEY');
    }
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  /** 原始对话补全 */
  async complete(system: string, user: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      if (!resp.ok) {
        throw new Error(`DeepSeek API ${resp.status}: ${await resp.text()}`);
      }
      const data: any = await resp.json();
      return data?.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }

  /** 抽取九维认知向量；失败返回 null（触发本地降级） */
  async extractTritVector(input: string): Promise<TritVectorJSON | null> {
    try {
      const raw = await this.complete(SYSTEM_PROMPT, `输入文本：${input}`);
      const parsed = JSON.parse(raw) as TritVectorJSON;
      return {
        past: parsed.past, present: parsed.present, future: parsed.future,
        internal: parsed.internal, medial: parsed.medial, external: parsed.external,
        cause: parsed.cause, condition: parsed.condition, effect: parsed.effect
      };
    } catch (e) {
      return null;
    }
  }
}
