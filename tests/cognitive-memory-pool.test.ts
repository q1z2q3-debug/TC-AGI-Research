import { TritVector, TritVectorOps, TOTAL_NUM, COG_OFFSET } from '../src/cognitive/trit-vector';
import { CogMemoryPool } from '../src/cognitive/cognitive-memory-pool';
import { CognitiveSpace } from '../src/cognitive/cognitive-space';
import { CognitiveDistance } from '../src/cognitive/distance';
import { getCogConfig, updateCogConfig, resetCogConfig } from '../src/cognitive/cog-config';
import * as fs from 'fs';
import * as path from 'path';

describe('平衡三进制 CogID 编解码', () => {
  test('全量 19683 点位编解码双向可逆', () => {
    for (let id = 0; id < TOTAL_NUM; id++) {
      const vec = TritVectorOps.fromCogID(id);
      const backId = TritVectorOps.toCogID(vec);
      expect(backId).toBe(id);
    }
  });

  test('边界值：全阴 → ID=0', () => {
    const allNeg = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1] as any);
    expect(TritVectorOps.toCogID(allNeg)).toBe(0);
    const back = TritVectorOps.fromCogID(0);
    expect(TritVectorOps.toArray(back).every(v => v === -1)).toBe(true);
  });

  test('边界值：全和 → ID=9841', () => {
    expect(TritVectorOps.toCogID(TritVectorOps.zero())).toBe(COG_OFFSET);
    const back = TritVectorOps.fromCogID(COG_OFFSET);
    expect(TritVectorOps.toArray(back).every(v => v === 0)).toBe(true);
  });

  test('边界值：全阳 → ID=19682', () => {
    const allPos = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1] as any);
    expect(TritVectorOps.toCogID(allPos)).toBe(TOTAL_NUM - 1);
    const back = TritVectorOps.fromCogID(TOTAL_NUM - 1);
    expect(TritVectorOps.toArray(back).every(v => v === 1)).toBe(true);
  });

  test('负数区间解码：单维阴', () => {
    const v = TritVectorOps.fromArray([0, 0, 0, 0, 0, 0, 0, 0, -1] as any);
    const id = TritVectorOps.toCogID(v);
    expect(id).toBe(COG_OFFSET - 1);
    const back = TritVectorOps.fromCogID(id);
    expect(back.effect).toBe(-1);
  });

  test('非法 ID 抛出错误', () => {
    expect(() => TritVectorOps.fromCogID(TOTAL_NUM)).toThrow();
    expect(() => TritVectorOps.fromCogID(-1)).toThrow();
  });
});

describe('认知算子：融合 / 极端 / 中和 / 偏差', () => {
  test('阴阳和合融合：阳+阴=和', () => {
    const a = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    const b = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    const c = TritVectorOps.merge(a, b);
    expect(c.past).toBe(0);
  });

  test('融合：阳+阳=阳，阴+阴=阴', () => {
    const a = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    expect(TritVectorOps.merge(a, a).past).toBe(1);
    const b = TritVectorOps.fromArray([-1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    expect(TritVectorOps.merge(b, b).past).toBe(-1);
  });

  test('对立向量融合全和', () => {
    const pos = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1] as any);
    const neg = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1] as any);
    const merged = TritVectorOps.merge(pos, neg);
    expect(TritVectorOps.toArray(merged).every(v => v === 0)).toBe(true);
  });

  test('极端认知检测', () => {
    const extreme = TritVectorOps.fromArray([1, 1, 1, -1, -1, -1, 1, 1, -1] as any);
    expect(TritVectorOps.isExtreme(extreme, 6)).toBe(true);
    expect(TritVectorOps.isExtreme(extreme, 9)).toBe(true);
    expect(TritVectorOps.isExtreme(TritVectorOps.zero(), 1)).toBe(false);
  });

  test('原点偏差距离', () => {
    expect(TritVectorOps.biasToOrigin(TritVectorOps.zero())).toBe(0);
    const allPos = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1] as any);
    expect(TritVectorOps.biasToOrigin(allPos)).toBe(3); // sqrt(9) = 3
  });

  test('与原点中和', () => {
    const v = TritVectorOps.fromArray([1, -1, 0, 1, 0, -1, 0, 1, -1] as any);
    const neutralized = TritVectorOps.neutralizeWithOrigin(v);
    // 阳+和=阳，阴+和=阴，和+和=和 → 中和后保持原值
    expect(TritVectorOps.equals(neutralized, v)).toBe(true);
  });
});

