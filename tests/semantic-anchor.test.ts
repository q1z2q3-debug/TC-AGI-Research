/**
 * P0 语义锚点投影测试
 * 验证三级回退链：embedding锚点 → LLM → 关键词规则
 */
import { AnchorProjector, TritExtractor } from '../src/cognitive/semantic-anchor';
import { EmbeddingProvider, cosineSimilarity } from '../src/cognitive/embedding';
import { TritVectorJSON } from '../src/cognitive/semantic';
import { CognitiveSpace } from '../src/cognitive/cognitive-space';

/** 确定性伪嵌入：将文本映射为基于字符特征的 16 维向量。
 *  包含共享子串/关键词的文本会有更高余弦相似度。 */
class FakeEmbedding implements EmbeddingProvider {
  async embed(text: string): Promise<number[] | null> {
    const vec = new Array(16).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      vec[code % 16] += 1;
      vec[(code >> 4) % 16] += 0.5;
    }
    return vec;
  }
}

/** 总是失败的嵌入（测试回退链） */
class NullEmbedding implements EmbeddingProvider {
  async embed(): Promise<number[] | null> {
    return null;
  }
}

class FakeLLM implements TritExtractor {
  async extractTritVector(input: string): Promise<TritVectorJSON | null> {
    if (input.includes('失败')) return null;
    return {
      past: 0, present: 1, future: 1,
      internal: 1, medial: 0, external: 0,
      cause: 1, condition: 1, effect: 0
    };
  }
}

describe('P0 AnchorProjector 语义锚点投影', () => {
  test('embedding 路径：与锚点语义相近的输入激活对应维度', async () => {
    const projector = new AnchorProjector({ embedding: new FakeEmbedding() });
    const ready = await projector.initialize();
    expect(ready).toBe(true);
    expect(projector.embeddingReady).toBe(true);

    // 与未来锚点高度相似的输入
    const result = await projector.project('未来计划目标愿景规划');
    expect(result.source).toBe('embedding');
    expect(result.scores).not.toBeNull();
    // future 维度的正锚点相似度应显著高于其他维度
    expect(result.scores!.future.pos).toBeGreaterThan(0.5);
    expect(result.vector.future).toBe(1);
  });

  test('embedding 失败时回退到 LLM 路径', async () => {
    const projector = new AnchorProjector({
      embedding: new NullEmbedding(),
      llm: new FakeLLM()
    });
    const ready = await projector.initialize();
    expect(ready).toBe(false);

    const result = await projector.project('普通输入');
    expect(result.source).toBe('llm');
    expect(result.vector.future).toBe(1);
    expect(result.vector.cause).toBe(1);
  });

  test('embedding 与 LLM 均失败时回退到关键词规则', async () => {
    const projector = new AnchorProjector({
      embedding: new NullEmbedding(),
      llm: new FakeLLM()
    });
    // FakeLLM 对含"失败"的输入返回 null → 触发规则兜底
    const result = await projector.project('制定未来计划（LLM失败）');
    expect(result.source).toBe('rules');
    expect(result.vector.future).toBe(1); // 关键词"未来|计划"命中
  });

  test('无外部依赖时规则路径永远可用', async () => {
    const projector = new AnchorProjector();
    const result = await projector.project('回顾历史经验');
    expect(result.source).toBe('rules');
    expect(result.vector.past).toBe(1);
  });

  test('getLastResult 记录最近一次投影', async () => {
    const projector = new AnchorProjector();
    await projector.project('测试');
    expect(projector.getLastResult()).not.toBeNull();
    expect(projector.getLastResult()!.source).toBe('rules');
  });
});

describe('P0 CognitiveSpace.perceiveDeep 集成', () => {
  test('未注入投影器时 perceiveDeep 退化为同步 perceive', async () => {
    const space = new CognitiveSpace();
    const sync = space.perceive('制定未来计划与目标');
    space.reset();
    const deep = await space.perceiveDeep('制定未来计划与目标');
    expect(deep.vector).toEqual(sync.vector);
    expect(deep.hexagramIndex).toBe(sync.hexagramIndex);
  });

  test('注入投影器后 perceiveDeep 走投影链路并更新状态', async () => {
    const space = new CognitiveSpace();
    const projector = new AnchorProjector({ llm: new FakeLLM() });
    space.setProjector(projector);
    expect(space.hasProjector).toBe(true);

    const state = await space.perceiveDeep('任意文本');
    expect(state.vector.future).toBe(1); // 来自 FakeLLM
    expect(state.vector.internal).toBe(1);
    expect(space.getHistory().length).toBeGreaterThan(0);
  });
});
