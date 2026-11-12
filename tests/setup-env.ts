/**
 * Jest 全局初始化：把记忆持久化文件重定向到临时目录，
 * 避免测试把 400MB+ 的 memory.json 写进仓库并拖垮后续测试。
 */
import * as os from 'os';
import * as path from 'path';

process.env.MEMORY_PATH = path.join(
  os.tmpdir(),
  `tc-agi-test-memory-${process.pid}-${process.env.JEST_WORKER_ID || '0'}.json`
);

// 关闭外部 embedding 调用，避免测试挂起等待 15s 网络超时
process.env.EMBEDDING_ENABLED = 'false';
