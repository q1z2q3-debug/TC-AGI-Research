/**
 * TC-AGI 认知服务 (Cognitive HTTP Service)
 * ─────────────────────────────────────────────────────────────
 * 为 Coze Studio 等外部 Agent 平台提供认知能力端点：
 *
 *   POST /perceive   文本 → 九维三元向量 + 卦象索引 + 认知态势
 *   POST /infer      主动推理（精度加权自由能最小化）→ 最佳认知行动
 *   POST /prototype  当前状态 → 最近认知原型 + 推荐行动
 *   POST /memory     记忆检索（三元索引 + 复合距离 + 时间衰减）
 *   GET  /health     健康检查
 *
 * 零外部依赖：仅 Node 内置 http。所有认知逻辑复用 src/cognitive/*。
 *
 * 安全措施：
 *   - 可选 API Key 认证（COGNITIVE_API_KEY 环境变量，未设置则跳过）
 *   - 请求体大小限制（默认 1MB，COGNITIVE_MAX_BODY_BYTES 可配置）
 *   - 输入文本长度校验（默认 10000 字符）
 *   - 可配置 CORS 来源（COGNITIVE_CORS_ORIGIN，默认 *）
 *   - 错误响应不暴露内部堆栈
 *   - 优雅关闭：SIGINT/SIGTERM 时先 flush 记忆再退出
 */

import * as http from 'http';

import { TritVector, TritVectorOps } from './cognitive/trit-vector';
import { CognitiveSpace } from './cognitive/cognitive-space';
import { ActiveInference, InferenceResult } from './cognitive/active-inference';
import { PrototypeMatcher, PrototypeMatch } from './cognitive/prototypes';
import { MemorySystem } from './memory/memory-system';

const PORT = Number(process.env.COGNITIVE_PORT || 8899);
const HOST = process.env.COGNITIVE_HOST || '0.0.0.0';
const API_KEY = process.env.COGNITIVE_API_KEY || '';
const CORS_ORIGIN = process.env.COGNITIVE_CORS_ORIGIN || '*';
const MAX_BODY_BYTES = Number(process.env.COGNITIVE_MAX_BODY_BYTES || 1024 * 1024); // 1MB
const MAX_TEXT_LENGTH = Number(process.env.COGNITIVE_MAX_TEXT_LENGTH || 10000);

// 认知空间（单例：状态在请求间持续）
const cognitive = new CognitiveSpace();
const memory = new MemorySystem();

/** JSON 读取辅助（带大小限制） */
function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('无效 JSON body')); }
    });
    req.on('error', reject);
  });
}

/** API Key 认证 */
function checkAuth(req: http.IncomingMessage): boolean {
  if (!API_KEY) return true; // 未配置则跳过认证
  const provided = req.headers['x-api-key'] || req.headers['authorization'];
  if (!provided) return false;
  const token = typeof provided === 'string'
    ? provided.replace(/^Bearer\s+/i, '')
    : provided[0];
  return token === API_KEY;
}

/** 统一响应 */
function send(res: http.ServerResponse, code: number, payload: any): void {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key,Authorization',
  });
  res.end(JSON.stringify(payload));
}

/** 序列化 TritVector → 可读结构 */
function vectorToJSON(v: TritVector) {
  return {
    vector: TritVectorOps.toArray(v),
    dimensions: { ...v },
    hexagramIndex: TritVectorOps.toHexagramIndex(v),
    summary: describeVector(v),
  };
}

/** 用 majority 生成简短态势描述 */
function describeVector(v: TritVector): string {
  const m = TritVectorOps.majority(v);
  if (m === 1) return '扩张态势（阳主导）';
  if (m === -1) return '收缩态势（阴主导）';
  return '观察/平衡态势（和主导）';
}

/** 原型匹配 → 可读结构 */
function protoToJSON(m: PrototypeMatch) {
  return {
    name: m.prototype.name,
    distance: m.distance,
    similarity: m.similarity,
  };
}

/** 推理结果 → 可读结构（精简） */
function inferenceToJSON(r: InferenceResult) {
  return {
    bestAction: r.bestAction,
    currentFreeEnergy: r.currentFreeEnergy,
    expectedFreeEnergy: r.expectedFreeEnergy,
    freeEnergyReduction: r.freeEnergyReduction,
    confidence: r.confidence,
    targetPrototype: r.targetPrototype.name,
    currentState: vectorToJSON(r.currentState),
    evaluations: r.evaluations.map(e => ({
      action: e.action,
      freeEnergy: e.freeEnergy,
      reason: e.reason,
    })),
  };
}

