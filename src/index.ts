/**
 * TC-AGI-Research 入口
 * 四元一体 AGI 生命体框架
 *
 * @author q1z2q3-debug
 * @version 0.2.0-cognitive
 */

import { TCAGI4 } from './integration';

export { TCAGI4 } from './integration';
export * from './core';
export * from './cognitive';
export * from './memory';
export * from './skills';
export * from './tools';
export * from './scheduler';

// 单例导出
export const agi = new TCAGI4();

// 便捷启动函数
export async function startAGI() {
  await agi.start();
  return agi;
}