describe('认知记忆池', () => {
  let pool: CogMemoryPool;

  beforeEach(() => {
    pool = new CogMemoryPool();
  });

  test('写入与读取', () => {
    const vec = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1] as any);
    pool.write(vec, '测试认知', 0.8);
    expect(pool.Count).toBe(1);
    const node = pool.read(vec);
    expect(node).not.toBeNull();
    expect(node!.text).toBe('测试认知');
    expect(node!.score).toBe(0.8);
  });

  test('覆盖写入不增加计数', () => {
    const vec = TritVectorOps.zero();
    pool.write(vec, '第一版', 0.5);
    pool.write(vec, '第二版', 0.9);
    expect(pool.Count).toBe(1);
    expect(pool.read(vec)!.text).toBe('第二版');
  });

  test('按 ID 写入与读取', () => {
    expect(pool.writeByID(COG_OFFSET, '原点认知', 1.0)).toBe(true);
    expect(pool.readByID(COG_OFFSET)!.text).toBe('原点认知');
    expect(pool.writeByID(TOTAL_NUM, '非法', 0.5)).toBe(false);
  });

  test('删除', () => {
    const vec = TritVectorOps.zero();
    pool.write(vec, '待删除', 0.5);
    pool.delete(vec);
    expect(pool.Count).toBe(0);
    expect(pool.has(vec)).toBe(false);
  });

  test('TopK 召回', () => {
    const near = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    const mid = TritVectorOps.fromArray([1, 1, 0, 0, 0, 0, 0, 0, 0] as any);
    const far = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1] as any);
    pool.write(near, '近', 0.5);
    pool.write(mid, '中', 0.5);
    pool.write(far, '远', 0.5);

    const results = pool.searchTopK(TritVectorOps.zero(), 2);
    expect(results.length).toBe(2);
    expect(results[0].text).toBe('近');
  });

  test('空池召回返回空数组', () => {
    expect(pool.searchTopK(TritVectorOps.zero(), 3)).toEqual([]);
  });

  test('K 大于已写入数量', () => {
    pool.write(TritVectorOps.zero(), '唯一', 0.5);
    expect(pool.searchTopK(TritVectorOps.zero(), 10).length).toBe(1);
  });

  test('统计信息', () => {
    pool.write(TritVectorOps.zero(), 'a', 0.5);
    pool.write(TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any), 'b', 1.0);
    const stats = pool.getStats();
    expect(stats.totalNodes).toBe(2);
    expect(stats.capacity).toBe(TOTAL_NUM);
    expect(stats.avgScore).toBe(0.75);
  });

  test('快照保存与加载', () => {
    const tmpFile = path.join('/tmp', `cog_test_${Date.now()}.json`);
    pool.write(TritVectorOps.zero(), '原点', 1.0);
    pool.write(TritVectorOps.fromArray([1, 1, 0, 0, 0, 0, 0, 0, 0] as any), '扩张', 0.5);

    pool.saveSnapshot(tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);

    const pool2 = new CogMemoryPool();
    pool2.loadSnapshot(tmpFile);
    expect(pool2.Count).toBe(2);
    expect(pool2.read(TritVectorOps.zero())!.text).toBe('原点');

    fs.unlinkSync(tmpFile);
  });

  test('清空', () => {
    pool.write(TritVectorOps.zero(), 'a', 0.5);
    pool.clear();
    expect(pool.Count).toBe(0);
  });
});

