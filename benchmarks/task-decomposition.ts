/**
 * TC-AGI 基准测试：任务分解与认知决策质量
 * ─────────────────────────────────────────────
 * 对比三种策略在一组标准化任务上的表现：
 *   A. TC-AGI 认知驱动策略（规则派生 + 主动推理）
 *   B. 随机策略（基线）
 *   C. 固定启发式（总是 expand）
 *
 * 评估维度：
 *   - 计划质量（步骤数、依赖链有效性、策略-任务匹配度）
 *   - 执行成功率
 *   - 认知状态多样性（熵）
 *   - 延迟
 *
 * 运行方式：
 *   npx ts-node benchmarks/task-decomposition.ts
 *
 * 无需 API Key（使用规则回退路径）。
 */

import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { ActiveInference } from '../src/cognitive/active-inference';
import { TritVectorOps } from '../src/cognitive/trit-vector';
import { EngineLayer } from '../src/core/engine';
import { IdeologyLayer } from '../src/core/ideology';
import { MemorySystem } from '../src/memory/memory-system';
import { SkillLoader } from '../src/skills/skill-loader';
import { MCPAdapter } from '../src/tools/mcp-adapter';
import { CronScheduler } from '../src/scheduler/cron-scheduler';

// 标准化任务集（覆盖扩张/收缩/观察三类场景）
const TASKS = [
  { goal: '制定新产品市场扩张策略', expectedMode: 'expand' },
  { goal: '分析当前系统架构的安全漏洞并修复', expectedMode: 'contract' },
  { goal: '调研大语言模型的最新研究进展', expectedMode: 'observe' },
  { goal: '设计一个高并发分布式缓存系统', expectedMode: 'expand' },
  { goal: '排查生产环境内存泄漏问题', expectedMode: 'contract' },
  { goal: '学习量子计算的基本原理', expectedMode: 'observe' },
  { goal: '规划团队下季度技术路线图', expectedMode: 'expand' },
  { goal: '优化数据库查询性能瓶颈', expectedMode: 'contract' },
  { goal: '收集用户反馈并整理需求清单', expectedMode: 'observe' },
  { goal: '从零构建一个微服务架构', expectedMode: 'expand' },
];

interface BenchmarkResult {
  strategy: string;
  tasks: TaskResult[];
  avgLatencyMs: number;
  modeMatchRate: number;
  avgSteps: number;
  dependencyValidRate: number;
  cognitiveEntropy: number;
}

interface TaskResult {
  goal: string;
  expectedMode: string;
  actualMode: string;
  stepCount: number;
  dependencyValid: boolean;
  latencyMs: number;
  freeEnergyReduction: number;
}

function createEngine(): EngineLayer {
  return new EngineLayer(
    new IdeologyLayer(),
    new CognitiveSpace(),
    new MemorySystem(),
    new SkillLoader(),
    new MCPAdapter(),
    new CronScheduler()
  );
}

/** A. TC-AGI 认知驱动策略 */
async function runTCAGIBenchmark(): Promise<TaskResult[]> {
  const engine = createEngine();
  await engine.initialize();
  const results: TaskResult[] = [];

  for (const task of TASKS) {
    const start = Date.now();
    const plan = await engine.decomposeTask(task.goal);
    const latency = Date.now() - start;

    // 验证依赖链有效性
    const stepIds = new Set(plan.steps.map(s => s.id));
    const dependencyValid = plan.steps.every(s =>
      !s.dependencies || s.dependencies.every(d => stepIds.has(d))
    );

    // 主动推理自由能降低
    const cognitive = (engine as any).cognitive as CognitiveSpace;
    const history = cognitive.getHistory().map(h => h.vector);
    let fer = 0;
    try {
      const inference = ActiveInference.infer(cognitive.getState().vector, history, {});
      fer = inference.freeEnergyReduction;
    } catch { /* ignore */ }

    results.push({
      goal: task.goal,
      expectedMode: task.expectedMode,
      actualMode: plan.strategy.mode,
      stepCount: plan.steps.length,
      dependencyValid,
      latencyMs: latency,
      freeEnergyReduction: fer,
    });
  }

  return results;
}

/** B. 随机策略基线 */
function runRandomBaseline(): TaskResult[] {
  const modes = ['expand', 'contract', 'observe'];
  return TASKS.map(task => ({
    goal: task.goal,
    expectedMode: task.expectedMode,
    actualMode: modes[Math.floor(Math.random() * 3)],
    stepCount: Math.floor(Math.random() * 5) + 1,
    dependencyValid: Math.random() > 0.3,
    latencyMs: Math.random() * 5,
    freeEnergyReduction: Math.random() * 0.1,
  }));
}

/** C. 固定启发式（总是 expand） */
function runFixedBaseline(): TaskResult[] {
  return TASKS.map(task => ({
    goal: task.goal,
    expectedMode: task.expectedMode,
    actualMode: 'expand',
    stepCount: 4,
    dependencyValid: true,
    latencyMs: 1,
    freeEnergyReduction: 0,
  }));
}

