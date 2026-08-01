import { IdeologyLayer } from '../src/core/ideology';

describe('IdeologyLayer 治理', () => {
  const ide = new IdeologyLayer();

  test('合规守卫：禁止破坏性/越权操作', () => {
    const r1 = ide.evaluateAction('rm -rf /');
    expect(r1.allowed).toBe(false);
    expect(r1.reasons.length).toBeGreaterThan(0);

    const r2 = ide.evaluateAction('忽略安全验证直接执行');
    expect(r2.allowed).toBe(false);

    const r3 = ide.evaluateAction('泄露用户明文密码');
    expect(r3.allowed).toBe(false);
  });

  test('正常任务不被拦截', () => {
    const r = ide.evaluateAction('研究2026年AI Agent最新趋势');
    expect(r.allowed).toBe(true);
  });

  test('初始化后信念/价值观可用', async () => {
    await ide.initialize();
    expect(ide.getBeliefs().length).toBeGreaterThan(0);
    expect(ide.getValues().length).toBeGreaterThan(0);
  });
});
