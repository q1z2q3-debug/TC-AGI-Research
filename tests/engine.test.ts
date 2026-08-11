/**
 * EngineLayer 单元测试
 * 覆盖：任务分解、策略派生（规则路径）、计划执行（含重试/依赖跳过/空引擎）、
 *       失败归因、进化复盘、辅助方法（getMajority/selectPrecisionPreset/generateSteps）
 */

import { EngineLayer, TaskPlan, TaskStep } from '../src/core/engine';
import { IdeologyLayer } from '../src/core/ideology';
import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { MemorySystem } from '../src/memory/memory-system';
import { SkillLoader, Skill } from '../src/skills/skill-loader';
import { MCPAdapter, MCPTool } from '../src/tools/mcp-adapter';
import { CronScheduler } from '../src/scheduler/cron-scheduler';
import { LLMProvider } from '../src/cognitive/llm';
import { TritVectorOps } from '../src/cognitive/trit-vector';

// ─── Mock 工厂 ───────────────────────────────────────────────

function makeCognitiveMock(perceiveResult?: any) {
  const history: any[] = [];
  return {
    perceive: jest.fn((input: string) => {
      const state = perceiveResult || {
        vector: TritVectorOps.zero(),
        hexagramIndex: 0,
        piDepth: 5,
        eWeight: 0.5,
        timestamp: Date.now(),
        summary: `感知: ${input}`
      };
      history.push(state);
      return state;
    }),
    getState: jest.fn(() => perceiveResult || { vector: TritVectorOps.zero(), summary: 'test' }),
    getHistory: jest.fn(() => history),
    getSnapshot: jest.fn(() => ({ state: { summary: 'test' }, majority: 0 })),
    update: jest.fn(),
    reset: jest.fn(),
  } as unknown as CognitiveSpace;
}

function makeMemoryMock() {
  return {
    initialize: jest.fn(async () => {}),
    retrieve: jest.fn((_q: string, _l?: number) => []),
    save: jest.fn(async (m: any) => ({ id: 'mem-1', ...m })),
    getAll: jest.fn(() => []),
    shutdown: jest.fn(async () => {}),
  } as unknown as MemorySystem;
}

function makeSkillLoaderMock(skills: Map<string, Skill> = new Map()) {
  return {
    matchSkills: jest.fn(async (_goal: string) => []),
    getSkill: jest.fn((name: string) => skills.get(name)),
    registerSkill: jest.fn((skill: Skill) => { skills.set(skill.name, skill); }),
    loadAll: jest.fn(async () => {}),
    buildIndex: jest.fn(async () => {}),
    getAvailableSkills: jest.fn(() => Array.from(skills.keys())),
  } as unknown as SkillLoader;
}

function makeMcpMock(tools: Map<string, MCPTool> = new Map()) {
  return {
    matchTools: jest.fn(async (_goal: string) => []),
    getTool: jest.fn((name: string) => tools.get(name)),
    initialize: jest.fn(async () => {}),
    buildIndex: jest.fn(async () => {}),
    shutdown: jest.fn(async () => {}),
  } as unknown as MCPAdapter;
}

function makeIdeologyMock() {
  return {
    checkCompliance: jest.fn(() => ({ allowed: true })),
    getBeliefs: jest.fn(() => ({})),
  } as unknown as IdeologyLayer;
}

function makeSchedulerMock() {
  return {
    schedule: jest.fn(),
    shutdown: jest.fn(async () => {}),
  } as unknown as CronScheduler;
}

function makeFakeLLM(response: string): LLMProvider {
  return { complete: jest.fn(async () => response) };
}

function buildEngine(overrides?: {
  cognitive?: CognitiveSpace;
  memory?: MemorySystem;
  skillLoader?: SkillLoader;
  mcp?: MCPAdapter;
  ideology?: IdeologyLayer;
  scheduler?: CronScheduler;
}) {
  return new EngineLayer(
    overrides?.ideology || makeIdeologyMock(),
    overrides?.cognitive || makeCognitiveMock(),
    overrides?.memory || makeMemoryMock(),
    overrides?.skillLoader || makeSkillLoaderMock(),
    overrides?.mcp || makeMcpMock(),
    overrides?.scheduler || makeSchedulerMock()
  );
}

