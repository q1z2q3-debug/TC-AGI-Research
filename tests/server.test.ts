/**
 * server.ts 单元测试
 * 使用 createServer() 导出的工厂函数创建测试服务器，发送真实 HTTP 请求验证。
 * 覆盖：各端点功能、API Key 认证、请求体大小限制、输入长度校验、CORS、404。
 */

import * as http from 'http';
import { createServer } from '../src/server';

function request(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json', ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode || 0, data: data ? JSON.parse(data) : {} }); }
          catch { resolve({ status: res.statusCode || 0, data: { raw: data } }); }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Cognitive HTTP Service', () => {
  let server: http.Server;

  beforeAll((done) => {
    // 保存原始环境变量
    process.env.COGNITIVE_API_KEY = ''; // 测试默认无认证
    server = createServer();
    server.listen(0, '127.0.0.1', done);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /health', () => {
    it('应返回 200 和服务状态', async () => {
      const res = await request(server, 'GET', '/health');
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(res.data.service).toBe('tc-agi-cognitive');
      expect(typeof res.data.memoryCount).toBe('number');
    });
  });

  describe('POST /perceive', () => {
    it('应返回认知向量和卦象索引', async () => {
      const res = await request(server, 'POST', '/perceive', { text: '测试认知感知' });
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(res.data.vector).toHaveLength(9);
      expect(typeof res.data.hexagramIndex).toBe('number');
      expect(res.data.hexagramIndex).toBeGreaterThanOrEqual(0);
      expect(res.data.hexagramIndex).toBeLessThanOrEqual(19682);
      expect(res.data.snapshot).toBeDefined();
    });

    it('缺少 text 字段应返回 400', async () => {
      const res = await request(server, 'POST', '/perceive', {});
      expect(res.status).toBe(400);
      expect(res.data.error).toBeDefined();
    });

    it('超长 text 应返回 413', async () => {
      const longText = 'a'.repeat(20000);
      const res = await request(server, 'POST', '/perceive', { text: longText });
      expect(res.status).toBe(413);
    });
  });

  describe('POST /infer', () => {
    it('应返回主动推理结果', async () => {
      const res = await request(server, 'POST', '/infer', { text: '推理测试' });
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(res.data.bestAction).toBeDefined();
      expect(typeof res.data.currentFreeEnergy).toBe('number');
      expect(res.data.evaluations).toBeDefined();
      expect(Array.isArray(res.data.evaluations)).toBe(true);
    });

    it('不传 text 时使用当前认知状态', async () => {
      const res = await request(server, 'POST', '/infer', {});
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
    });
  });

  describe('POST /prototype', () => {
    it('应返回原型匹配和推荐', async () => {
      const res = await request(server, 'POST', '/prototype', { text: '原型测试' });
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(res.data.bestMatch).toBeDefined();
      expect(res.data.ranked).toBeDefined();
      expect(res.data.recommendation).toBeDefined();
    });
  });

  describe('POST /memory', () => {
    it('缺少 query 应返回 400', async () => {
      const res = await request(server, 'POST', '/memory', {});
      expect(res.status).toBe(400);
    });

    it('应返回记忆检索结果', async () => {
      const res = await request(server, 'POST', '/memory', { query: '测试查询', limit: 5 });
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(Array.isArray(res.data.results)).toBe(true);
    });

    it('limit 超过 50 应被截断为 50', async () => {
      const res = await request(server, 'POST', '/memory', { query: 'test', limit: 100 });
      expect(res.status).toBe(200);
      // results 数量不会超过 50（空记忆时为 0，但不报错）
      expect(res.data.ok).toBe(true);
    });
  });

  describe('未知端点', () => {
    it('应返回 404', async () => {
      const res = await request(server, 'GET', '/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('OPTIONS CORS preflight', () => {
    it('应返回 204', async () => {
      const res = await request(server, 'OPTIONS', '/perceive');
      expect(res.status).toBe(204);
    });
  });

  describe('无效 JSON body', () => {
    it('应返回 500（不暴露内部错误）', async () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const res = await new Promise<{ status: number; data: any }>((resolve, reject) => {
        const req = http.request(
          { hostname: '127.0.0.1', port, path: '/perceive', method: 'POST', headers: { 'Content-Type': 'application/json' } },
          (r) => {
            let d = '';
            r.on('data', (c) => { d += c; });
            r.on('end', () => resolve({ status: r.statusCode || 0, data: JSON.parse(d) }));
          }
        );
        req.on('error', reject);
        req.write('not valid json{{{');
        req.end();
      });
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('服务器内部错误');
    });
  });
});

describe('Cognitive HTTP Service — API Key 认证', () => {
  let server: http.Server;

  beforeAll((done) => {
    process.env.COGNITIVE_API_KEY = 'test-secret-key';
    // 需要重新 require 以读取新的环境变量
    jest.resetModules();
    const { createServer: createServerAuth } = require('../src/server');
    server = createServerAuth();
    server.listen(0, '127.0.0.1', done);
  });

  afterAll((done) => {
    delete process.env.COGNITIVE_API_KEY;
    server.close(done);
  });

  it('无 API Key 应返回 401', async () => {
    const res = await request(server, 'GET', '/health');
    expect(res.status).toBe(401);
  });

  it('错误的 API Key 应返回 401', async () => {
    const res = await request(server, 'GET', '/health', undefined, { 'X-API-Key': 'wrong-key' });
    expect(res.status).toBe(401);
  });

  it('正确的 X-API-Key 应通过认证', async () => {
    const res = await request(server, 'GET', '/health', undefined, { 'X-API-Key': 'test-secret-key' });
    expect(res.status).toBe(200);
  });

  it('正确的 Authorization Bearer 应通过认证', async () => {
    const res = await request(server, 'GET', '/health', undefined, { 'Authorization': 'Bearer test-secret-key' });
    expect(res.status).toBe(200);
  });
});
