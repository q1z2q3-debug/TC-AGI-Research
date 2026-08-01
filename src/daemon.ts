/**
 * TC-AGI 持久化运行器 (Daemon)
 * ─────────────────────────────────────────────────────────────
 * 启动四元一体 AGI，并以固定间隔持续运行认知循环：
 *   觉知（perceive）→ 推理（reason）→ 进化（evolve）→ 自知（getState）
 *
 * 特性：
 *  - 接入 DEEPSEEK_API_KEY 时使用真实 LLM 认知；未配置则本地规则引擎降级
 *  - 防止循环重叠（上一轮未结束则跳过）
 *  - 优雅退出：捕获 SIGINT / SIGTERM，先 shutdown 再退出
 *
 * 运行方式：
 *   npm run start:daemon                # 前台
 *   nohup npm run start:daemon > tc-agi.log 2>&1 &   # 后台持久化
 *   pm2 start dist/daemon.js --name tc-agi           # 进程守护（推荐生产）
 */

import 'dotenv/config';
import { getDefaultAGI } from './index';
import { DeepSeekClient } from './cognitive/llm';

const SELF_PROMPTS = [
  '回顾今日认知，巩固核心信念，规划下一步进化方向',
  '检视当前任务队列，识别可主动推进的机会',
  '反思最近一次失败或阻碍，提炼可复用的教训',
  '感知外部环境变化，评估风险与机遇',
  '静观其变，整合记忆，保持内外和谐'
];

async function main() {
  const agi = await getDefaultAGI();
  if (!agi.isRunning()) {
    await agi.start();
  }

  const cognize = agi.getComponents().cognize;
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      cognize.setLLM(new DeepSeekClient());
      console.log('🧠 LLM 认知增强已接入 (DeepSeek)');
    } catch (e) {
      console.warn('⚠️ LLM 接入失败，使用本地规则引擎:', (e as Error).message);
    }
  } else {
    console.log('ℹ️ 未配置 DEEPSEEK_API_KEY，使用本地规则认知引擎');
  }

  const intervalSec = parseInt(process.env.LOOP_INTERVAL_SEC || '30', 10);
  const intervalMs = Math.max(5, intervalSec) * 1000;
  let idx = 0;
  let running = false;

  console.log(`🌀 TC-AGI 持久化循环已启动 (间隔 ${intervalSec}s)`);

  const tick = async () => {
    if (running) return; // 防止重叠执行
    running = true;
    const prompt = SELF_PROMPTS[idx % SELF_PROMPTS.length];
    idx++;
    try {
      const r = await cognize.cycle(prompt);
      console.log(
        `[${new Date().toISOString()}] ${r.snapshot.state.summary} ` +
        `| 卦${r.state.hexagramIndex} | 策略: ${r.strategy.name}(${(r.strategy.confidence * 100).toFixed(0)}%)`
      );
    } catch (e) {
      console.error('循环异常:', (e as Error).message);
    } finally {
      running = false;
    }
  };

  await tick(); // 启动即跑一次
  const timer = setInterval(() => { void tick(); }, intervalMs);

  const shutdown = async () => {
    console.log('\n🛑 收到退出信号，正在优雅关闭...');
    clearInterval(timer);
    try { await agi.shutdown(); } catch (_) { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error('Daemon 启动失败:', e);
  process.exit(1);
});
