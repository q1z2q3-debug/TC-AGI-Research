import { NullEngine } from '../src/cognitive/null-engine';
import { Skill } from '../src/skills/skill-loader';

describe('NullEngine', () => {
  function createMockDeps() {
    const skills = new Map<string, Skill>();
    const memories: any[] = [];

    return {
      deps: {
        registerSkill: (skill: Skill) => { skills.set(skill.name, skill); },
        hasSkill: (name: string) => skills.has(name),
        saveMemory: async (memory: any) => { memories.push(memory); return memory; },
        retrieveMemory: (_query: string, _limit?: number) => memories,
      } as any,
      skills,
      memories
    };
  }

  test('createSkill: 成功创造技能', async () => {
    const { deps, skills, memories } = createMockDeps();
    const engine = new NullEngine(deps);

    const result = await engine.createSkill({
      missingSkillName: 'test-search',
      goal: '搜索互联网获取信息',
      stepDescription: '执行搜索操作',
      parameters: { query: 'test' }
    });

    expect(result.success).toBe(true);
    expect(result.skill).not.toBeNull();
    expect(result.skill!.name).toBe('test-search');
    expect(skills.has('test-search')).toBe(true);
    expect(memories.length).toBeGreaterThan(0); // 应写入记忆
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('createSkill: 技能可执行', async () => {
    const { deps } = createMockDeps();
    const engine = new NullEngine(deps);

    const result = await engine.createSkill({
      missingSkillName: 'test-execute',
      goal: '分析评估数据',
      stepDescription: '执行分析',
      parameters: { data: 'test' }
    });

    expect(result.success).toBe(true);
    expect(result.skill).not.toBeNull();

    const execResult = await result.skill!.execute({ goal: '分析评估数据' });
    expect(execResult.status).toBe('executed');
    expect(execResult.skill).toBe('test-execute');
  });

  test('createSkill: 已存在技能返回失败', async () => {
    const { deps, skills } = createMockDeps();
    // 预注册一个技能
    skills.set('existing-skill', {
      name: 'existing-skill',
      description: '已存在',
      instructions: '测试',
      memoryEnabled: false,
      execute: async () => ({ status: 'ok' })
    });

    const engine = new NullEngine(deps);
    const result = await engine.createSkill({
      missingSkillName: 'existing-skill',
      goal: 'test',
      stepDescription: 'test'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('已存在');
  });

  test('createSkill: 推断技能类型（搜索类）', async () => {
    const { deps } = createMockDeps();
    const engine = new NullEngine(deps);

    const result = await engine.createSkill({
      missingSkillName: 'auto-search-info',
      goal: '搜索相关信息并返回结果',
      stepDescription: '搜索',
      parameters: {}
    });

    expect(result.success).toBe(true);
    expect(result.skill!.description).toContain('搜索');
  });

  test('createSkill: 推断技能类型（分析类）', async () => {
    const { deps } = createMockDeps();
    const engine = new NullEngine(deps);

    const result = await engine.createSkill({
      missingSkillName: 'auto-analyze-data',
      goal: '分析评估给定数据',
      stepDescription: '分析',
      parameters: {}
    });

    expect(result.success).toBe(true);
    expect(result.skill!.description).toContain('分析');
  });

  test('getStats: 返回创造统计', async () => {
    const { deps } = createMockDeps();
    const engine = new NullEngine(deps);

    await engine.createSkill({ missingSkillName: 's1', goal: '搜索', stepDescription: 's' });
    await engine.createSkill({ missingSkillName: 's2', goal: '生成', stepDescription: 'g' });
    await engine.createSkill({ missingSkillName: 's1', goal: '重复', stepDescription: 'd' }); // 会失败

    const stats = engine.getStats();
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.successRate).toBeCloseTo(2 / 3, 2);
  });

  test('getCreationHistory: 返回创造历史', async () => {
    const { deps } = createMockDeps();
    const engine = new NullEngine(deps);

    await engine.createSkill({ missingSkillName: 'h1', goal: 'test', stepDescription: 't' });
    const history = engine.getCreationHistory();
    expect(history.length).toBe(1);
    expect(history[0].success).toBe(true);
  });
});
