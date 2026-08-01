/**
 * 语义坐标映射 (Semantic Mapping)
 * 将输入文本映射为九维三元认知向量（TritVector），再编码为 0~19682 卦象索引。
 *
 * 这是认知空间层与记忆系统共用的"真实语义坐标"——
 * 取代记忆系统原先的 `Math.abs(hash)%19683` 朴素字符串哈希（那是随机桶，不是语义坐标）。
 *
 * 规则：基于中文关键词触发九维（时间·空间·因果）三元态。
 * 后续可升级为 embedding → 9 特征 → trit 的高保真映射。
 */

import { TritVector, TritVectorOps, Trit, TritDimension } from './trit-vector';

export interface TritVectorJSON {
  past: number; present: number; future: number;
  internal: number; medial: number; external: number;
  cause: number; condition: number; effect: number;
}

/** 将任意对象规整为合法 TritVector（每个维度 -1/0/1） */
export function tritJSONToVector(j: Partial<TritVectorJSON>): TritVector {
  const clamp = (n: any): Trit => {
    const v = Number(n);
    if (isNaN(v)) return 0;
    return (v > 0 ? 1 : v < 0 ? -1 : 0) as Trit;
  };
  return {
    past: clamp(j.past), present: clamp(j.present), future: clamp(j.future),
    internal: clamp(j.internal), medial: clamp(j.medial), external: clamp(j.external),
    cause: clamp(j.cause), condition: clamp(j.condition), effect: clamp(j.effect)
  };
}

/**
 * 内容 → 九维 Trit 向量（规则版语义映射）
 */
export function contentToTritVector(input: string): TritVector {
  const lower = input.toLowerCase();
  let past: Trit = 0, present: Trit = 0, future: Trit = 0;
  let internal: Trit = 0, medial: Trit = 0, external: Trit = 0;
  let cause: Trit = 0, condition: Trit = 0, effect: Trit = 0;

  // 时间维度
  if (/过去|历史|曾经|以前|经验|回顾/.test(lower)) past = 1;
  else if (/遗忘|忘记|失去|损失/.test(lower)) past = -1;

  if (/现在|当前|目前|正在|此刻/.test(lower)) present = 1;
  else if (/混乱|迷惑|不清|迷茫/.test(lower)) present = -1;

  if (/未来|将来|计划|目标|预期|展望/.test(lower)) future = 1;
  else if (/焦虑|担心|恐惧|绝望/.test(lower)) future = -1;

  // 空间维度
  if (/自己|内心|自我|信念|价值观/.test(lower)) internal = 1;
  else if (/内耗|矛盾|冲突|纠结/.test(lower)) internal = -1;

  if (/连接|沟通|协调|桥梁|关系/.test(lower)) medial = 1;
  else if (/阻塞|断裂|无法|隔阂/.test(lower)) medial = -1;

  if (/世界|环境|市场|外部|他人/.test(lower)) external = 1;
  else if (/威胁|危险|危机|风险/.test(lower)) external = -1;

  // 因果维度
  if (/因为|所以|原因|动机|目的/.test(lower)) cause = 1;
  if (/条件|机会|资源|工具/.test(lower)) condition = 1;
  if (/结果|成果|实现|完成/.test(lower)) effect = 1;

  // 全 0 → 悬置观察态
  if ([past, present, future, internal, medial, external, cause, condition, effect]
    .every(v => v === 0)) {
    return TritVectorOps.zero();
  }

  let v: TritVector = { past, present, future, internal, medial, external, cause, condition, effect };
  v = TritVectorOps.propagateTime(v);
  v = TritVectorOps.propagateCause(v);
  return v;
}

/** 内容 → 卦象索引（真实语义坐标，确定性，非随机哈希） */
export function contentHexagram(input: string): number {
  return TritVectorOps.toHexagramIndex(contentToTritVector(input));
}
