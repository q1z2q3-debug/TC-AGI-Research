/**
 * π-e 谐振动力学 (π-e Resonant Dynamics)
 * ─────────────────────────────────────────────────────────────
 * 论文 Section 5.2：Stuart-Landau 方程控制认知振荡器的振幅与相位。
 *
 * 核心方程：ż = (λ_e + iω_π)z - γ|z|²z
 *   - z(t) ∈ ℂ：认知振荡器复振幅
 *   - ω_π = 2π/T_π：π 锁相角频率（控制循环相位转换）
 *   - λ_e = λ₀·e^{αt}：e 谐振增长/衰减率（控制指数结构变换）
 *   - γ|z|²z：非线性阻尼项，稳定振幅
 *
 * Theorem 5.1 (四相轨道稳定性)：
 *   唯一非平凡周期轨道 z*(t) = r*·e^{iω_πt}, r* = √(λ_e/γ)
 *   轨道渐近稳定 ⟺ λ_e > 0
 *   Floquet 乘子 μ_⊥ = exp(-2λ_eT_π)
 *
 * Corollary 5.2：
 *   e-谐振是四相持久存在的充要条件。
 *   λ_e ≤ 0 → 振幅衰减到零（认知坍缩到未分化状态）。
 *
 * 四相转换的 π 相位角：
 *   老阳→少阴：θ = π/2
 *   少阴→老阴：θ = π
 *   老阴→少阳：θ = 3π/2
 *   少阳→老阳：θ = 2π
 */

import { FourPhase } from './four-phase';

/** π-e 谐振配置参数 */
export interface PiEResonanceConfig {
  /** π 锁相角频率（rad/s），默认 2π/20 ≈ 0.314 */
  omegaPi: number;
  /** e-谐振基增长率 λ₀，默认 0.5 */
  lambda0: number;
  /** e-谐振增长指数 α，默认 0.01 */
  alpha: number;
  /** 非线性阻尼 γ，默认 1.0 */
  gamma: number;
  /** 积分步长 Δt，默认 0.05 */
  dt: number;
  /** 是否自适应调整 λ_e（基于认知熵） */
  adaptiveLambda: boolean;
  /** 是否启用 PI 自适应谐振控制器（§9.5） */
  enablePIController: boolean;
  /** PI 比例增益 K_p，默认 0.05（Ziegler-Nichols 调谐） */
  kp: number;
  /** PI 积分增益 K_i，默认 0.002 */
  ki: number;
  /** 自适应 Ki 的 β 系数，默认 0.3 */
  kiAdaptiveBeta: number;
  /** 自适应 Ki 的基频 f₀，默认 0.5 */
  kiBaseFreq: number;
  /** 符号变化检测窗口 M，默认 50 */
  signChangeWindow: number;
  /** 基频 ω₀（PI 控制器参考），默认 2π/20 */
  omega0: number;
}

/** 默认 π-e 谐振配置 */
export const DEFAULT_PIE_CONFIG: PiEResonanceConfig = {
  omegaPi: 2 * Math.PI / 20,  // T_π = 20 步
  lambda0: 0.5,
  alpha: 0.01,
  gamma: 1.0,
  dt: 0.05,
  adaptiveLambda: true,
  enablePIController: false,   // 默认关闭，与现有行为兼容
  kp: 0.05,
  ki: 0.002,
  kiAdaptiveBeta: 0.3,
  kiBaseFreq: 0.5,
  signChangeWindow: 50,
  omega0: 2 * Math.PI / 20
};

/** π-e 谐振振荡器状态 */
export interface PiEResonanceState {
  /** 复振幅 z = re^{iθ} */
  z: { re: number; im: number };
  /** 振幅 r = |z| */
  amplitude: number;
  /** 相位 θ = arg(z) */
  phase: number;
  /** 当前 λ_e(t) */
  lambdaE: number;
  /** 稳定轨道半径 r* = √(λ_e/γ) */
  stableRadius: number;
  /** Floquet 乘子 μ_⊥ */
  floquetMultiplier: number;
  /** 是否稳定（λ_e > 0） */
  isStable: boolean;
  /** 步数 */
  step: number;
  /** 四相预测 */
  predictedPhase: FourPhase;
  /** 四相转换是否即将发生（θ 接近 π/2 的整数倍） */
  nearTransition: boolean;
  /** PI 控制器：当前谐振频率 ω_res（§9.5） */
  omegaRes: number;
  /** PI 控制器：Δ_πe 失配量 */
  deltaPiE: number;
  /** PI 控制器：积分项累积 */
  integralTerm: number;
  /** PI 控制器：有效 K_i（可能被自适应调整） */
  effectiveKi: number;
}

