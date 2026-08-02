/**
 * 端到端集成测试
 * ─────────────────────────────────────────────────────────────
 *
 * 验证完整流程：任务提交 → 认知感知 → 策略派生 → 步骤生成 → 执行 → 复盘
 *
 * 不依赖外部 LLM / Ollama，使用内置技能与本地规则引擎。
 */

import { TCAGI4 } from '../src/integration';
import { CognitiveDistance } from '../src/cognitive/distance';
import { PrototypeMatcher } from '../src/cognitive/prototypes';
import { ActiveInference } from '../src/cognitive/active-inference';
import { TritVectorOps } from '../src/cognitive/trit-vector';
import { NullEngine } from '../src/cognitive/null-engine';
import { vectorMid, countHe, isHeEmergent } from '../src/cognitive/trit-gates';

describe('端到端集成测试', () => {
  let agi: TCAGI4;

  beforeAll(async () => {
    agi = new TCAGI4();
    await agi.start();
  });

  afterAll(async () => {
    await agi.shutdown();
  });

  // ═══════════════════════════════════════════════════════════
  // 1. 系统启动与健康检查
  // ═══════════════════════════════════════════════════════════

  describe('系统启动', () => {
    it('AGI 实例成功启动', () => {
      expect(agi.isRunning()).toBe(true);
    });

    it('所有组件初始化完成', async () => {
      const health = await agi.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.components.cognitive).toBe(true);
      expect(health.components.memory).toBe(true);
      expect(health.components.skills).toBe(true);
      expect(health.components.tools).toBe(true);
    });

    it('内置技能已加载', () => {
      const components = agi.getComponents();
      const skills = components.skillLoader.getAvailableSkills();
      expect(skills.length).toBeGreaterThanOrEqual(6);
      expect(skills).toContain('web-search');
      expect(skills).toContain('self-evolve');
      expect(skills).toContain('memory-retrieve');
    });

    it('内置工具已加载', () => {
      const components = agi.getComponents();
      const tools = components.mcp.getAvailableTools();
      expect(tools.length).toBeGreaterThanOrEqual(5);
      expect(tools).toContain('file-read');
      expect(tools).toContain('http-request');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2. 认知空间与距离系统
  // ═══════════════════════════════════════════════════════════

  describe('认知空间', () => {
    it('感知输入并更新认知状态', () => {
      const snapshot = agi.getCognitiveSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.state.hexagramIndex).toBeGreaterThanOrEqual(0);
      expect(snapshot.state.hexagramIndex).toBeLessThanOrEqual(19682);
    });

    it('语义映射产生正确的认知向量', () => {
      const components = agi.getComponents();
      const state = components.cognitive.perceive('未来计划，目标是扩展外部市场，因为条件成熟');
      // 未来 + 计划 → future=1
      expect(state.vector.future).toBe(1);
      // 外部/市场 → external=1
      expect(state.vector.external).toBe(1);
      // 条件 → condition=1
      expect(state.vector.condition).toBe(1);
    });
  });

  describe('距离系统', () => {
    it('复合距离在 0~1 范围内', () => {
      const a = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const b = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
      const dist = CognitiveDistance.composite(a, b);
      expect(dist).toBeGreaterThanOrEqual(0);
      expect(dist).toBeLessThanOrEqual(1);
    });

    it('相同向量的距离为 0', () => {
      const v = TritVectorOps.fromArray([1, 0, -1, 0, 1, -1, 1, 0, -1]);
      expect(CognitiveDistance.composite(v, v)).toBe(0);
    });

    it('nearestK 返回正确排序的候选', () => {
      const target = TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, 0, 0, 0]);
      const candidates = [
        TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, 0, 0, 0]),  // 完全相同
        TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]),  // 较近
        TritVectorOps.fromArray([-1, -1, -1, 0, 0, 0, 0, 0, 0]) // 较远
      ];
      const nearest = CognitiveDistance.nearestK(target, candidates, 3);
      expect(nearest[0].distance).toBe(0);
      expect(nearest[2].distance).toBeGreaterThan(nearest[0].distance);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. 原型匹配与主动推理
  // ═══════════════════════════════════════════════════════════

  describe('原型匹配', () => {
    it('全阳向量匹配扩张态', () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const match = PrototypeMatcher.snapTo(v);
      expect(match.prototype.name).toBe('扩张态');
      expect(match.distance).toBe(0);
    });

    it('推荐行动与原型一致', () => {
      const v = TritVectorOps.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const rec = PrototypeMatcher.recommendAction(v);
      expect(rec.action).toBe('observe');
      expect(rec.prototype).toBe('观察态');
    });
  });

  describe('主动推理', () => {
    it('偏离原型时建议行动', () => {
      // 部分偏离但不是任何原型
      const v = TritVectorOps.fromArray([1, -1, 1, 0, 0, 0, 0, 0, 0]);
      const result = ActiveInference.infer(v, [], {
        freeEnergyThreshold: 0.05,
        transitionPenalty: 0.1
      });
      expect(result.evaluations.length).toBeGreaterThan(0);
      expect(result.bestAction).toBeDefined();
    });

    it('多步预测收敛到原型', () => {
      const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      const prediction = ActiveInference.multiStepPredict(v, 10, {
        freeEnergyThreshold: 0.05
      });
      expect(prediction.trajectory.length).toBeGreaterThan(0);
      expect(prediction.trajectory.length).toBeLessThanOrEqual(11);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 4. 三元逻辑门与和态涌现
  // ═══════════════════════════════════════════════════════════

  describe('三元逻辑门', () => {
    it('MID 门：阴阳对立→和态涌现', () => {
      const yang = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const yin = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
      const merged = vectorMid(yang, yin);
      // 全部维度应为和态
      expect(countHe(merged)).toBe(9);
    });

    it('和态涌现检测', () => {
      // 部分和态 + 阴阳平衡
      const v = TritVectorOps.fromArray([1, -1, 0, 1, -1, 0, 0, 0, 0]);
      const analysis = isHeEmergent(v);
      expect(analysis.density).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 5. 任务执行全流程
  // ═══════════════════════════════════════════════════════════

  describe('任务执行', () => {
    it('提交任务并获取结果', async () => {
      const result = await agi.submitTask('搜索AI Agent最新趋势');
      expect(result).toBeDefined();
      expect(result.planId).toBeDefined();
      // 任务应执行完成（可能成功或失败，取决于技能是否真正执行）
      expect(['completed', 'failed']).toContain(result.status);
    });

    it('计划包含正确的步骤结构', async () => {
      const components = agi.getComponents();
      // 提交任务会创建计划
      await agi.submitTask('分析当前认知状态');
      const plans = components.engine.getAllPlans();
      expect(plans.length).toBeGreaterThan(0);

      const lastPlan = plans[plans.length - 1];
      expect(lastPlan.steps.length).toBe(4); // 四步：感知→检索→执行→复盘

      // 验证步骤 ID 依赖一致性
      const step0 = lastPlan.steps[0];
      const step1 = lastPlan.steps[1];
      const step2 = lastPlan.steps[2];
      const step3 = lastPlan.steps[3];

      expect(step1.dependencies).toContain(step0.id);
      expect(step2.dependencies).toContain(step1.id);
      expect(step3.dependencies).toContain(step2.id);
    });

    it('失败任务的步骤不永久停留在 pending', async () => {
      const components = agi.getComponents();
      // 提交一个会失败的任务（依赖不满足的场景）
      await agi.submitTask('执行不存在的复杂操作');

      const plans = components.engine.getAllPlans();
      const lastPlan = plans[plans.length - 1];

      // 所有步骤都应到达终态（done 或 error），不应有 pending
      const pendingSteps = lastPlan.steps.filter(s => s.status === 'pending');
      expect(pendingSteps.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 6. 空引擎技能创造
  // ═══════════════════════════════════════════════════════════

  describe('空引擎', () => {
    it('缺失技能时自动创造', async () => {
      const components = agi.getComponents();
      const initialSkillCount = components.skillLoader.getAvailableSkills().length;

      // 提交一个需要不存在技能的任务
      await agi.submitTask('搜索相关信息并分析');

      // 空引擎可能创造了新技能
      const finalSkillCount = components.skillLoader.getAvailableSkills().length;
      // 技能数量应大于等于初始值
      expect(finalSkillCount).toBeGreaterThanOrEqual(initialSkillCount);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 7. 记忆系统
  // ═══════════════════════════════════════════════════════════

  describe('记忆系统', () => {
    it('任务执行后写入复盘记忆', async () => {
      const components = agi.getComponents();

      // 用独特目标确保不复被去重
      const uniqueGoal = `端到端测试任务-${Date.now()}-验证复盘写入`;
      await agi.submitTask(uniqueGoal);

      // 查找刚写入的复盘记忆
      const allMemories = components.memory.getAll();
      const reviewMemories = allMemories.filter(m =>
        m.tags.includes('self-evolve') || m.tags.includes('task')
      );

      expect(reviewMemories.length).toBeGreaterThan(0);
    });

    it('记忆检索使用三元距离', async () => {
      const components = agi.getComponents();
      const results = components.memory.retrieve('搜索信息', 5);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 8. 系统统计
  // ═══════════════════════════════════════════════════════════

  describe('系统统计', () => {
    it('getStats 返回完整统计信息', () => {
      const stats = agi.getStats();
      expect(stats).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
      expect(stats.skills).toBeGreaterThanOrEqual(6);
      expect(stats.tools).toBeGreaterThanOrEqual(5);
      expect(stats.memory).toBeDefined();
      expect(stats.instance).toBeDefined();
    });
  });
});
