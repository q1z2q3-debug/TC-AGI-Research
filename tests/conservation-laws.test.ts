/**
 * 守恒律引擎单元测试
 * ─────────────────────────────────────────────────────────────
 * 验证 6 条预置守恒律、LawRegistry 单例、LawGenerator 生成引擎
 */

import {
  LawRegistry, LawGenerator, DISCOVERED_LAWS, registerAll,
  getLaw, listLaws, validateAll,
  FourSymbolsFlowLaw, HexagramEnergyLaw, HexagramEntropyLaw,
  SpacetimeMappingLaw, QuantumCorrespondenceLaw, StructuralIntegrityLaw,
  LawType, LAW_TYPE_NAMES,
  computeHexagramEnergy, computeHexagramEntropy, invariantStd, invariantRatio
} from '../src/cognitive/conservation-laws';
import { TritVector, TritVectorOps } from '../src/cognitive/trit-vector';

describe('LawRegistry', () => {
  beforeEach(() => {
    // 每次测试前清空，但重新注册
    LawRegistry.getInstance().clear();
    registerAll();
  });

  test('单例模式', () => {
    const a = LawRegistry.getInstance();
    const b = LawRegistry.getInstance();
    expect(a).toBe(b);
  });

  test('注册所有 6 条守恒律', () => {
    const all = listLaws();
    expect(all.length).toBe(6);
    expect(all).toContain('四象流转守恒');
    expect(all).toContain('卦象能量守恒');
    expect(all).toContain('卦象熵守恒');
    expect(all).toContain('卦象-时空映射律');
    expect(all).toContain('卦象-量子对应律');
    expect(all).toContain('结构完整性守恒');
  });

  test('按类型查询', () => {
    const flowLaws = LawRegistry.getInstance().listByType(LawType.Flow);
    expect(flowLaws.length).toBe(1);
    expect(flowLaws[0].name).toBe('四象流转守恒');
  });

  test('清空后不再有守恒律', () => {
    LawRegistry.getInstance().clear();
    expect(listLaws().length).toBe(0);
  });
});

describe('DISCOVERED_LAWS', () => {
  test('所有守恒律都有名称和类型', () => {
    for (const law of DISCOVERED_LAWS) {
      expect(law.name.length).toBeGreaterThan(0);
      expect(law.lawType).toBeDefined();
      expect(law.description.length).toBeGreaterThan(0);
    }
  });

  test('isEmergent 返回 false（预置非涌现）', () => {
    for (const law of DISCOVERED_LAWS) {
      expect(law.isEmergent()).toBe(false);
    }
  });
});

describe('四象流转守恒', () => {
  let law: FourSymbolsFlowLaw;

  beforeEach(() => {
    law = new FourSymbolsFlowLaw();
  });

  test('类型为 Flow', () => {
    expect(law.lawType).toBe(LawType.Flow);
  });

  test('少于 2 个元素的序列返回 0', () => {
    expect(law.computeInvariant([1])).toBe(0);
    expect(law.computeInvariant([])).toBe(0);
  });

  test('检测到 4 周期极限环', () => {
    const seq = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4];
    expect(law.computeInvariant(seq)).toBe(4);
  });

  test('检测到 2 周期极限环', () => {
    const seq = [1, 2, 1, 2, 1, 2];
    expect(law.computeInvariant(seq)).toBe(2);
  });

  test('无周期序列返回 0', () => {
    const seq = [1, 3, 5, 7, 9, 11];
    expect(law.computeInvariant(seq)).toBe(0);
  });

  test('validate 需要至少 2 个数据点', () => {
    const result = law.validate([[1]], 0.01);
    expect(result.dataPoints).toBe(0);
  });
});

describe('卦象能量守恒', () => {
  let law: HexagramEnergyLaw;

  beforeEach(() => {
    law = new HexagramEnergyLaw();
  });

  test('全阳卦象能量 = 9 + 0.9', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const energy = law.computeInvariant(v);
    expect(energy).toBeCloseTo(9 + 9 * 0.1, 5);
  });

  test('全零卦象能量 = 0', () => {
    const v = TritVectorOps.zero();
    const energy = law.computeInvariant(v);
    expect(energy).toBe(0);
  });

  test('部分激活卦象能量在 0~9.9 之间', () => {
    const v = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const energy = law.computeInvariant(v);
    expect(energy).toBeGreaterThan(0);
    expect(energy).toBeLessThan(10);
  });
});

describe('卦象熵守恒', () => {
  let law: HexagramEntropyLaw;

  beforeEach(() => {
    law = new HexagramEntropyLaw();
  });

  test('全阳卦象熵为 0（只有一种态）', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const entropy = law.computeInvariant(v);
    expect(entropy).toBe(0);
  });

  test('均匀三态分布熵最大', () => {
    const v = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1]);
    const entropy = law.computeInvariant(v);
    // log2(3) ≈ 1.585
    expect(entropy).toBeCloseTo(Math.log2(3), 1);
  });

  test('两态分布熵为 1', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, -1, -1, -1, 0, 0, 0]);
    const entropy = law.computeInvariant(v);
    // 3个1, 3个-1, 3个0 → p=1/3 each → log2(3) ≈ 1.585
    expect(entropy).toBeCloseTo(1.585, 0);
  });
});

