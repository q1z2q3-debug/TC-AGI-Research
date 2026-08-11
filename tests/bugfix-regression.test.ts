import { TritVectorOps } from '../src/cognitive/trit-vector';
import { tritMid } from '../src/cognitive/trit-gates';

/**
 * 回归测试：修复两个"核心卖点"bug
 * 1. shengLift→roundFromSheng 往返不再坍缩（扩张态 +1×9 必须还原为自身）
 * 2. tritMid 文档真值表与实现/测试一致（0 是吸收元）
 */
describe('bugfix: shengLift/roundFromSheng round-trip', () => {
  test('全+1 扩张态往返不坍缩（旧bug: 坍缩为全零）', () => {
    const expansion = TritVectorOps.fromArray([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const lifted = TritVectorOps.shengLift(expansion);
    const back = TritVectorOps.roundFromSheng(lifted.position, lifted.nonzeroMask);
    expect(TritVectorOps.equals(back, expansion)).toBe(true);
  });

  test('全-1 收缩态往返不坍缩', () => {
    const contraction = TritVectorOps.fromArray([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
    const lifted = TritVectorOps.shengLift(contraction);
    const back = TritVectorOps.roundFromSheng(lifted.position, lifted.nonzeroMask);
    expect(TritVectorOps.equals(back, contraction)).toBe(true);
  });

  test('混合向量（含0维）往返一致', () => {
    const mixed = TritVectorOps.fromArray([1, -1, 0, 1, 0, -1, 0, 1, 0]);
    const lifted = TritVectorOps.shengLift(mixed);
    const back = TritVectorOps.roundFromSheng(lifted.position, lifted.nonzeroMask);
    expect(TritVectorOps.equals(back, mixed)).toBe(true);
  });

  test('零向量保持 void', () => {
    const zero = TritVectorOps.zero();
    const lifted = TritVectorOps.shengLift(zero);
    expect(lifted.isVoid).toBe(true);
  });

  test('无掩码时自适应阈值：单分量向量还原', () => {
    const single = TritVectorOps.fromArray([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const lifted = TritVectorOps.shengLift(single);
    const back = TritVectorOps.roundFromSheng(lifted.position);
    expect(TritVectorOps.equals(back, single)).toBe(true);
  });

  test('shengLift 新增 nonzeroMask 字段不破坏既有调用方', () => {
    const v = TritVectorOps.fromArray([1, 0, -1, 0, 0, 0, 1, 0, 0]);
    const lifted = TritVectorOps.shengLift(v);
    // 既有调用方只依赖 position + isVoid
    expect(lifted.position).toHaveLength(9);
    expect(typeof lifted.isVoid).toBe('boolean');
    expect(lifted.nonzeroMask.filter(Boolean)).toHaveLength(3);
  });
});

describe('bugfix: tritMid 文档与实现一致（0 吸收元）', () => {
  test('对立输入 → 和态涌现', () => {
    expect(tritMid(-1, 1)).toBe(0);
    expect(tritMid(1, -1)).toBe(0);
  });

  test('含 0 → 0 吸收（文档已修正，与实现/测试一致）', () => {
    expect(tritMid(-1, 0)).toBe(0);
    expect(tritMid(0, -1)).toBe(0);
    expect(tritMid(0, 1)).toBe(0);
    expect(tritMid(1, 0)).toBe(0);
    expect(tritMid(0, 0)).toBe(0);
  });

  test('同向保持', () => {
    expect(tritMid(-1, -1)).toBe(-1);
    expect(tritMid(1, 1)).toBe(1);
  });
});
