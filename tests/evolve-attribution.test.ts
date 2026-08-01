import { EngineLayer, TaskPlan, FailureAttribution } from '../src/core/engine';
import { LLMProvider } from '../src/cognitive/llm';
import { IdeologyLayer } from '../src/core/ideology';
import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { MemorySystem } from '../src/memory/memory-system';
import { SkillLoader } from '../src/skills/skill-loader';
import { MCPAdapter } from '../src/tools/mcp-adapter';
import { CronScheduler } from '../src/scheduler/cron-scheduler';
import { v4 as uuidv4 } from 'uuid';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 隔离记忆持久化：MemoryStore 默认写入 ~/.tc-agi-memory.json。
 * 每个测试把 HOME 指到一个全新临时目录，避免跨测试/跨运行的记忆泄漏，
 * 也避免污染用户真实 home。
 */
beforeEach(() => {
  process.env.HOME = mkdtempSync(join(tmpdir(), 'tc-agi-test-'));
  process.env.USERPROFILE = process.env.HOME;
});

/**
 * 假 LLM：实现 LLMProvider，返回固定的失败归因 JSON（无需真实密钥/网络）。
 * mode='bad-json' 时返回非法 JSON，用于验证解析失败的优雅降级。
 */
class FakeLLM implements LLMProvider {
  constructor(private mode: 'ok' | 'bad-json' = 'ok') {}
  async complete(_system: string, _user: string): Promise<string> {
    if (this.mode === 'bad-json') return '这不是合法 JSON';
    const attribution: FailureAttribution = {
      rootCause: '匹配到的 skill 不存在，导致 executeStep 无实际 handler',
      failedStep: 'step-3',
      category: 'skill_mismatch',
      correctiveAction: '在 decomposeTask 阶段增加技能存在性校验，缺省回退到通用执行',
      confidence: 0.82,
      lesson: '任务分解必须先验证技能可用性，再写入 plan'
    };
    return JSON.stringify(attribution);
  }
}

function buildEngine(): { engine: EngineLayer; memory: MemorySystem } {
  const memory = new MemorySystem();
  const engine = new EngineLayer(
    new IdeologyLayer(),
    new CognitiveSpace(),
    memory,
    new SkillLoader(new MemorySystem()),
    new MCPAdapter(),
    new CronScheduler()
  );
  return { engine, memory };
}

function makePlan(goal = '控制浏览器完成自动下单'): TaskPlan {
  return {
    id: `plan-${uuidv4().slice(0, 8)}`,
    goal,
    steps: [
      { id: 'step-1', description: '认知定位', status: 'done', retries: 0, maxRetries: 1 },
      { id: 'step-2', description: '检索记忆', status: 'done', retries: 0, maxRetries: 2 },
      {
        id: 'step-3', description: '主要执行',
        skill: 'browser-control', status: 'error',
        retries: 3, maxRetries: 3, error: '技能 browser-control 未注册'
      }
    ],
    priority: 2,
    status: 'failed',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/** 按唯一复盘名取出本测试写入的复盘记忆（避免依赖顺序/去重） */
function getExperience(memory: MemorySystem, plan: TaskPlan): any {
  const m = memory.getAll().find(x => x.name === `复盘-${plan.id}`);
  return m ? JSON.parse(m.content) : null;
}

describe('evolveFromResults · LLM 失败归因', () => {
  test('接入 LLM 时，失败任务产生结构化归因并写入记忆', async () => {
    const { engine, memory } = buildEngine();
    await memory.initialize();
    engine.setLLM(new FakeLLM('ok'));
    expect(engine.hasLLM).toBe(true);

    const plan = makePlan();
    await engine.evolveFromResults(plan, [], ['步骤 step-3 失败: 技能 browser-control 未注册']);

    const exp = getExperience(memory, plan);
    expect(exp).not.toBeNull();
    expect(exp.success).toBe(false);
    expect(exp.attribution).not.toBeNull();
    expect(exp.attribution.category).toBe('skill_mismatch');
    expect(exp.attribution.failedStep).toBe('step-3');
    expect(exp.attribution.confidence).toBeCloseTo(0.82);
    expect(exp.attribution.lesson).toContain('任务分解');
    // 标签含失败类别，便于后续检索
    const stored = memory.getAll().find(x => x.name === `复盘-${plan.id}`)!;
    expect(stored.tags).toContain('failure-attribution');
    expect(stored.tags).toContain('skill_mismatch');
  });

  test('未接入 LLM 时，失败任务仍可复盘且不抛错（优雅降级）', async () => {
    const { engine, memory } = buildEngine();
    await memory.initialize();
    expect(engine.hasLLM).toBe(false);

    const plan = makePlan();
    await expect(
      engine.evolveFromResults(plan, [], ['步骤 step-3 失败: boom'])
    ).resolves.toBeUndefined();

    const exp = getExperience(memory, plan);
    expect(exp).not.toBeNull();
    expect(exp.success).toBe(false);
    expect(exp.attribution).toBeNull();
    const stored = memory.getAll().find(x => x.name === `复盘-${plan.id}`)!;
    expect(stored.tags).not.toContain('failure-attribution');
  });

  test('LLM 返回非法 JSON 时，归因降级为 null 但不阻断复盘', async () => {
    const { engine, memory } = buildEngine();
    await memory.initialize();
    engine.setLLM(new FakeLLM('bad-json'));

    const plan = makePlan();
    await expect(
      engine.evolveFromResults(plan, [], ['步骤 step-3 失败: boom'])
    ).resolves.toBeUndefined();

    const exp = getExperience(memory, plan);
    expect(exp).not.toBeNull();
    expect(exp.success).toBe(false);
    expect(exp.attribution).toBeNull();
  });

  test('成功任务不需要归因，复盘记录 success=true 且无 attribution', async () => {
    const { engine, memory } = buildEngine();
    await memory.initialize();
    engine.setLLM(new FakeLLM('ok'));

    const plan = makePlan();
    plan.steps[2].status = 'done';
    plan.steps[2].error = undefined;
    plan.status = 'completed';

    await engine.evolveFromResults(plan, [{ ok: true }], []);

    const exp = getExperience(memory, plan);
    expect(exp).not.toBeNull();
    expect(exp.success).toBe(true);
    expect(exp.attribution).toBeNull();
    const stored = memory.getAll().find(x => x.name === `复盘-${plan.id}`)!;
    expect(stored.tags).not.toContain('failure-attribution');
  });
});
