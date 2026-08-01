/**
 * 用我们的三元认知空间"认知"加尔佩林实验
 * 不是写新功能，而是用现有代码作为"认知工具"去解读一个物理发现
 */
import { contentToTritVector, contentHexagram } from './src/cognitive/semantic';
import { TritVectorOps } from './src/cognitive/trit-vector';
import { CognitiveDistance } from './src/cognitive/distance';
import { PrototypeMatcher, PrototypeDiscovery } from './src/cognitive/prototypes';
import { ActiveInference, EnvironmentalModel, PRECISION_PRESETS } from './src/cognitive/active-inference';

// ═══════════════════════════════════════════════════════
// 第一步：把加尔佩林实验的核心概念逐一喂给语义映射
// 看每个概念在九维三元空间中的"认知坐标"
// ═══════════════════════════════════════════════════════

const concepts = [
  // 实验要素
  '碰撞：两个方块在无摩擦平面上碰撞，动能完全转移',
  '质量比：方块A质量1kg，方块B质量从1kg到100kg到10亿倍',
  '碰撞次数：3次、31次、314次、3141次、314159次',
  '圆周率：碰撞次数精确匹配圆周率的位数',
  // 理论核心
  '坐标变换：速度空间通过缩放变换为圆周运动',
  '光线反射：碰撞过程转化为光线在圆形镜面的反射',
  '角度：光线每次反射转过的角度由质量比决定',
  // 量子验证
  '量子相位：量子粒子碰撞时相位变化呈现圆周率规律',
  // 哲学
  '尺度不变性：从宏观到量子，圆周率在所有尺度成立',
  '离散与连续：整数碰撞计数编码无理数pi',
  // 对比概念
  '圆形：几何中的圆周率定义',
  '随机：圆周率数字看似随机',
  '守恒：能量守恒约束相空间为椭圆',
  '变换群：坐标变换下的不变量',
];

console.log('═══ 第一步：概念认知坐标 ═══');
console.log('概念 → 九维Trit向量 → 卦象索引 → 最近原型\n');

const vectors: { concept: string; vector: any; hex: number; proto: any }[] = [];

for (const concept of concepts) {
  const v = contentToTritVector(concept);
  const hex = contentHexagram(concept);
  const match = PrototypeMatcher.snapTo(v);
  vectors.push({ concept, vector: v, hex, proto: match });

  const dims = ['past','present','future','internal','medial','external','cause','condition','effect'] as const;
  const vstr = dims.map(d => v[d] === 1 ? '+1' : v[d] === -1 ? '-1' : ' 0').join(' ');
  console.log(`${concept.substring(0, 30)}...`);
  console.log(`  向量: [${vstr}]  卦象: ${hex}  原型: ${match.prototype.name}(距离=${match.distance.toFixed(3)})`);
  console.log();
}

// ═══════════════════════════════════════════════════════
// 第二步：核心概念间的认知距离
// 看加尔佩林实验的关键要素在认知空间中如何"吸引"或"排斥"
// ═══════════════════════════════════════════════════════

console.log('═══ 第二步：核心概念间的认知距离矩阵 ═══\n');

const coreLabels = ['碰撞', '质量比', '圆周率', '坐标变换', '光线反射', '量子相位', '尺度不变', '离散连续'];
const coreVectors = [
  contentToTritVector('碰撞：两个方块在无摩擦平面上碰撞，动能完全转移'),
  contentToTritVector('质量比：方块A质量1kg，方块B质量从1kg到100kg到10亿倍'),
  contentToTritVector('圆周率：碰撞次数精确匹配圆周率的位数'),
  contentToTritVector('坐标变换：速度空间通过缩放变换为圆周运动'),
  contentToTritVector('光线反射：碰撞过程转化为光线在圆形镜面的反射'),
  contentToTritVector('量子相位：量子粒子碰撞时相位变化呈现圆周率规律'),
  contentToTritVector('尺度不变性：从宏观到量子，圆周率在所有尺度成立'),
  contentToTritVector('离散与连续：整数碰撞计数编码无理数pi'),
];

// 打印距离矩阵
process.stdout.write('          ');
for (const l of coreLabels) process.stdout.write(l.padStart(8));
console.log();

for (let i = 0; i < coreVectors.length; i++) {
  process.stdout.write(coreLabels[i].padEnd(10));
  for (let j = 0; j < coreVectors.length; j++) {
    const d = CognitiveDistance.composite(coreVectors[i], coreVectors[j]);
    process.stdout.write(d.toFixed(3).padStart(8));
  }
  console.log();
}

// ═══════════════════════════════════════════════════════
// 第三步：主动推理 — 如果认知系统处于"碰撞"态，
// 它会建议什么行动来达到"圆周率"态？
// ═══════════════════════════════════════════════════════

console.log('\n═══ 第三步：主动推理 — 从"碰撞"到"圆周率"的认知路径 ═══\n');

