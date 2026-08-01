/**
 * TC-AGI-Research 主入口
 * 四元一体 AGI 生命体框架
 *
 * @author q1z2q3-debug
 * @version 0.2.0-cognitive
 */

// 核心导出
export { TCAGI4, getAGI, startAGI } from './integration';
export type { AGIHealthStatus } from './integration';

// 认知层导出
export * from './cognitive';
export type { CognitiveState, CognitiveSnapshot } from './cognitive/cognitive-space';
export type { ActionStrategy, TaskResult } from './cognitive/deepseek-cognize';

// 记忆层导出
export * from './memory';
export type { Memory, MemoryQuery, MemoryStats } from './memory/memory-types';

// 核心层导出
export * from './core';
export type { TaskPlan, TaskStep, EngineEvent } from './core/engine';

// 技能层导出
export * from './skills';
export type { Skill } from './skills/skill-loader';

// 工具层导出
export * from './tools';
export type { MCPTool, MCPServer } from './tools/mcp-adapter';

// 调度器导出
export * from './scheduler';
export type { ScheduledTask, TaskSchedule } from './scheduler/cron-scheduler';

// 类型导出
export * from './types';

// ===== 便捷单例 =====

import { TCAGI4 } from './integration';

let _defaultAGI: TCAGI4 | null = null;

/**
 * 获取默认 AGI 实例（延迟初始化）
 */
export function getDefaultAGI(): TCAGI4 {
  if (!_defaultAGI) {
    _defaultAGI = new TCAGI4();
  }
  return _defaultAGI;
}

/**
 * 快速启动 AGI
 */
export async function quickStart(options?: { memoryFilePath?: string }): Promise<TCAGI4> {
  const agi = getDefaultAGI();
  if (!agi.isRunning()) {
    await agi.start();
  }
  return agi;
}

/**
 * 快速提交任务
 */
export async function quickTask(task: string, context?: any): Promise<any> {
  const agi = await quickStart();
  return agi.submitTask(task, context);
}

// 默认导出
export default TCAGI4;