function calcCognitiveEntropy(vectors: any[]): number {
  if (vectors.length === 0) return 0;
  // 用卦象索引分布的香农熵近似认知多样性
  const counts = new Map<number, number>();
  for (const v of vectors) {
    const idx = TritVectorOps.toHexagramIndex(v);
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / vectors.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function summarize(strategy: string, results: TaskResult[]): BenchmarkResult {
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
  const matchCount = results.filter(r => r.actualMode === r.expectedMode).length;
  const avgSteps = results.reduce((s, r) => s + r.stepCount, 0) / results.length;
  const depValid = results.filter(r => r.dependencyValid).length / results.length;

  return {
    strategy,
    tasks: results,
    avgLatencyMs: avgLatency,
    modeMatchRate: matchCount / results.length,
    avgSteps,
    dependencyValidRate: depValid,
    cognitiveEntropy: 0, // 单独计算
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TC-AGI 基准测试：任务分解与认知决策质量');
  console.log('  任务集: 10 个标准化任务（扩张/收缩/观察 各 3-4 个）');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('运行 A. TC-AGI 认知驱动策略...');
  const tcagiResults = await runTCAGIBenchmark();
  const tcagiSummary = summarize('TC-AGI (认知驱动)', tcagiResults);

  // 收集 TC-AGI 产生的认知向量用于熵计算
  const engine = createEngine();
  await engine.initialize();
  const cognitive = (engine as any).cognitive as CognitiveSpace;
  for (const task of TASKS) {
    cognitive.perceive(task.goal);
  }
  tcagiSummary.cognitiveEntropy = calcCognitiveEntropy(cognitive.getHistory().map(h => h.vector));

  console.log('运行 B. 随机策略基线...');
  const randomResults = runRandomBaseline();
  const randomSummary = summarize('随机策略 (基线)', randomResults);

  console.log('运行 C. 固定启发式（总是 expand）...\n');
  const fixedResults = runFixedBaseline();
  const fixedSummary = summarize('固定启发式 (总是expand)', fixedResults);

  // 输出对比表
  console.log('─────────────────────────────────────────────────────────');
  console.log('  指标对比');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`  ${'指标'.padEnd(20)} ${'TC-AGI'.padEnd(12)} ${'随机'.padEnd(12)} ${'固定expand'}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(12)}`);
  console.log(`  ${'策略匹配率'.padEnd(20)} ${(tcagiSummary.modeMatchRate * 100).toFixed(0) + '%'.padEnd(10)} ${(randomSummary.modeMatchRate * 100).toFixed(0) + '%'.padEnd(10)} ${(fixedSummary.modeMatchRate * 100).toFixed(0)}%`);
  console.log(`  ${'平均步骤数'.padEnd(20)} ${tcagiSummary.avgSteps.toFixed(1).padEnd(12)} ${randomSummary.avgSteps.toFixed(1).padEnd(12)} ${fixedSummary.avgSteps.toFixed(1)}`);
  console.log(`  ${'依赖链有效率'.padEnd(20)} ${(tcagiSummary.dependencyValidRate * 100).toFixed(0) + '%'.padEnd(10)} ${(randomSummary.dependencyValidRate * 100).toFixed(0) + '%'.padEnd(10)} ${(fixedSummary.dependencyValidRate * 100).toFixed(0)}%`);
  console.log(`  ${'平均延迟(ms)'.padEnd(20)} ${tcagiSummary.avgLatencyMs.toFixed(1).padEnd(12)} ${randomSummary.avgLatencyMs.toFixed(1).padEnd(12)} ${fixedSummary.avgLatencyMs.toFixed(1)}`);
  console.log(`  ${'认知状态熵(bit)'.padEnd(20)} ${tcagiSummary.cognitiveEntropy.toFixed(2).padEnd(12)} ${'N/A'.padEnd(12)} N/A`);
  console.log('─────────────────────────────────────────────────────────\n');

  // 逐任务详情
  console.log('TC-AGI 逐任务详情：');
  console.log('─────────────────────────────────────────────────────────');
  for (const r of tcagiResults) {
    const match = r.actualMode === r.expectedMode ? '✓' : '✗';
    console.log(`  ${match} 期望:${r.expectedMode.padEnd(8)} 实际:${r.actualMode.padEnd(8)} 步骤:${r.stepCount} 延迟:${r.latencyMs}ms FER:${r.freeEnergyReduction.toFixed(4)}`);
    console.log(`     "${r.goal}"`);
  }
  console.log('─────────────────────────────────────────────────────────\n');

  // 结论
  console.log('结论：');
  if (tcagiSummary.modeMatchRate > randomSummary.modeMatchRate) {
    console.log(`  ✓ TC-AGI 策略匹配率 (${(tcagiSummary.modeMatchRate * 100).toFixed(0)}%) 优于随机基线 (${(randomSummary.modeMatchRate * 100).toFixed(0)}%)`);
  }
  console.log(`  ✓ TC-AGI 生成的计划依赖链有效率 ${(tcagiSummary.dependencyValidRate * 100).toFixed(0)}%`);
  console.log(`  ✓ 认知状态多样性熵: ${tcagiSummary.cognitiveEntropy.toFixed(2)} bit（越高表示认知区分度越好）`);
  console.log(`  ⚠ 注意：本基准使用规则回退路径（无 LLM），接入 LLM 后策略匹配率预期更高`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('基准测试运行失败:', err);
  process.exit(1);
});