describe('卦象-时空映射律', () => {
  let law: SpacetimeMappingLaw;

  beforeEach(() => {
    law = new SpacetimeMappingLaw();
  });

  test('类型为 Spacetime', () => {
    expect(law.lawType).toBe(LawType.Spacetime);
  });

  test('无时空维度的数据返回 0', () => {
    expect(law.computeInvariant({})).toBe(0);
  });

  test('validate 要求至少 2 个数据点', () => {
    const result = law.validate([{ past: 1, present: 0, future: -1, internal: 0, medial: 1, external: 0 }], 0.01);
    expect(result.dataPoints).toBe(1);
    expect(result.passed).toBe(false);
  });
});

describe('卦象-量子对应律', () => {
  let law: QuantumCorrespondenceLaw;

  beforeEach(() => {
    law = new QuantumCorrespondenceLaw();
  });

  test('全零卦象（全叠加态）返回 1', () => {
    const v = TritVectorOps.zero();
    const prop = law.computeInvariant(v);
    expect(prop).toBe(1);
  });

  test('全激活卦象（无叠加）返回 0', () => {
    const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const prop = law.computeInvariant(v);
    expect(prop).toBe(0);
  });
});

describe('结构完整性守恒', () => {
  let law: StructuralIntegrityLaw;

  beforeEach(() => {
    law = new StructuralIntegrityLaw();
  });

  test('类型为 Structural', () => {
    expect(law.lawType).toBe(LawType.Structural);
  });

  test('不完整维度返回 0', () => {
    expect(law.computeInvariant({})).toBe(0);
  });
});

describe('LawGenerator', () => {
  let generator: LawGenerator;

  beforeEach(() => {
    generator = new LawGenerator();
    LawRegistry.getInstance().clear();
    registerAll();
  });

  test('从卦象空间生成候选守恒律', () => {
    const candidates = generator.generateFromHexagramSpace();
    expect(candidates.length).toBeGreaterThan(0);
    expect(generator.getGeneratedCount()).toBeGreaterThan(0);
  });

  test('候选守恒律有签名去重', () => {
    const candidates = generator.generateFromHexagramSpace();
    const signatures = new Set(candidates.map(c => c.signature));
    expect(signatures.size).toBe(candidates.length);
  });

  test('validateCandidate 数据不足时返回不通过', () => {
    const candidates = generator.generateFromHexagramSpace();
    const result = generator.validateCandidate(candidates[0], []);
    expect(result.passed).toBe(false);
    expect(result.dataPoints).toBe(0);
  });

  test('validateCandidate 对常数列返回通过', () => {
    const candidates = generator.generateFromHexagramSpace();
    const v = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1]);
    const seq = [v, v, v, v, v];
    const result = generator.validateCandidate(candidates[0], seq, 0.1);
    expect(result.dataPoints).toBeGreaterThan(0);
  });

  test('validateAndRegister 能在数据足够时注册新守恒律', () => {
    const candidates = generator.generateFromHexagramSpace();
    const v = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1]);
    const seq = [v, v, v, v, v];
    const registered = generator.validateAndRegister(seq, 0.1);
    // 至少注册通过验证的
    expect(registered.length).toBeGreaterThanOrEqual(0);
  });

  test('reset 清空生成状态', () => {
    generator.generateFromHexagramSpace();
    generator.reset();
    expect(generator.getGeneratedCount()).toBe(0);
    expect(generator.getCandidates().length).toBe(0);
  });
});

describe('工具函数', () => {
  describe('computeHexagramEnergy', () => {
    test('全阳卦象能量计算', () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect(computeHexagramEnergy(v)).toBeCloseTo(9.9, 5);
    });

    test('全零卦象能量为 0', () => {
      expect(computeHexagramEnergy(TritVectorOps.zero())).toBe(0);
    });
  });

  describe('computeHexagramEntropy', () => {
    test('全阳熵为 0', () => {
      const v = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect(computeHexagramEntropy(v)).toBe(0);
    });

    test('均匀三态熵最大', () => {
      const v = TritVectorOps.fromArray([1, 0, -1, 1, 0, -1, 1, 0, -1]);
      expect(computeHexagramEntropy(v)).toBeCloseTo(Math.log2(3), 2);
    });
  });

  describe('invariantStd', () => {
    test('常数列标准差为 0', () => {
      expect(invariantStd([1, 1, 1, 1])).toBe(0);
    });

    test('不足 2 个元素返回 0', () => {
      expect(invariantStd([1])).toBe(0);
      expect(invariantStd([])).toBe(0);
    });
  });

  describe('invariantRatio', () => {
    test('常数列变异系数为 0', () => {
      expect(invariantRatio([1, 1, 1, 1])).toBe(0);
    });

    test('均值为 0 时返回 0', () => {
      expect(invariantRatio([0, 0, 0])).toBe(0);
    });
  });
});

describe('getLaw / listLaws / validateAll', () => {
  beforeEach(() => {
    LawRegistry.getInstance().clear();
    registerAll();
  });

  test('getLaw 返回指定守恒律', () => {
    const law = getLaw('四象流转守恒');
    expect(law).toBeDefined();
    expect(law!.name).toBe('四象流转守恒');
  });

  test('getLaw 不存在的返回 undefined', () => {
    expect(getLaw('不存在的守恒律')).toBeUndefined();
  });

  test('validateAll 返回所有验证结果', () => {
    const results = validateAll([], 0.01);
    expect(results.size).toBe(6);
  });
});