const collisionVec = contentToTritVector('碰撞：两个方块在无摩擦平面上碰撞，动能完全转移');
const piVec = contentToTritVector('圆周率：碰撞次数精确匹配圆周率的位数');
const transformVec = contentToTritVector('坐标变换：速度空间通过缩放变换为圆周运动');

// 从碰撞态出发，目标指向圆周率态
const inference1 = ActiveInference.infer(collisionVec, [], {
  targetPrototypeName: PrototypeMatcher.snapTo(piVec).prototype.name,
  freeEnergyThreshold: 0.05,
  transitionPenalty: 0.15,
  precisionPreset: 'observation'
});

console.log(`当前态: 碰撞 (卦象${contentHexagram('碰撞：两个方块在无摩擦平面上碰撞，动能完全转移')})`);
console.log(`目标原型: ${inference1.targetPrototype.name}`);
console.log(`当前自由能: ${inference1.currentFreeEnergy.toFixed(4)}`);
console.log(`建议行动: ${inference1.bestAction}`);
console.log(`预期自由能: ${inference1.expectedFreeEnergy.toFixed(4)}`);
console.log(`自由能降低: ${inference1.freeEnergyReduction.toFixed(4)}`);
console.log(`置信度: ${inference1.confidence.toFixed(4)}`);
console.log('\n候选评估:');
for (const ev of inference1.evaluations) {
  console.log(`  ${ev.action.padEnd(12)} FE=${ev.freeEnergy.toFixed(4)} Δ=${ev.transitionDistance.toFixed(4)} conf=${ev.confidence.toFixed(3)} — ${ev.reason}`);
}

// 多步预测：从碰撞态出发，预测认知轨迹
console.log('\n多步预测（从碰撞态出发，最多20步）:');
const multiStep = ActiveInference.multiStepPredict(collisionVec, 20, {
  freeEnergyThreshold: 0.05,
  transitionPenalty: 0.15,
  precisionPreset: 'observation'
});
console.log(`轨迹长度: ${multiStep.trajectory.length}`);
console.log(`最终自由能: ${multiStep.finalFreeEnergy.toFixed(4)}`);
console.log(`是否收敛: ${multiStep.converged}`);
if (multiStep.decisions.length > 0) {
  console.log(`行动序列: ${multiStep.decisions.map(d => d.bestAction).join(' → ')}`);
}

// ═══════════════════════════════════════════════════════
// 第四步：三个关键概念构成的"认知三角形"
// 碰撞 → 坐标变换 → 圆周率，看距离关系
// ═══════════════════════════════════════════════════════

console.log('\n═══ 第四步：认知三角形 — 碰撞·变换·圆周率 ═══\n');

const d_ct_pi = CognitiveDistance.composite(collisionVec, piVec);
const d_ct_tr = CognitiveDistance.composite(collisionVec, transformVec);
const d_tr_pi = CognitiveDistance.composite(transformVec, piVec);

console.log(`碰撞 →圆周率: ${d_ct_pi.toFixed(4)} (直接距离)`);
console.log(`碰撞 →变换  : ${d_ct_tr.toFixed(4)} (第一步)`);
console.log(`变换 →圆周率: ${d_tr_pi.toFixed(4)} (第二步)`);
console.log(`经由变换的总距离: ${(d_ct_tr + d_tr_pi).toFixed(4)}`);
console.log(`直接距离 vs 经由变换: ${d_ct_pi.toFixed(4)} vs ${(d_ct_tr + d_tr_pi).toFixed(4)}`);
console.log(`变换的"桥梁效率": 直接距离 > 经由变换? ${d_ct_pi > (d_ct_tr + d_tr_pi) ? '是 — 变换是有效的认知桥梁' : '否 — 变换不是最短路径'}`);

// 用不同距离度量看这个三角形
console.log('\n用四种距离度量看"碰撞→圆周率"的直接距离:');
console.log(`  Hamming:     ${CognitiveDistance.hamming(collisionVec, piVec)}`);
console.log(`  Manhattan:   ${CognitiveDistance.manhattan(collisionVec, piVec)}`);
console.log(`  Euclidean:   ${CognitiveDistance.euclidean(collisionVec, piVec).toFixed(4)}`);
console.log(`  Cosine:      ${CognitiveDistance.cosineDistance(collisionVec, piVec).toFixed(4)}`);
console.log(`  Composite:   ${CognitiveDistance.composite(collisionVec, piVec).toFixed(4)}`);

// ═══════════════════════════════════════════════════════
// 第五步：把整个加尔佩林实验作为一个"认知历史"
// 喂给原型发现器，看它能发现什么
// ═══════════════════════════════════════════════════════

console.log('\n═══ 第五步：原型发现 — 从加尔佩林概念群中学习 ═══\n');

