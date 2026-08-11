/**
 * 结构化日志工具 (Structured Logger)
 * 轻量零依赖，支持日志级别和统一输出格式。
 * 环境变量 LOG_LEVEL 控制输出级别（debug/info/warn/error），默认 info。
 * 生产环境可替换为 pino/winston，接口保持兼容。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') {
    return env;
  }
  return 'info';
}

let currentLevel: LogLevel = resolveLevel();

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function format(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0
    ? ' ' + JSON.stringify(meta)
    : '';
  return `[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.debug(format('debug', msg, meta));
  },
  info(msg: string, meta?: Record<string, unknown>): void {
    if (shouldLog('info')) console.info(format('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.warn(format('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(format('error', msg, meta));
  },
};