async function initialize(): Promise<void> {
  await memory.initialize();
  cognitive.perceive('系统启动 — 认知服务初始化');
}

/** 创建 HTTP 服务器（导出以便测试） */
export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      send(res, 204, {});
      return;
    }

    // API Key 认证
    if (!checkAuth(req)) {
      return send(res, 401, { error: '未授权：缺少或无效的 API Key' });
    }

    const url = (req.url || '').split('?')[0];

    try {
      if (req.method === 'POST' && url === '/perceive') {
        const body = await readBody(req);
        const text = String(body.text ?? body.content ?? '');
        if (!text) return send(res, 400, { error: '缺少 text 字段' });
        if (text.length > MAX_TEXT_LENGTH) return send(res, 413, { error: `text 超过最大长度 ${MAX_TEXT_LENGTH}` });
        const state = cognitive.perceive(text);
        return send(res, 200, {
          ok: true,
          text,
          ...vectorToJSON(state.vector),
          snapshot: cognitive.getSnapshot(),
        });
      }

      if (req.method === 'POST' && url === '/infer') {
        const body = await readBody(req);
        const text = String(body.text ?? '');
        if (text.length > MAX_TEXT_LENGTH) return send(res, 413, { error: `text 超过最大长度 ${MAX_TEXT_LENGTH}` });
        const state = text ? cognitive.perceive(text).vector : cognitive.getState().vector;
        const options: any = {
          precisionPreset: body.precisionPreset || undefined,
        };
        const result = ActiveInference.infer(state, cognitive.getHistory().map(h => h.vector), options);
        return send(res, 200, { ok: true, ...inferenceToJSON(result) });
      }

      if (req.method === 'POST' && url === '/prototype') {
        const body = await readBody(req);
        const text = String(body.text ?? '');
        if (text.length > MAX_TEXT_LENGTH) return send(res, 413, { error: `text 超过最大长度 ${MAX_TEXT_LENGTH}` });
        const state = text ? cognitive.perceive(text).vector : cognitive.getState().vector;
        const match = PrototypeMatcher.snapTo(state);
        const ranked = PrototypeMatcher.rankAll(state);
        const recommendation = PrototypeMatcher.recommendAction(state);
        return send(res, 200, {
          ok: true,
          current: vectorToJSON(state),
          bestMatch: protoToJSON(match),
          ranked: ranked.slice(0, 5).map(protoToJSON),
          recommendation,
        });
      }

      if (req.method === 'POST' && url === '/memory') {
        const body = await readBody(req);
        const query = String(body.query ?? '');
        if (!query) return send(res, 400, { error: '缺少 query 字段' });
        if (query.length > MAX_TEXT_LENGTH) return send(res, 413, { error: `query 超过最大长度 ${MAX_TEXT_LENGTH}` });
        const limit = Math.min(Number(body.limit ?? 10), 50);
        const results = memory.retrieve(query, limit);
        return send(res, 200, { ok: true, count: results.length, results });
      }

      if (req.method === 'GET' && url === '/health') {
        return send(res, 200, {
          ok: true,
          service: 'tc-agi-cognitive',
          state: cognitive.getSnapshot().state.summary,
          memoryCount: memory.getAll().length,
        });
      }

      return send(res, 404, { error: '未知端点' });
    } catch {
      // 不暴露内部错误详情
      return send(res, 500, { error: '服务器内部错误' });
    }
  });
}

/** 启动服务器（带优雅关闭） */
export async function startServer(): Promise<http.Server> {
  await initialize();
  const server = createServer();

  server.listen(PORT, HOST, () => {
    console.log(`🧠 TC-AGI 认知服务已启动: http://${HOST}:${PORT}`);
    console.log(`   端点: /perceive /infer /prototype /memory /health`);
    if (API_KEY) console.log(`   🔐 API Key 认证已启用`);
  });

  // 优雅关闭
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 收到 ${signal}，正在优雅关闭认知服务...`);
    server.close();
    try { await memory.shutdown(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
  process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });

  return server;
}

// 直接运行时启动（import 时不自动启动，便于测试）
if (require.main === module) {
  startServer().catch(err => {
    console.error('❌ 认知服务初始化失败:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