/** 四相相位区间（θ 在 [-π, π] 中） */
const PHASE_BOUNDARIES: [number, number, FourPhase][] = [
  [Math.PI * 0.25, Math.PI * 0.75, FourPhase.OldYang],       // [π/4, 3π/4]
  [Math.PI * 0.75, Math.PI, FourPhase.YoungYin],              // [3π/4, π]
  [-Math.PI, -Math.PI * 0.75, FourPhase.YoungYin],            // [-π, -3π/4]
  [-Math.PI * 0.75, -Math.PI * 0.25, FourPhase.OldYin],      // [-3π/4, -π/4]
  [-Math.PI * 0.25, Math.PI * 0.25, FourPhase.YoungYang],     // [-π/4, π/4]
];

/**
 * π-e 谐振动力学引擎
 * ─────────────────────────────────────────────────────────────
 * 管理认知振荡器的 Stuart-Landau 演化，驱动四相极限环的持久性。
 */
export class PiEResonance {
  private config: PiEResonanceConfig;
  private state: PiEResonanceState;
  private history: PiEResonanceState[] = [];
  private readonly MAX_HISTORY = 1000;
  /** PI 控制器：符号变化历史（用于自适应 Ki） */
  private signHistory: number[] = [];
  /** PI 控制器：前一次 Δ_πe 值（用于符号变化检测） */
  private prevDeltaPiE: number = 0;

  constructor(config: Partial<PiEResonanceConfig> = {}) {
    this.config = { ...DEFAULT_PIE_CONFIG, ...config };
    this.state = this.initialState();
  }

  /** 初始状态：小幅扰动激发 */
  private initialState(): PiEResonanceState {
    const z0 = { re: 0.01, im: 0.01 };  // 微小初始扰动
    const amp = Math.sqrt(z0.re ** 2 + z0.im ** 2);
    const ph = Math.atan2(z0.im, z0.re);
    const lambdaE = this.config.lambda0;
    const stableRadius = Math.sqrt(lambdaE / this.config.gamma);
    const floquet = Math.exp(-2 * lambdaE * (2 * Math.PI / this.config.omegaPi));
    const omega0 = this.config.omega0;

    return {
      z: z0,
      amplitude: amp,
      phase: ph,
      lambdaE,
      stableRadius,
      floquetMultiplier: floquet,
      isStable: lambdaE > 0,
      step: 0,
      predictedPhase: this.phaseToFourPhase(ph),
      nearTransition: false,
      omegaRes: omega0,
      deltaPiE: 0,
      integralTerm: 0,
      effectiveKi: this.config.ki
    };
  }

  /**
   * 步进：执行一步 Stuart-Landau 积分（RK4 方法）
   * ż = (λ_e + iω_π)z - γ|z|²z
   *
   * 若启用 PI 控制器（§9.5），ω_π 由自适应谐振控制：
   *   Δ_πe = ||∇H_kin|| - ||∇E_Ising||
   *   ω_res(t) = ω₀ + K_p·Δ_πe(t) + K_i·∫Δ_πe(τ)dτ
   */
  step(cognitiveEntropy?: number): PiEResonanceState {
    const { dt, gamma, alpha, adaptiveLambda } = this.config;
    const z = this.state.z;

    // 自适应 λ_e：基于认知熵调整
    if (adaptiveLambda && cognitiveEntropy !== undefined) {
      const entropyFactor = 1 - Math.min(cognitiveEntropy, 1.0) * 0.5;
      this.state.lambdaE = this.config.lambda0 * Math.exp(this.config.alpha * this.state.step) * entropyFactor;
    } else {
      this.state.lambdaE = this.config.lambda0 * Math.exp(this.config.alpha * this.state.step);
    }

    // PI 自适应谐振控制器（§9.5）
    let omegaPi = this.config.omegaPi;
    if (this.config.enablePIController) {
      omegaPi = this.computePiResonantFrequency(z);
    }

    // RK4 积分
    const k1 = this.dzdt(z, this.state.lambdaE, omegaPi, gamma);
    const k2 = this.dzdt(
      { re: z.re + 0.5 * dt * k1.re, im: z.im + 0.5 * dt * k1.im },
      this.state.lambdaE, omegaPi, gamma
    );
    const k3 = this.dzdt(
      { re: z.re + 0.5 * dt * k2.re, im: z.im + 0.5 * dt * k2.im },
      this.state.lambdaE, omegaPi, gamma
    );
    const k4 = this.dzdt(
      { re: z.re + dt * k3.re, im: z.im + dt * k3.im },
      this.state.lambdaE, omegaPi, gamma
    );

    const newRe = z.re + (dt / 6) * (k1.re + 2 * k2.re + 2 * k3.re + k4.re);
    const newIm = z.im + (dt / 6) * (k1.im + 2 * k2.im + 2 * k3.im + k4.im);

    const newZ = { re: newRe, im: newIm };
    const amp = Math.sqrt(newRe ** 2 + newIm ** 2);
    const ph = Math.atan2(newIm, newRe);
    const stableRadius = Math.sqrt(Math.max(0, this.state.lambdaE / gamma));
    const tPi = 2 * Math.PI / omegaPi;
    const floquet = Math.exp(-2 * this.state.lambdaE * tPi);
    const predictedPhase = this.phaseToFourPhase(ph);

    this.state = {
      z: newZ,
      amplitude: amp,
      phase: ph,
      lambdaE: this.state.lambdaE,
      stableRadius,
      floquetMultiplier: floquet,
      isStable: this.state.lambdaE > 0,
      step: this.state.step + 1,
      predictedPhase,
      nearTransition: this.detectNearTransition(ph),
      omegaRes: omegaPi,
      deltaPiE: this.state.deltaPiE,
      integralTerm: this.state.integralTerm,
      effectiveKi: this.state.effectiveKi
    };

    // 记录历史
    this.history.push({ ...this.state });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    return this.state;
  }

