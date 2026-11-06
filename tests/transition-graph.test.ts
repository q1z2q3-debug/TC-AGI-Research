/**
 * P1 认知转移图测试
 * 验证：转移学习、PageRank 吸引子、相区发现、S* 落地、原型可证伪对比
 */
import { TransitionGraph, FULL_SPACE_SIZE } from '../src/cognitive/transition-graph';
import { TritVectorOps, TritVector } from '../src/cognitive/trit-vector';
import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { PROTOTYPES } from '../src/cognitive/prototypes';

const expandIdx = TritVectorOps.toHexagramIndex(PROTOTYPES[0].vector);   // 扩张态 全+1 → 19682
const contractIdx = TritVectorOps.toHexagramIndex(PROTOTYPES[1].vector); // 收缩态 全-1 → 0
const observeIdx = TritVectorOps.toHexagramIndex(PROTOTYPES[2].vector);  // 观察态 全0 → 9841

/** 构造循环轨迹：观察 → 扩张 → 观察 → 收缩 → …（含自环驻留） */
function cyclicTrajectory(rounds: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < rounds; i++) {
    seq.push(observeIdx, observeIdx, expandIdx, observeIdx, contractIdx);
  }
  return seq;
}

describe('P1 TransitionGraph 认知转移图', () => {
  test('记录轨迹后 S* 稀疏子流形远小于全空间', () => {
    const g = new TransitionGraph();
    g.recordTrajectory(cyclicTrajectory(10));

    const sub = g.getSubmanifold();
    expect(sub.total).toBe(FULL_SPACE_SIZE);
    expect(sub.size).toBe(3); // 只访问了 3 个状态
    expect(sub.sparsityRatio).toBeLessThan(0.001);
  });

  test('PageRank 平稳分布收敛且吸引子为循环中心（观察态）', () => {
    const g = new TransitionGraph();
    g.recordTrajectory(cyclicTrajectory(20));

    const pr = g.pagerank();
    let sum = 0;
    for (const v of pr.values()) sum += v;
    expect(sum).toBeCloseTo(1, 6);

    const attractors = g.findAttractors(3);
    expect(attractors[0].hexagramIndex).toBe(observeIdx); // 观察态是枢纽
    expect(attractors[0].pagerank).toBeGreaterThan(attractors[1].pagerank);
  });

  test('驻留强度：连续停留产生自环', () => {
    const g = new TransitionGraph();
    // 观察态连续停留 5 步
    g.recordTrajectory([observeIdx, observeIdx, observeIdx, observeIdx, observeIdx, expandIdx]);
    const attractors = g.findAttractors(2);
    const obs = attractors.find(a => a.hexagramIndex === observeIdx)!;
    expect(obs.dwellRatio).toBeGreaterThan(0.5);
  });

  test('相区发现：两个不连通循环 → 两个社区', () => {
    const g = new TransitionGraph();
    // 社区 A：观察↔扩张循环
    for (let i = 0; i < 10; i++) g.recordTrajectory([observeIdx, expandIdx, observeIdx]);
    // 社区 B：另一对状态循环（过去阳/过去阴）
    const bIdx1 = TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]));
    const bIdx2 = TritVectorOps.toHexagramIndex(TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0]));
    for (let i = 0; i < 10; i++) g.recordTrajectory([bIdx1, bIdx2, bIdx1]);

    const communities = g.detectCommunities();
    expect(communities.length).toBe(2);
    const sizes = communities.map(c => c.size).sort();
    expect(sizes).toEqual([2, 2]); // 社区A={观察,扩张}，社区B={bIdx1,bIdx2}
  });

  test('原型可证伪对比：轨迹覆盖扩张/收缩/观察原型', () => {
    const g = new TransitionGraph();
    g.recordTrajectory(cyclicTrajectory(10));

    const cmp = g.compareWithPrototypes(5);
    const names = cmp.prototypeCoverage.map(p => p.name);
    expect(names).toContain('扩张态');
    expect(names).toContain('收缩态');
    expect(names).toContain('观察态');
    // 三个原型被精确访问（距离 0）
    const covered = cmp.prototypeCoverage.filter(p => p.visited).map(p => p.name);
    expect(covered).toEqual(expect.arrayContaining(['扩张态', '收缩态', '观察态']));
    expect(typeof cmp.supported).toBe('boolean');
    expect(cmp.summary.length).toBeGreaterThan(0);
  });

  test('空图边界：无崩溃', () => {
    const g = new TransitionGraph();
    expect(g.pagerank().size).toBe(0);
    expect(g.findAttractors()).toEqual([]);
    expect(g.detectCommunities()).toEqual([]);
    expect(g.getSubmanifold().size).toBe(0);
    expect(g.compareWithPrototypes().supported).toBe(false);
  });

  test('CognitiveSpace 集成：启用后 update 自动记录转移', () => {
    const space = new CognitiveSpace();
    const graph = space.enableTransitionGraph();
    space.perceive('回顾历史经验');
    space.perceive('制定未来计划');
    space.perceive('回顾历史经验');

    expect(space.getTransitionGraph()).toBe(graph);
    expect(graph.transitions).toBeGreaterThanOrEqual(3);
    expect(graph.nodeCount).toBeGreaterThanOrEqual(2);
    const sub = graph.getSubmanifold();
    expect(sub.sparsityRatio).toBeLessThan(0.01);
  });
});