describe('认知收敛检测', () => {
  beforeEach(() => resetCogConfig());

  test('零向量收敛', () => {
    expect(CognitiveDistance.isConverged(TritVectorOps.zero())).toBe(true);
  });

  test('3维阳（偏差=√3≈1.73）收敛', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, 0, 0, 0] as any);
    expect(CognitiveDistance.isConverged(v)).toBe(true);
  });

  test('7维阳（偏差=√7≈2.65）未收敛', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 0, 0] as any);
    expect(CognitiveDistance.isConverged(v)).toBe(false);
  });

  test('收敛状态详情', () => {
    const status = CognitiveDistance.convergenceStatus(TritVectorOps.zero());
    expect(status.converged).toBe(true);
    expect(status.bias).toBe(0);
    expect(status.threshold).toBe(2.5);
  });
});

describe('认知空间钩子集成', () => {
  let space: CognitiveSpace;
  let pool: CogMemoryPool;

  beforeEach(() => {
    resetCogConfig();
    pool = new CogMemoryPool();
    space = new CognitiveSpace(pool);
  });

  test('前置钩子：极端认知中和', () => {
    const extremeInput = '未来 现在 过去 世界 环境 自己 内心 因为 所以 条件 资源 结果 成果 实现';
    const out = space.preStep(extremeInput);
    // 应该检测到极端并中和
    expect(out.isExtreme).toBe(true);
  });

  test('前置钩子：记忆召回', () => {
    const vec = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    pool.write(vec, '历史经验：过去数据分析方法', 0.5);
    const out = space.preStep('回顾过去的经验');
    expect(out.supplement).toContain('历史认知');
  });

  test('前置钩子：未收敛生成反思指令', () => {
    const extreme = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1] as any);
    pool.write(extreme, '极端输入', 0.5);
    const out = space.preStep('未来 现在 过去 世界 环境 自己 内心 因为 所以 条件 资源 结果 成果 实现');
    if (!out.isConverged) {
      expect(out.needsReflection).toBe(true);
      expect(out.reflectionPrompt).toContain('认知空间未收敛');
    }
  });

  test('后置钩子：结果写入记忆池', () => {
    space.postStep('分析完成，已产出方案', 1.0);
    expect(pool.Count).toBeGreaterThan(0);
  });

  test('双重终止校验：业务完成+认知收敛 → 可终止', () => {
    // 零向量收敛
    const result = space.checkTermination(true);
    expect(result.canTerminate).toBe(true);
    expect(result.businessDone).toBe(true);
    expect(result.cogConverged).toBe(true);
  });

  test('双重终止校验：业务未完成 → 不可终止', () => {
    const result = space.checkTermination(false);
    expect(result.canTerminate).toBe(false);
  });
});

describe('动态配置', () => {
  beforeEach(() => resetCogConfig());

  test('默认配置', () => {
    const cfg = getCogConfig();
    expect(cfg.eWeight).toBeCloseTo(Math.E);
    expect(cfg.piWeight).toBeCloseTo(Math.PI);
    expect(cfg.convergeThreshold).toBe(2.5);
    expect(cfg.extremeThreshold).toBe(7);
    expect(cfg.topKNum).toBe(3);
  });

  test('更新配置影响加权距离', () => {
    const a = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0] as any);
    const b = TritVectorOps.zero();
    const d1 = CognitiveDistance.weighted(a, b);

    updateCogConfig({ eWeight: 10 });
    const d2 = CognitiveDistance.weighted(a, b);
    expect(d2).toBeGreaterThan(d1);
  });

  test('更新收敛阈值', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 0, 0, 0, 0, 0, 0] as any); // bias=√3≈1.73
    expect(CognitiveDistance.isConverged(v)).toBe(true);
    updateCogConfig({ convergeThreshold: 1.0 });
    expect(CognitiveDistance.isConverged(v)).toBe(false);
  });
});