  /** Stuart-Landau 导数：ż = (λ_e + iω_π)z - γ|z|²z */
  private dzdt(
    z: { re: number; im: number },
    lambdaE: number,
    omegaPi: number,
    gamma: number
  ): { re: number; im: number } {
    const ampSq = z.re ** 2 + z.im ** 2;
    const damping = gamma * ampSq;

    // (λ_e + iω_π)z
    const linearRe = lambdaE * z.re - omegaPi * z.im;
    const linearIm = omegaPi * z.re + lambdaE * z.im;

    // -γ|z|²z
    const dampRe = damping * z.re;
    const dampIm = damping * z.im;

    return {
      re: linearRe - dampRe,
      im: linearIm - dampIm
    };
  }

  /**
   * PI 自适应谐振控制器（§9.5）
   * ─────────────────────────────────────────────────────────────
   * Δ_πe = ||∇H_kin|| - ||∇E_Ising||
   * ω_res(t) = ω₀ + K_p·Δ_πe(t) + K_i·∫Δ_πe(τ)dτ
   *
   * 当动能主导（Δ_πe > 0）：频率增加，加速循环
   * 当Ising能主导（Δ_πe < 0）：频率降低，深化结构耦合
   */
  private computePiResonantFrequency(z: { re: number; im: number }): number {
    const { kp, ki, omega0, dt } = this.config;

    // 计算 ||∇H_kin||：动能梯度 = |ż|（导数幅值）
    const dz = this.dzdt(z, this.state.lambdaE, this.state.omegaRes, this.config.gamma);
    const kineticGrad = Math.sqrt(dz.re ** 2 + dz.im ** 2);

    // 计算 ||∇E_Ising||：Ising 势能梯度 = 振幅 |z|（耦合强度代理）
    const isingGrad = Math.sqrt(z.re ** 2 + z.im ** 2);

    // Δ_πe = ||∇H_kin|| - ||∇E_Ising||
    const delta = kineticGrad - isingGrad;
    this.state.deltaPiE = delta;

    // 积分项累积（带防饱和）
    const dtSec = dt * 100; // 归一化时间尺度
    let integral = this.state.integralTerm + delta * dtSec;
    integral = Math.max(-10, Math.min(10, integral)); // 防饱和
    this.state.integralTerm = integral;

    // 自适应 Ki（§A.2.5）：基于符号变化频率
    if (this.state.step > 0 && this.state.step % 10 === 0) {
      this.state.effectiveKi = this.computeAdaptiveKi(delta);
    }

    // ω_res(t) = ω₀ + K_p·Δ_πe + K_i·∫Δ_πe
    const omegaRes = omega0 + kp * delta + this.state.effectiveKi * integral;

    // 安全限幅：ω_res ∈ [ω₀/4, 4·ω₀]
    const omegaMin = omega0 * 0.25;
    const omegaMax = omega0 * 4.0;
    return Math.max(omegaMin, Math.min(omegaMax, omegaRes));
  }

