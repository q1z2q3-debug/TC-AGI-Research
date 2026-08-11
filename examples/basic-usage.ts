/**
 * TC-AGI 端到端示例：研究课题拆解与执行
 * ─────────────────────────────────────────────
 * 展示从 submitTask → 认知感知 → 策略派生 → 4步执行 → 进化复盘的完整流程。
 *
 * 运行方式：
 *   npx ts-node examples/basic-usage.ts
 *
 * 无需 API Key（使用规则回退路径，不依赖 LLM）。
 */

import { getDefaultAGI } from '../src/integration';

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  TC-AGI 端到端示例：研究课题拆解');
  console.log('═══════════════════════════════════════════════\n');

  // 1. 初始化 AGI 生命体
  console.log('【1/5】初始化 AGI 生命体...');
  const agi = getDefaultAGI();
  await agi.start();
  console.log('  ✓ 四层架构已启动（意识形态→认知空间→研究引擎→生命体实例）\n');

  // 2. 提交研究任务
  const task = '研究三元逻辑在人工智能决策系统中的应用前景';
  console.log('【2/5】提交研究任务：');
  console.log(`  "${task}"\n`);

  // 3. 认知感知：查看任务输入后的认知状态
  console.log('【3/5】认知感知结果：');
  const snapshot = agi.getCognitiveSnapshot();
  console.log(`  卦象索引: ${snapshot.state.hexagramIndex} / 19683`);
  console.log(`  多数态: ${snapshot.majority === 1 ? '扩张(阳)' : snapshot.majority === -1 ? '收缩(阴)' : '观察(和)'}`);
  console.log(`  π深度: ${snapshot.state.piDepth}/10`);
  console.log(`  e活性: ${(snapshot.state.eWeight * 100).toFixed(0)}%`);
  console.log(`  态势摘要: ${snapshot.state.summary}`);
  console.log(`  卦象描述: ${snapshot.hexagramDescription}\n`);

  // 4. 任务分解：引擎生成执行计划
  console.log('【4/5】任务分解（引擎生成4步计划）：');
  const components = agi.getComponents();
  const plan = await components.engine.decomposeTask(task);
  console.log(`  计划ID: ${plan.id}`);
  console.log(`  策略: ${plan.strategy.name} (模式: ${plan.strategy.mode}, 置信度: ${(plan.strategy.confidence * 100).toFixed(0)}%)`);
  console.log(`  策略来源: ${plan.strategy.source}`);
  if (plan.strategy.precisionPreset) {
    console.log(`  精度预设: ${plan.strategy.precisionPreset}`);
  }
  console.log('  执行步骤:');
  plan.steps.forEach((step, i) => {
    const dep = step.dependencies ? ` [依赖: ${step.dependencies.join(', ')}]` : '';
    const skill = step.skill ? ` [技能: ${step.skill}]` : '';
    const tool = step.tool ? ` [工具: ${step.tool}]` : '';
    console.log(`    ${i + 1}. ${step.description}${dep}${skill}${tool}`);
  });
  console.log();

  // 5. 执行计划
  console.log('【5/5】执行计划...');
  const result = await components.engine.executePlan(plan.id);
  console.log(`  执行状态: ${result.status}`);
  console.log(`  耗时: ${result.duration}ms`);
  console.log(`  结果数: ${result.results.length}`);
  if (result.errors.length > 0) {
    console.log(`  错误: ${result.errors.length} 条`);
    result.errors.forEach(e => console.log(`    - ${e}`));
  }
  console.log();

  // 6. 进化复盘后的认知状态
  console.log('───────────────────────────────────────────────');
  console.log('  进化复盘后认知状态：');
  const afterSnapshot = agi.getCognitiveSnapshot();
  console.log(`  态势摘要: ${afterSnapshot.state.summary}`);
  console.log(`  记忆总数: ${agi.getMemoryStats().total}`);
  console.log('───────────────────────────────────────────────\n');

  // 7. 主动推理演示
  console.log('  主动推理演示（基于当前认知状态）：');
  const { ActiveInference } = require('../src/cognitive/active-inference');
  const inference = ActiveInference.infer(
    afterSnapshot.state.vector,
    agi.getCognitiveSnapshot() ? [] : [],
    { precisionPreset: plan.strategy.precisionPreset || 'default' }
  );
  console.log(`  最佳行动: ${inference.bestAction}`);
  console.log(`  当前自由能: ${inference.currentFreeEnergy.toFixed(4)}`);
  console.log(`  预期自由能: ${inference.expectedFreeEnergy.toFixed(4)}`);
  console.log(`  自由能降低: ${inference.freeEnergyReduction.toFixed(4)}`);
  console.log(`  目标原型: ${inference.targetPrototype.name}`);
  console.log(`  置信度: ${(inference.confidence * 100).toFixed(0)}%\n`);

  // 关闭
  console.log('═══════════════════════════════════════════════');
  console.log('  示例完成，正在优雅关闭...');
  await agi.shutdown();
  console.log('  ✓ AGI 已关闭，记忆已持久化');
  console.log('═══════════════════════════════════════════════');
}

main().catch(err => {
  console.error('示例运行失败:', err);
  process.exit(1);
});
