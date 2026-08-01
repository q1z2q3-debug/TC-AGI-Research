import { contentToTritVector, contentHexagram, tritJSONToVector } from '../src/cognitive/semantic';

describe('semantic 语义坐标', () => {
  test('未来计划类文本 → future=1', () => {
    const v = contentToTritVector('制定未来计划与目标');
    expect(v.future).toBe(1);
  });

  test('风险威胁类文本 → external=-1', () => {
    const v = contentToTritVector('当前存在危机与风险威胁');
    expect(v.external).toBe(-1);
  });

  test('无关键词 → 全 0 观察态', () => {
    const v = contentToTritVector('asdfqwerty');
    expect(v).toEqual(contentToTritVector('zzz'));
  });

  test('contentHexagram 落在合法卦象范围', () => {
    const idx = contentHexagram('测试文本');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(19682);
  });

  test('同语义文本映射到确定（非随机哈希）卦象', () => {
    expect(contentHexagram('回顾历史经验')).toBe(contentHexagram('回顾历史经验'));
  });

  test('tritJSONToVector 规整非法值', () => {
    const v = tritJSONToVector({ past: 5, present: -3, future: 0 } as any);
    expect(v.past).toBe(1);
    expect(v.present).toBe(-1);
    expect(v.future).toBe(0);
  });
});