  /**
   * 自适应 Ki（附录 A.2.5）
   * ─────────────────────────────────────────────────────────────
   * K_i(t) = K_i,0 × (1 + β·(f_sign(t) - f₀)/f₀)
   *
   * f_sign(t)：最近 M=50 次更新中 e(t) 的符号变化频率
   * 快速符号变化（f > 0.7，振荡市场）：增加 Ki 加速收敛
   * 慢速符号变化（f < 0.3，趋势市场）：降低 Ki 减少超调
   */
  private computeAdaptiveKi(delta: number): number {
    // 记录符号变化
    const currentSign = delta >= 0 ? 1 : -1;
    const prevSign = this.prevDeltaPiE >= 0 ? 1 : -1;
    if (this.state.step > 0) {
      this.signHistory.push(currentSign !== prevSign ? 1 : 0);
    }
    this.prevDeltaPiE = delta;

    // 限制窗口大小
    const window = this.config.signChangeWindow;
    while (this.signHistory.length > window) {
      this.signHistory.shift();
    }

    // 计算符号变化频率
    if (this.signHistory.length < 10) return this.config.ki;

    const signChanges = this.signHistory.reduce((a, b) => a + b, 0);
    const fSign = signChanges / this.signHistory.length;

    // 自适应 Ki
    const { ki, kiAdaptiveBeta, kiBaseFreq } = this.config;
    const kiAdapted = ki * (1 + kiAdaptiveBeta * (fSign - kiBaseFreq) / kiBaseFreq);

    // 安全限幅：Ki ∈ [Ki/10, 10·Ki]
    return Math.max(ki * 0.1, Math.min(ki * 10, kiAdapted));
  }

  /** 将相位 θ 映射到四相 */
  private phaseToFourPhase(theta: number): FourPhase {
    for (const [lo, hi, phase] of PHASE_BOUNDARIES) {
      if (theta >= lo && theta < hi) return phase;
    }
    // 边界情况：theta 恰好等于 π 或 -π 的边界
    if (Math.abs(theta) >= Math.PI * 0.75) return FourPhase.YoungYin;
    return FourPhase.YoungYang;
  }

  /** 检测是否接近四相转换边界（θ 接近 π/2 的整数倍） */
  private detectNearTransition(theta: number): boolean {
    const transitionAngles = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const threshold = 0.15; // 约 8.6°
    for (const angle of transitionAngles) {
      if (Math.abs(theta - angle) < threshold) return true;
    }
    return false;
  }

  /**
   * 获取当前 π-e 谐振状态
   */
  getState(): PiEResonanceState {
    return { ...this.state };
  }

  /**
   * 获取历史记录
   */
  getHistory(): PiEResonanceState[] {
    return [...this.history];
  }

  /**
   * 获取预测的振幅比率（当前振幅/稳定振幅）
   * > 1 → 过冲，< 1 → 欠冲，= 1 → 稳定
   */
  getAmplitudeRatio(): number {
    if (this.state.stableRadius === 0) return 0;
    return this.state.amplitude / this.state.stableRadius;
  }

  /**
   * 获取谐振周期 T_π（步数）
   */
  getPeriod(): number {
    return 2 * Math.PI / this.config.omegaPi;
  }

  /**
   * 从外部设置认知熵（触发自适应 λ_e 调整）
   */
  setCognitiveEntropy(entropy: number): void {
    if (this.config.adaptiveLambda) {
      const entropyFactor = 1 - Math.min(entropy, 1.0) * 0.5;
      this.state.lambdaE = this.config.lambda0 * Math.exp(this.config.alpha * this.state.step) * entropyFactor;
      this.state.stableRadius = Math.sqrt(Math.max(0, this.state.lambdaE / this.config.gamma));
      this.state.isStable = this.state.lambdaE > 0;
    }
  }

  /**
   * 重置振荡器
   */
  reset(): void {
    this.state = this.initialState();
    this.history = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PiEResonanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取阻尼 Lyapunov 指数
   * 负值 → 稳定，正值 → 发散
   */
  getLyapunovExponent(): number {
    return this.state.lambdaE - this.config.gamma * this.state.amplitude ** 2;
  }

  /**
   * 预测相位转换时间（步数）
   * 基于当前相位和角速度估计到下一个边界的步数
   */
  estimateTimeToTransition(): number | null {
    if (this.state.amplitude < 0.01) return null;

    // 从当前相位到下一个 π/2 整数倍边界的最小角度差
    const theta = this.state.phase;
    const transitionAngles = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI];

    let minDist = Infinity;
    for (const angle of transitionAngles) {
      let dist = Math.abs(theta - angle);
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      if (dist < minDist) minDist = dist;
    }

    // 角速度 ≈ ω_π（稳定轨道上）
    const angularVelocity = this.config.omegaPi;
    return Math.ceil(minDist / angularVelocity);
  }
}

/**
 * 默认全局 π-e 谐振实例
 */
export const defaultPiEResonance = new PiEResonance();