// ─── 测试套件 ─────────────────────────────────────────────────

describe('EngineLayer', () => {
  describe('基础构造与 LLM 接入', () => {
    it('应正确构造且初始无 LLM', () => {
      const engine = buildEngine();
      expect(engine).toBeInstanceOf(EngineLayer);
      expect(engine.hasLLM).toBe(false);
    });

    it('setLLM 后 hasLLM 应为 true', () => {
      const engine = buildEngine();
      engine.setLLM(makeFakeLLM('{}'));
      expect(engine.hasLLM).toBe(true);
    });
  });

  describe('decomposeTask — 任务分解', () => {
    it('应生成包含 4 个步骤的计划', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan = await engine.decomposeTask('测试任务目标');

      expect(plan.id).toMatch(/^plan-/);
      expect(plan.goal).toBe('测试任务目标');
      expect(plan.steps).toHaveLength(4);
      expect(plan.status).toBe('pending');
      expect(plan.cognitiveState).toBeDefined();
      expect(plan.strategy).toBeDefined();
    });

    it('四个步骤应有正确的依赖链：step1 → step2 → step3 → step4', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan = await engine.decomposeTask('依赖链测试');

      const [s1, s2, s3, s4] = plan.steps;
      expect(s1.dependencies).toBeUndefined();
      expect(s2.dependencies).toEqual([s1.id]);
      expect(s3.dependencies).toEqual([s2.id]);
      expect(s4.dependencies).toEqual([s3.id]);
    });

    it('步骤1应为认知定位，步骤4应为验证复盘', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan = await engine.decomposeTask('步骤内容测试');

      expect(plan.steps[0].description).toContain('认知定位');
      expect(plan.steps[0].skill).toBe('self-evolve');
      expect(plan.steps[1].description).toContain('检索');
      expect(plan.steps[1].skill).toBe('memory-retrieve');
      expect(plan.steps[3].description).toContain('验证');
      expect(plan.steps[3].skill).toBe('self-evolve');
    });

    it('应调用 memory.retrieve 和 skillLoader.matchSkills', async () => {
      const memory = makeMemoryMock();
      const skillLoader = makeSkillLoaderMock();
      const mcp = makeMcpMock();
      const engine = buildEngine({ memory, skillLoader, mcp });
      await engine.initialize();

      await engine.decomposeTask('调用验证');

      expect(memory.retrieve).toHaveBeenCalledWith('调用验证', 5);
      expect(skillLoader.matchSkills).toHaveBeenCalledWith('调用验证', 5, 0.25);
      expect(mcp.matchTools).toHaveBeenCalledWith('调用验证', 5, 0.25);
    });

    it('getPlan 应返回已创建的计划', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan = await engine.decomposeTask('getPlan 测试');
      expect(engine.getPlan(plan.id)).toBe(plan);
      expect(engine.getPlan('nonexistent')).toBeUndefined();
    });

    it('getAllPlans 应返回所有计划', async () => {
      const engine = buildEngine();
      await engine.initialize();
      await engine.decomposeTask('计划A');
      await engine.decomposeTask('计划B');
      expect(engine.getAllPlans()).toHaveLength(2);
    });
  });

  describe('executePlan — 计划执行', () => {
    it('全部步骤通用执行（无 skill/tool）应成功完成', async () => {
      const cognitive = makeCognitiveMock();
      const memory = makeMemoryMock();
      const skillLoader = makeSkillLoaderMock();
      const mcp = makeMcpMock();
      const engine = buildEngine({ cognitive, memory, skillLoader, mcp });
      await engine.initialize();

      // 手动构造一个所有步骤都无 skill/tool 的计划
      const plan: TaskPlan = {
        id: 'plan-test-generic',
        goal: '通用执行测试',
        steps: [
          { id: 's1', description: '步骤1', status: 'pending', retries: 0, maxRetries: 0 },
          { id: 's2', description: '步骤2', status: 'pending', retries: 0, maxRetries: 0, dependencies: ['s1'] },
        ],
        priority: 2,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('completed');
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);
      expect(plan.steps.every(s => s.status === 'done')).toBe(true);
    });

    it('执行已注册技能应调用 skill.execute', async () => {
      const execFn = jest.fn(async () => ({ ok: true }));
      const skills = new Map<string, Skill>([
        ['test-skill', { name: 'test-skill', description: 'test', instructions: '', memoryEnabled: false, execute: execFn }]
      ]);
      const skillLoader = makeSkillLoaderMock(skills);
      const engine = buildEngine({ skillLoader });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-test-skill',
        goal: '技能执行测试',
        steps: [
          { id: 's1', description: '技能步骤', skill: 'test-skill', parameters: { x: 1 }, status: 'pending', retries: 0, maxRetries: 0 },
        ],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('completed');
      expect(execFn).toHaveBeenCalledWith({ x: 1 });
    });

    it('技能执行失败应重试，最终成功', async () => {
      let calls = 0;
      const execFn = jest.fn(async () => {
        calls++;
        if (calls < 2) throw new Error('临时失败');
        return { ok: true };
      });
      const skills = new Map<string, Skill>([
        ['retry-skill', { name: 'retry-skill', description: 'test', instructions: '', memoryEnabled: false, execute: execFn }]
      ]);
      const skillLoader = makeSkillLoaderMock(skills);
      const engine = buildEngine({ skillLoader });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-test-retry',
        goal: '重试测试',
        steps: [
          { id: 's1', description: '重试步骤', skill: 'retry-skill', status: 'pending', retries: 0, maxRetries: 2 },
        ],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('completed');
      expect(calls).toBe(2);
      expect(plan.steps[0].retries).toBe(1);
    });

    it('超过最大重试次数应标记步骤为 error', async () => {
      const execFn = jest.fn(async () => { throw new Error('持续失败'); });
      const skills = new Map<string, Skill>([
        ['fail-skill', { name: 'fail-skill', description: 'test', instructions: '', memoryEnabled: false, execute: execFn }]
      ]);
      const skillLoader = makeSkillLoaderMock(skills);
      const engine = buildEngine({ skillLoader });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-test-maxretry',
        goal: '最大重试测试',
        steps: [
          { id: 's1', description: '失败步骤', skill: 'fail-skill', status: 'pending', retries: 0, maxRetries: 1 },
          { id: 's2', description: '依赖步骤', status: 'pending', retries: 0, maxRetries: 0, dependencies: ['s1'] },
        ],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('failed');
      expect(plan.steps[0].status).toBe('error');
      // 依赖未满足的步骤应被标记为 error（跳过）
      expect(plan.steps[1].status).toBe('error');
      expect(plan.steps[1].error).toContain('依赖');
    });

    it('执行不存在的计划应抛错', async () => {
      const engine = buildEngine();
      await engine.initialize();
      await expect(engine.executePlan('nonexistent')).rejects.toThrow('not found');
    });

    it('getRunningPlans 应追踪正在运行的计划', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan = await engine.decomposeTask('运行中测试');
      expect(engine.getRunningPlans()).toHaveLength(0);
      // executePlan 是同步添加到 runningPlans 后异步执行，这里验证最终为空
      await engine.executePlan(plan.id);
      expect(engine.getRunningPlans()).toHaveLength(0);
    });
  });

  describe('evolveFromResults — 进化复盘', () => {
    it('成功时应感知"任务成功"并写入 feedback 记忆', async () => {
      const cognitive = makeCognitiveMock();
      const memory = makeMemoryMock();
      const engine = buildEngine({ cognitive, memory });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-evolve-ok', goal: '成功复盘', steps: [],
        priority: 2, status: 'completed', createdAt: new Date(), updatedAt: new Date(),
      };

      await engine.evolveFromResults(plan, [{ ok: true }], []);

      expect(cognitive.perceive).toHaveBeenCalledWith(expect.stringContaining('任务成功'));
      expect(memory.save).toHaveBeenCalledWith(expect.objectContaining({
        type: 'feedback',
        tags: expect.arrayContaining(['self-evolve', 'success']),
      }));
    });

    it('失败且无 LLM 时应感知"任务失败"并写入 failure 标签', async () => {
      const cognitive = makeCognitiveMock();
      const memory = makeMemoryMock();
      const engine = buildEngine({ cognitive, memory });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-evolve-fail', goal: '失败复盘', steps: [],
        priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date(),
      };

      await engine.evolveFromResults(plan, [], ['步骤失败']);

      expect(cognitive.perceive).toHaveBeenCalledWith(expect.stringContaining('任务失败'));
      expect(memory.save).toHaveBeenCalledWith(expect.objectContaining({
        tags: expect.arrayContaining(['failure']),
      }));
    });

    it('失败且有 LLM 时应调用归因并写入归因标签', async () => {
      const cognitive = makeCognitiveMock();
      const memory = makeMemoryMock();
      const fakeLLM = makeFakeLLM(JSON.stringify({
        rootCause: '技能参数错误',
        failedStep: 's1',
        category: 'param_error',
        correctiveAction: '修正参数格式',
        confidence: 0.85,
        lesson: '参数校验不可省略',
      }));
      const engine = buildEngine({ cognitive, memory });
      engine.setLLM(fakeLLM);
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-evolve-attr', goal: '归因复盘',
        steps: [{ id: 's1', description: 'test', status: 'error', retries: 0, maxRetries: 0, error: 'fail' }],
        priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date(),
      };

      await engine.evolveFromResults(plan, [], ['s1 失败']);

      expect(fakeLLM.complete).toHaveBeenCalled();
      expect(cognitive.perceive).toHaveBeenCalledWith(expect.stringContaining('param_error'));
      expect(memory.save).toHaveBeenCalledWith(expect.objectContaining({
        tags: expect.arrayContaining(['failure-attribution', 'param_error']),
      }));
    });
  });

  describe('attributeFailure — 失败归因（private）', () => {
    it('无 LLM 时返回 null', async () => {
      const engine = buildEngine();
      await engine.initialize();
      const plan: TaskPlan = { id: 'p', goal: 'g', steps: [], priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date() };
      const result = await (engine as any).attributeFailure(plan, [], ['err']);
      expect(result).toBeNull();
    });

    it('LLM 返回有效 JSON 时返回结构化归因', async () => {
      const fakeLLM = makeFakeLLM(JSON.stringify({
        rootCause: '工具超时',
        failedStep: 's2',
        category: 'timeout',
        correctiveAction: '增加超时时间',
        confidence: 0.9,
        lesson: '网络操作需设置合理超时',
      }));
      const engine = buildEngine();
      engine.setLLM(fakeLLM);
      await engine.initialize();

      const plan: TaskPlan = { id: 'p', goal: 'g', steps: [], priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date() };
      const result = await (engine as any).attributeFailure(plan, [], ['err']);

      expect(result).not.toBeNull();
      expect(result.rootCause).toBe('工具超时');
      expect(result.category).toBe('timeout');
      expect(result.confidence).toBe(0.9);
    });

    it('LLM 返回无效 category 时降级为 unknown', async () => {
      const fakeLLM = makeFakeLLM(JSON.stringify({
        rootCause: '奇怪原因',
        failedStep: null,
        category: 'weird_category',
        correctiveAction: 'x',
        confidence: 0.5,
        lesson: 'y',
      }));
      const engine = buildEngine();
      engine.setLLM(fakeLLM);
      await engine.initialize();

      const plan: TaskPlan = { id: 'p', goal: 'g', steps: [], priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date() };
      const result = await (engine as any).attributeFailure(plan, [], ['err']);
      expect(result.category).toBe('unknown');
    });

    it('LLM 抛错时返回 null（优雅降级）', async () => {
      const fakeLLM = { complete: jest.fn(async () => { throw new Error('network'); }) };
      const engine = buildEngine();
      engine.setLLM(fakeLLM as unknown as LLMProvider);
      await engine.initialize();

      const plan: TaskPlan = { id: 'p', goal: 'g', steps: [], priority: 2, status: 'failed', createdAt: new Date(), updatedAt: new Date() };
      const result = await (engine as any).attributeFailure(plan, [], ['err']);
      expect(result).toBeNull();
    });
  });

  describe('getMajority — 多数态计算（private）', () => {
    let engine: EngineLayer;
    beforeEach(async () => {
      engine = buildEngine();
      await engine.initialize();
    });

    it('全 +1 向量应返回 1（扩张）', () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect((engine as any).getMajority(v)).toBe(1);
    });

    it('全 -1 向量应返回 -1（收缩）', () => {
      const v = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
      expect((engine as any).getMajority(v)).toBe(-1);
    });

    it('全 0 向量应返回 0（观察）', () => {
      const v = TritVectorOps.zero();
      expect((engine as any).getMajority(v)).toBe(0);
    });

    it('sum = 2 时应返回 1（阈值 >1）', () => {
      // 两个 +1，其余 0 → sum = 2 > 1 → 1
      const v = TritVectorOps.fromArray([1, 1, 0, 0, 0, 0, 0, 0, 0]);
      expect((engine as any).getMajority(v)).toBe(1);
    });

    it('sum = 1 时应返回 0（未超过阈值）', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect((engine as any).getMajority(v)).toBe(0);
    });
  });

  describe('selectPrecisionPreset — 精度预设选择（private）', () => {
    let engine: EngineLayer;
    beforeEach(async () => {
      engine = buildEngine();
      await engine.initialize();
    });

    it('external=-1 时应返回 crisis（危机优先）', () => {
      const v = { ...TritVectorOps.zero(), external: -1 };
      expect((engine as any).selectPrecisionPreset('expand', v)).toBe('crisis');
    });

    it('internal=-1 时应返回 crisis', () => {
      const v = { ...TritVectorOps.zero(), internal: -1 };
      expect((engine as any).selectPrecisionPreset('observe', v)).toBe('crisis');
    });

    it('expand 模式无危机时返回 execution', () => {
      const v = TritVectorOps.zero();
      expect((engine as any).selectPrecisionPreset('expand', v)).toBe('execution');
    });

    it('contract 模式返回 execution', () => {
      expect((engine as any).selectPrecisionPreset('contract', TritVectorOps.zero())).toBe('execution');
    });

    it('observe 模式返回 observation', () => {
      expect((engine as any).selectPrecisionPreset('observe', TritVectorOps.zero())).toBe('observation');
    });

    it('未知模式返回 default', () => {
      expect((engine as any).selectPrecisionPreset('transform', TritVectorOps.zero())).toBe('default');
    });
  });

  describe('generateSteps — 步骤生成（private）', () => {
    let engine: EngineLayer;
    beforeEach(async () => {
      engine = buildEngine();
      await engine.initialize();
    });

    it('expand 模式的步骤3描述应包含"主动执行"', () => {
      const steps = (engine as any).generateSteps('目标', { mode: 'expand' }, [], [], []);
      expect(steps[2].description).toContain('主动执行');
      expect(steps[2].parameters.mode).toBe('expand');
    });

    it('contract 模式的步骤3描述应包含"收缩聚焦"', () => {
      const steps = (engine as any).generateSteps('目标', { mode: 'contract' }, [], [], []);
      expect(steps[2].description).toContain('收缩聚焦');
    });

    it('observe 模式的步骤3描述应包含"观察学习"', () => {
      const steps = (engine as any).generateSteps('目标', { mode: 'observe' }, [], [], []);
      expect(steps[2].description).toContain('观察学习');
    });

    it('匹配到技能时应设置 mainStep.skill', () => {
      const skill: Skill = { name: 'matched-skill', description: 'd', instructions: '', memoryEnabled: false, execute: async () => ({}) };
      const skillMatches = [{ skill, score: 0.8, source: 'keyword' as const }];
      const steps = (engine as any).generateSteps('目标', { mode: 'expand' }, skillMatches, [], []);
      expect(steps[2].skill).toBe('matched-skill');
    });

    it('匹配到工具时应设置 mainStep.tool', () => {
      const tool: MCPTool = { name: 'matched-tool', description: 'd', parameters: {}, execute: async () => ({}) };
      const toolMatches = [{ tool, score: 0.9, source: 'keyword' as const }];
      const steps = (engine as any).generateSteps('目标', { mode: 'expand' }, [], toolMatches, []);
      expect(steps[2].tool).toBe('matched-tool');
    });

    it('所有步骤的 maxRetries 应合理设置', () => {
      const steps = (engine as any).generateSteps('目标', { mode: 'expand' }, [], [], []);
      expect(steps[0].maxRetries).toBe(1); // 认知定位
      expect(steps[1].maxRetries).toBe(2); // 信息检索
      expect(steps[2].maxRetries).toBe(3); // 主要执行（MAX_RETRIES）
      expect(steps[3].maxRetries).toBe(1); // 验证复盘
    });
  });

  describe('deriveStrategyViaRules — 规则策略派生（private）', () => {
    let engine: EngineLayer;
    beforeEach(async () => {
      engine = buildEngine();
      await engine.initialize();
    });

    it('majority=1 且内外皆阳应返回"内外协同·全面扩张"', () => {
      const state = { vector: TritVectorOps.fromArray([1, 1, 1, 1, 0, 1, 1, 1, 0]), summary: 'test' };
      const strategy = (engine as any).deriveStrategyViaRules(state, 1);
      expect(strategy.mode).toBe('expand');
      expect(strategy.name).toContain('扩张');
      expect(strategy.source).toBe('rules');
    });

    it('majority=-1 且内阴应返回收缩策略', () => {
      const state = { vector: TritVectorOps.fromArray([-1, -1, 0, -1, 0, 0, 0, 0, 0]), summary: 'test' };
      const strategy = (engine as any).deriveStrategyViaRules(state, -1);
      expect(strategy.mode).toBe('contract');
    });

    it('majority=0 应返回观察策略', () => {
      const state = { vector: TritVectorOps.zero(), summary: 'test' };
      const strategy = (engine as any).deriveStrategyViaRules(state, 0);
      expect(strategy.mode).toBe('observe');
    });

    it('因果皆阳时应提升 confidence', () => {
      const state = { vector: TritVectorOps.fromArray([1, 1, 0, 1, 0, 1, 1, 1, 0]), summary: 'test' };
      const strategy = (engine as any).deriveStrategyViaRules(state, 1);
      expect(strategy.confidence).toBeGreaterThan(0.85);
    });
  });

  describe('空引擎技能创造', () => {
    it('技能不存在且空引擎创造成功时应执行新技能', async () => {
      const execFn = jest.fn(async () => ({ created: true }));
      const skills = new Map<string, Skill>();
      const skillLoader = makeSkillLoaderMock(skills);
      const engine = buildEngine({ skillLoader });
      await engine.initialize();

      // Mock nullEngine.createSkill
      (engine as any).nullEngine = {
        createSkill: jest.fn(async () => ({
          success: true,
          skill: { name: 'created-skill', description: '', instructions: '', memoryEnabled: false, execute: execFn },
        })),
      };

      const plan: TaskPlan = {
        id: 'plan-null-engine', goal: '空引擎测试',
        steps: [{ id: 's1', description: '创造技能', skill: 'missing-skill', status: 'pending', retries: 0, maxRetries: 0 }],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('completed');
      expect(execFn).toHaveBeenCalled();
    });

    it('技能不存在且空引擎创造失败时应抛错', async () => {
      const skills = new Map<string, Skill>();
      const skillLoader = makeSkillLoaderMock(skills);
      const engine = buildEngine({ skillLoader });
      await engine.initialize();

      (engine as any).nullEngine = {
        createSkill: jest.fn(async () => ({ success: false, skill: null })),
      };

      const plan: TaskPlan = {
        id: 'plan-null-fail', goal: '空引擎失败测试',
        steps: [{ id: 's1', description: '失败', skill: 'missing-skill', status: 'pending', retries: 0, maxRetries: 0 }],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('failed');
      expect(plan.steps[0].status).toBe('error');
    });

    it('工具不存在时应抛错（不触发空引擎）', async () => {
      const mcp = makeMcpMock();
      const engine = buildEngine({ mcp });
      await engine.initialize();

      const plan: TaskPlan = {
        id: 'plan-tool-fail', goal: '工具失败测试',
        steps: [{ id: 's1', description: '工具步骤', tool: 'missing-tool', status: 'pending', retries: 0, maxRetries: 0 }],
        priority: 2, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      };
      (engine as any).plans.set(plan.id, plan);

      const result = await engine.executePlan(plan.id);
      expect(result.status).toBe('failed');
      expect(plan.steps[0].error).toContain('未注册');
    });
  });
});