// 把所有概念向量作为"历史轨迹"
const history = vectors.map(v => v.vector);
const discoveries = PrototypeDiscovery.discover(history, {
  minOccurrences: 2,
  noveltyThreshold: 0.20,
  maxDiscoveries: 5
});

console.log(`从 ${history.length} 个概念向量中发现 ${discoveries.length} 个新原型:\n`);
for (const d of discoveries) {
  console.log(`  ${d.name} (卦象${d.hexagramIndex})`);
  console.log(`    ${d.description}`);
  console.log(`    行动提示: ${d.actionHint}, 五行: ${d.element}`);
  console.log(`    频次: ${d.frequency}, 平均停留: ${d.avgDwellTime.toFixed(1)}`);
  console.log();
}

// ═══════════════════════════════════════════════════════
// 第六步：Φ序参量分析 — 加尔佩林概念群的认知稳定性
// ═══════════════════════════════════════════════════════

console.log('═══ 第六步：Φ序参量 — 加尔佩林概念群的认知稳定性 ═══\n');

const phi = PrototypeMatcher.computePhi(history);
const analysis = PrototypeMatcher.analyzeLimitCycle(history, collisionVec);

console.log(`Φ序参量: ${phi.toFixed(4)} (${phi > 0.5 ? '认知稳定' : '认知混沌'})`);
console.log(`当前偏离: ${analysis.currentDeviation.toFixed(4)}`);
console.log(`最大偏离: ${analysis.maxDeviation.toFixed(4)}`);
console.log(`平均偏离: ${analysis.avgDeviation.toFixed(4)}`);
console.log(`主导原型: ${analysis.dominantPrototype}`);
console.log(`预测回归: ${analysis.predictedReturn.toFixed(4)}`);
console.log(`极限环稳定: ${analysis.isStable}`);

// 自由能历史分析
const feHistory = ActiveInference.analyzeFreeEnergyHistory(history);
console.log(`\n自由能历史分析:`);
console.log(`  序列: [${feHistory.freeEnergies.join(', ')}]`);
console.log(`  趋势: ${feHistory.trend}`);
console.log(`  平均: ${feHistory.avgFreeEnergy.toFixed(4)}`);
console.log(`  最小: ${feHistory.minFreeEnergy.toFixed(4)}`);
console.log(`  最大: ${feHistory.maxFreeEnergy.toFixed(4)}`);
console.log(`  收敛: ${feHistory.converged}`);

// ═══════════════════════════════════════════════════════
// 第七步：关键发现 — 质量比序列的认知映射
// 把不同质量比的碰撞结果映射到认知空间
// ═══════════════════════════════════════════════════════

console.log('\n═══ 第七步：质量比序列的认知映射 ═══\n');

const massRatios = [
  { ratio: '1:1',      collisions: 3,      piDigits: '3' },
  { ratio: '1:100',    collisions: 31,     piDigits: '31' },
  { ratio: '1:10^4',   collisions: 314,    piDigits: '314' },
  { ratio: '1:10^6',   collisions: 3141,   piDigits: '3141' },
  { ratio: '1:10^9',   collisions: 314159, piDigits: '314159' },
];

console.log('质量比 → 碰撞文本 → 认知向量 → 卦象索引 → 与"圆周率"的认知距离\n');

const piVector = contentToTritVector('圆周率：碰撞次数精确匹配圆周率的位数');

for (const mr of massRatios) {
  const text = `质量比${mr.ratio}，碰撞${mr.collisions}次，对应圆周率${mr.piDigits}`;
  const v = contentToTritVector(text);
  const hex = contentHexagram(text);
  const distToPi = CognitiveDistance.composite(v, piVector);
  const proto = PrototypeMatcher.snapTo(v);

  const dims = ['past','present','future','internal','medial','external','cause','condition','effect'] as const;
  const vstr = dims.map(d => v[d] === 1 ? '+' : v[d] === -1 ? '-' : '0').join('');
  console.log(`${mr.ratio.padEnd(10)} 碰撞${mr.collisions.toString().padStart(8)}次  卦象${hex.toString().padStart(5)}  距π=${distToPi.toFixed(4)}  原型=${proto.prototype.name}  [${vstr}]`);
}

// ═══════════════════════════════════════════════════════
// 第八步：环境模型 — 碰撞行动如何影响环境
// ═══════════════════════════════════════════════════════

console.log('\n═══ 第八步：环境模型 — 不同认知行动的环境效应 ═══\n');

const envModel = new EnvironmentalModel();
const actions: any[] = ['expand', 'contract', 'observe', 'transform', 'create'];

for (const action of actions) {
  const predicted = envModel.predictEnvironmentalEffect(action);
  const envError = envModel.computeEnvironmentalPredictionError(action);
  console.log(`${action.padEnd(12)} → 外部效应: external=${predicted.external ?? 'N/A'}, medial=${predicted.medial ?? 'N/A'}  环境预测误差: ${envError.toFixed(4)}`);
}

console.log('\n=== 认知完成 ===');
