/**
 * 认知空间运行时配置 (Cognitive Space Config)
 * ─────────────────────────────────────────────────────────────
 *
 * 管理认知空间的动态可调参数，支持环境变量注入与运行时修改。
 * 与 Go cogspace.CogConfig 完全对齐。
 *
 * 配置项：
 *   - 维度权重：e（时间）、π（空间）、γ（因果）
 *   - 收敛阈值：认知到原点的欧式距离阈值
 *   - 极端阈值：非中和维度数量阈值
 *   - TopK：记忆召回数量
 */

/** 认知空间配置 */
export interface CogConfig {
  /** 时间维度权重，默认 e ≈ 2.718 */
  eWeight: number;
  /** 空间维度权重，默认 π ≈ 3.14159 */
  piWeight: number;
  /** 因果维度权重，默认 γ ≈ 0.5772 */
  gammaWeight: number;
  /** 收敛判定阈值（欧式距离），默认 2.5 */
  convergeThreshold: number;
  /** 极端认知判定阈值（非零维度数），默认 7 */
  extremeThreshold: number;
  /** 记忆召回数量，默认 3 */
  topKNum: number;
}

/** 默认配置（与 Go cogspace 对齐） */
const DEFAULT_CONFIG: CogConfig = {
  eWeight: Math.E,
  piWeight: Math.PI,
  gammaWeight: 0.5772,
  convergeThreshold: 2.5,
  extremeThreshold: 7,
  topKNum: 3,
};

/** 当前全局配置 */
let currentConfig: CogConfig = { ...DEFAULT_CONFIG };

/**
 * 从环境变量加载配置（在 Node.js 环境下）
 * 支持的环境变量：
 *   COG_E_WEIGHT, COG_PI_WEIGHT, COG_GAMMA_WEIGHT,
 *   COG_CONVERGE_THRESHOLD, COG_EXTREME_THRESHOLD, COG_TOPK_NUM
 */
export function loadCogConfigFromEnv(): CogConfig {
  const env = (typeof process !== 'undefined' && process.env) || {};

  const parseNum = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  };

  const parseNumInt = (v: string | undefined, fallback: number): number => {
    if (!v) return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  };

  currentConfig = {
    eWeight: parseNum(env.COG_E_WEIGHT, DEFAULT_CONFIG.eWeight),
    piWeight: parseNum(env.COG_PI_WEIGHT, DEFAULT_CONFIG.piWeight),
    gammaWeight: parseNum(env.COG_GAMMA_WEIGHT, DEFAULT_CONFIG.gammaWeight),
    convergeThreshold: parseNum(env.COG_CONVERGE_THRESHOLD, DEFAULT_CONFIG.convergeThreshold),
    extremeThreshold: parseNumInt(env.COG_EXTREME_THRESHOLD, DEFAULT_CONFIG.extremeThreshold),
    topKNum: parseNumInt(env.COG_TOPK_NUM, DEFAULT_CONFIG.topKNum),
  };

  return currentConfig;
}

/** 获取当前全局配置（副本） */
export function getCogConfig(): CogConfig {
  return { ...currentConfig };
}

/** 更新全局配置（部分更新） */
export function updateCogConfig(updates: Partial<CogConfig>): CogConfig {
  currentConfig = { ...currentConfig, ...updates };
  return currentConfig;
}

/** 重置为默认配置 */
export function resetCogConfig(): CogConfig {
  currentConfig = { ...DEFAULT_CONFIG };
  return currentConfig;
}

/**
 * 动态调参方案预设
 * 可根据场景快速切换配置
 */
export const COG_CONFIG_PRESETS: Record<string, CogConfig> = {
  /** 默认均衡配置 */
  balanced: { ...DEFAULT_CONFIG },

  /** 创意发散场景：允许更大认知偏差，鼓励多角度探索 */
  creative: {
    ...DEFAULT_CONFIG,
    convergeThreshold: 1.5,
    extremeThreshold: 5,
    topKNum: 5,
  },

  /** 严谨推理场景：要求更接近平衡态，抑制发散思维 */
  rigorous: {
    ...DEFAULT_CONFIG,
    convergeThreshold: 3.0,
    extremeThreshold: 8,
    topKNum: 2,
  },

  /** 长期记忆场景：召回更多历史认知，偏好近期记忆 */
  longTerm: {
    ...DEFAULT_CONFIG,
    topKNum: 8,
  },

  /** 快速响应场景：减少上下文注入，加快推理速度 */
  fast: {
    ...DEFAULT_CONFIG,
    topKNum: 1,
    convergeThreshold: 2.0,
  },
};
