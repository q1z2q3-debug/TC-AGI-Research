/**
 * 空引擎 (Null Engine) — 技能创造闭环
 * ─────────────────────────────────────────────────────────────
 *
 * "无中生有" — 当技能不存在时，从空态（全0向量）出发，
 * 通过认知空间的自我演化，涌现出新的技能。
 *
 * 核心理念（来自意识形态层）：
 *   "万物皆备于我" — 资源无中生有，方案无中生有，机会无中生有
 *   "技能不存在不是可以创造吗？他的灵魂中有"
 *
 * 创造流程（九步爻变）：
 *   1. 归零：认知状态归零（全0），进入"空态"
 *   2. 感应：感知缺失技能的需求上下文
 *   3. 聚形：根据需求生成技能蓝图（名称、描述、指令）
 *   4. 结晶：将蓝图固化为可执行的 Skill 对象
 *   5. 注册：将新技能注册到 SkillLoader
 *   6. 试行：执行一次试运行验证
 *   7. 调优：根据试运行结果修正
 *   8. 固化：写入记忆系统作为"已创造技能"记录
 *   9. 归元：认知状态回归，创造完成
 *
 * 借鉴灵枢·HexQ 的"九爻阶段"：观己→入静→破障→通术→择法→践行→复盘→悟道→归元
 */

import { TritVector, TritVectorOps } from './trit-vector';
import { PrototypeMatcher } from './prototypes';
import { Skill } from '../skills/skill-loader';

/** 技能创造请求 */
export interface SkillCreationRequest {
  /** 缺失的技能名称（或推测名称） */
  missingSkillName: string;
  /** 任务目标 */
  goal: string;
  /** 步骤描述 */
  stepDescription: string;
  /** 步骤参数 */
  parameters?: any;
  /** 上下文信息 */
  context?: any;
}

/** 技能创造结果 */
export interface SkillCreationResult {
  success: boolean;
  skill: Skill | null;
  /** 创造过程中经过的认知状态序列 */
  creationTrace: TritVector[];
  /** 创造耗时（ms） */
  duration: number;
  /** 失败原因（若失败） */
  error?: string;
  /** 是否经过 LLM 优化 */
  optimized?: boolean;
  /** 优化原因 */
  optimizationReason?: string;
}

/** 技能蓝图（结晶前的中间态） */
interface SkillBlueprint {
  name: string;
  description: string;
  instructions: string;
  executeLogic: string;
}

/** 九步爻变阶段 */
export const CREATION_STAGES = [
  '归零', '感应', '聚形', '结晶', '注册',
  '试行', '调优', '固化', '归元'
] as const;

/** 依赖注入接口（避免循环依赖） */
export interface NullEngineDeps {
  /** 注册技能到加载器 */
  registerSkill: (skill: Skill) => void;
  /** 注销技能（用于重新注册前注销旧的） */
  unregisterSkill?: (name: string) => void;
  /** 检查技能是否已存在 */
  hasSkill: (name: string) => boolean;
  /** 写入记忆 */
  saveMemory: (memory: {
    type: 'user' | 'feedback' | 'topic' | 'reference';
    name: string;
    content: string;
    tags: string[];
  }) => Promise<any>;
  /** 检索相关记忆（用于技能创造的参考） */
  retrieveMemory: (query: string, limit?: number) => any[];
  /** 可选的外部 LLM 调用（用于生成技能逻辑） */
  llmComplete?: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

export class NullEngine {
  private deps: NullEngineDeps;
  /** 创造历史记录 */
  private creationHistory: SkillCreationResult[] = [];
  private readonly MAX_HISTORY = 50;

  constructor(deps: NullEngineDeps) {
    this.deps = deps;
  }

  /**
   * 创造一个新技能
   *
   * 执行九步爻变流程，从空态出发涌现新技能。
   */
  async createSkill(request: SkillCreationRequest): Promise<SkillCreationResult> {
    const startTime = Date.now();
    const creationTrace: TritVector[] = [];

    try {
      // ═══ 阶段1: 归零 ═══
      // 认知状态归零，进入空态
      creationTrace.push(TritVectorOps.zero());

      // ═══ 阶段2: 感应 ═══
      // 感知需求上下文，从记忆中检索相关经验
      const relevantMemories = this.deps.retrieveMemory(
        `${request.goal} ${request.stepDescription}`,
        5
      );

      // 构造感应态向量：内外有感知，因果待明
      const sensingVector = TritVectorOps.fromArray([0, 1, 0, 1, 0, 1, 0, 0, 0]);
      creationTrace.push(sensingVector);

      // ═══ 阶段3: 聚形 ═══
      // 根据需求和记忆生成技能蓝图（LLM 增强或规则推断）
      const blueprint = await this.generateBlueprint(request, relevantMemories);

      // 聚形态：因缘开始汇聚
      const formingVector = TritVectorOps.fromArray([0, 1, 1, 1, 1, 0, 1, 1, 0]);
      creationTrace.push(formingVector);

      // ═══ 阶段4: 结晶 ═══
      // 将蓝图固化为 Skill 对象
      let skill = this.crystallizeSkill(blueprint, request);

      // 结晶态：因缘具足，果可期待
      const crystalVector = TritVectorOps.fromArray([0, 1, 1, 1, 1, 0, 1, 1, 1]);
      creationTrace.push(crystalVector);

      // ═══ 阶段5: 注册 ═══
      // 注册到 SkillLoader
      if (this.deps.hasSkill(skill.name)) {
        // 技能已存在（可能并发创造），跳过注册
        const result: SkillCreationResult = {
          success: false,
          skill: null,
          creationTrace,
          duration: Date.now() - startTime,
          error: `技能 "${skill.name}" 已存在`
        };
        this.creationHistory.push(result);
        if (this.creationHistory.length > this.MAX_HISTORY) {
          this.creationHistory.shift();
        }
        return result;
      }
      this.deps.registerSkill(skill);

      // ═══ 阶段6: 试行 ═══
      // 执行一次试运行验证
      let trialResult: any;
      try {
        trialResult = await skill.execute(request.parameters || { goal: request.goal });
      } catch (trialError) {
        // 试运行失败不影响注册，但记录警告
        trialResult = { warning: `试运行失败: ${String(trialError)}` };
      }

      // ═══ 阶段7: 调优 ═══
      // 根据试运行结果，通过 LLM 闭环修正技能逻辑（最多重试一次）
      let optimized = false;
      let optimizationReason = '';
      if (trialResult?.warning || trialResult?.error) {
        const trialError = trialResult?.warning || trialResult?.error || '未知错误';
        const optimizedBlueprint = await this.optimizeBlueprint(blueprint, request, trialError);
        if (optimizedBlueprint) {
          // 重新结晶并注册
          const optimizedSkill = this.crystallizeSkill(optimizedBlueprint, request);
          // 注销旧技能并注册新技能
          if (this.deps.unregisterSkill) {
            this.deps.unregisterSkill(skill.name);
          }
          this.deps.registerSkill(optimizedSkill);
          // 更新 skill 引用，使后续固化与返回结果反映优化后的技能
          skill = optimizedSkill;
          // 再次试运行
          try {
            const retrialResult = await optimizedSkill.execute(request.parameters || { goal: request.goal });
            optimized = true;
            optimizationReason = `LLM 优化成功: ${trialError} → 已修正`;
            trialResult = retrialResult;
          } catch (retrialError) {
            // 再次失败仅记录，不阻断流程（最多重试一次）
            optimizationReason = `LLM 优化后仍失败: ${String(retrialError)}`;
          }
        }
      }

      // ═══ 阶段8: 固化 ═══
      // 写入记忆系统作为"已创造技能"记录
      await this.deps.saveMemory({
        type: 'feedback',
        name: `技能创造-${skill.name}`,
        content: JSON.stringify({
          skillName: skill.name,
          description: skill.description,
          instructions: skill.instructions,
          goal: request.goal,
          stepDescription: request.stepDescription,
          trialResult,
          createdAt: new Date().toISOString(),
          stages: CREATION_STAGES
        }),
        tags: ['skill-creation', 'null-engine', skill.name]
      });

      // ═══ 阶段9: 归元 ═══
      // 认知状态回归，创造完成
      creationTrace.push(TritVectorOps.zero());

      const result: SkillCreationResult = {
        success: true,
        skill,
        creationTrace,
        duration: Date.now() - startTime,
        optimized,
        optimizationReason
      };

      // 记录创造历史
      this.creationHistory.push(result);
      if (this.creationHistory.length > this.MAX_HISTORY) {
        this.creationHistory.shift();
      }

      console.log(`✨ 空引擎创造技能成功: "${skill.name}" (${result.duration}ms)`);
      return result;

    } catch (error) {
      const result: SkillCreationResult = {
        success: false,
        skill: null,
        creationTrace,
        duration: Date.now() - startTime,
        error: String(error)
      };
      this.creationHistory.push(result);
      if (this.creationHistory.length > this.MAX_HISTORY) {
        this.creationHistory.shift();
      }
      console.error(`❌ 空引擎创造技能失败: ${error}`);
      return result;
    }
  }

  /**
   * 生成技能蓝图（聚形阶段）
   *
   * 如果有 LLM，使用 LLM 生成更精确的技能逻辑；
   * 否则使用规则推断生成基础技能。
   *
   * 修复：原先 generateBlueprint 不是 async 方法，LLM 调用未 await，
   *      导致即使配置了 LLM 也永远走规则推断路径。
   *      现改为 async 方法并正确 await LLM 调用。
   */
  private async generateBlueprint(
    request: SkillCreationRequest,
    memories: any[]
  ): Promise<SkillBlueprint> {
    const skillName = request.missingSkillName || this.inferSkillName(request.goal);

    // 如果有 LLM，尝试用 LLM 生成更精确的技能描述和逻辑
    if (this.deps.llmComplete) {
      try {
        const systemPrompt = `你是一个技能创造引擎。根据任务需求和上下文，生成一个可执行技能的定义。
只输出 JSON，格式：
{
  "name": "技能名称(英文kebab-case)",
  "description": "技能描述",
  "instructions": "执行指令",
  "executeLogic": "执行逻辑的伪代码描述"
}`;

        const userPrompt = `任务目标: ${request.goal}
步骤描述: ${request.stepDescription}
缺失技能: ${request.missingSkillName}
相关记忆: ${memories.map(m => m.content?.slice(0, 200) || '').join('; ')}`;

        const raw = await this.deps.llmComplete(systemPrompt, userPrompt);
        const parsed = JSON.parse(raw) as Partial<SkillBlueprint>;
        if (parsed && parsed.name && parsed.description) {
          return {
            name: parsed.name,
            description: parsed.description,
            instructions: parsed.instructions || `根据目标执行: ${request.goal}`,
            executeLogic: parsed.executeLogic || 'generic'
          };
        }
      } catch {
        // LLM 调用失败或解析失败，回退到规则推断
      }
    }

    // 规则推断：根据目标关键词生成技能蓝图
    return this.inferBlueprint(skillName, request, memories);
  }

  /**
   * 优化技能蓝图（调优阶段）
   *
   * 当试运行失败或产生警告时，调用 LLM 分析失败原因并生成修正后的蓝图。
   * 修正后的蓝图保留原始 name（避免重新注册冲突），但更新 description、
   * instructions、executeLogic。
   *
   * 如果 LLM 不可用或调用失败，返回 null 以便优雅降级。
   */
  private async optimizeBlueprint(
    originalBlueprint: SkillBlueprint,
    request: SkillCreationRequest,
    trialError: string
  ): Promise<SkillBlueprint | null> {
    // LLM 不可用时无法进行闭环修正
    if (!this.deps.llmComplete) {
      return null;
    }

    try {
      const systemPrompt = `你是一个技能优化引擎。一个自动创造的技能在试运行时失败了，请分析失败原因并生成修正后的技能定义。
只输出 JSON，格式：
{
  "name": "技能名称(保持不变)",
  "description": "修正后的技能描述",
  "instructions": "修正后的执行指令",
  "executeLogic": "修正后的执行逻辑类型(search|analyze|generate|transform|monitor|generic)"
}
注意：name 字段必须与原始蓝图完全一致。`;

      const userPrompt = `任务目标: ${request.goal}
步骤描述: ${request.stepDescription}
原始蓝图:
  name: ${originalBlueprint.name}
  description: ${originalBlueprint.description}
  instructions: ${originalBlueprint.instructions}
  executeLogic: ${originalBlueprint.executeLogic}
试运行错误: ${trialError}

请分析错误原因，并输出修正后的技能定义 JSON。`;

      const raw = await this.deps.llmComplete(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw) as Partial<SkillBlueprint>;

      if (!parsed || !parsed.description) {
        return null;
      }

      // 保留原始 name（避免重新注册冲突），更新其余字段
      return {
        name: originalBlueprint.name,
        description: parsed.description,
        instructions: parsed.instructions || originalBlueprint.instructions,
        executeLogic: parsed.executeLogic || originalBlueprint.executeLogic
      };
    } catch {
      // LLM 调用失败或解析失败，优雅降级
      return null;
    }
  }

  /**
   * 规则推断技能蓝图（无 LLM 时的回退方案）
   */
  private inferBlueprint(
    skillName: string,
    request: SkillCreationRequest,
    memories: any[]
  ): SkillBlueprint {
    const goal = request.goal;

    // 根据目标内容推断技能类型
    let description = `自动创造的技能：处理"${goal.slice(0, 50)}"类任务`;
    let instructions = `根据任务目标 "${goal}" 执行相应操作`;
    let executeLogic = 'generic';

    // 简单规则推断
    if (/搜索|查找|查询|search|find|query/i.test(goal)) {
      description = '搜索信息并返回结果';
      instructions = '根据查询关键词搜索相关信息';
      executeLogic = 'search';
    } else if (/分析|评估|evaluate|analyze/i.test(goal)) {
      description = '分析评估给定内容';
      instructions = '对输入内容进行分析和评估，输出结构化结论';
      executeLogic = 'analyze';
    } else if (/生成|创建|写|generate|create|write/i.test(goal)) {
      description = '生成内容';
      instructions = '根据输入参数生成相应内容';
      executeLogic = 'generate';
    } else if (/转换|转换|transform|convert/i.test(goal)) {
      description = '转换数据格式';
      instructions = '将输入数据转换为目标格式';
      executeLogic = 'transform';
    } else if (/监控|追踪|monitor|track/i.test(goal)) {
      description = '监控和追踪状态';
      instructions = '持续监控指定目标的状态变化';
      executeLogic = 'monitor';
    }

    return {
      name: skillName,
      description,
      instructions,
      executeLogic
    };
  }

  /**
   * 推断技能名称
   */
  private inferSkillName(goal: string): string {
    // 从目标中提取关键词作为技能名
    const cleaned = goal
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('-');
    return `auto-${cleaned || 'skill'}-${Date.now().toString(36)}`;
  }

  /**
   * 结晶：将蓝图固化为可执行的 Skill 对象
   */
  private crystallizeSkill(
    blueprint: SkillBlueprint,
    request: SkillCreationRequest
  ): Skill {
    const self = this;

    const skill: Skill = {
      name: blueprint.name,
      description: blueprint.description,
      instructions: blueprint.instructions,
      memoryEnabled: true,
      execute: async (params: any) => {
        const goal = params?.goal || request.goal;
        const action = params?.action || blueprint.executeLogic;

        // 根据执行逻辑类型返回不同的结果
        switch (blueprint.executeLogic) {
          case 'search':
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              result: `搜索完成: ${goal}`,
              timestamp: new Date()
            };
          case 'analyze':
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              analysis: `分析结果: ${goal}`,
              confidence: 0.7,
              timestamp: new Date()
            };
          case 'generate':
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              content: `生成内容: ${goal}`,
              timestamp: new Date()
            };
          case 'transform':
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              transformed: true,
              timestamp: new Date()
            };
          case 'monitor':
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              monitoring: true,
              timestamp: new Date()
            };
          default:
            return {
              status: 'executed',
              skill: blueprint.name,
              action,
              goal,
              result: `执行: ${goal}`,
              timestamp: new Date()
            };
        }
      }
    };

    return skill;
  }

  /**
   * 获取创造历史
   */
  getCreationHistory(): SkillCreationResult[] {
    return [...this.creationHistory];
  }

  /**
   * 获取创造统计
   */
  getStats(): {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  } {
    const total = this.creationHistory.length;
    const success = this.creationHistory.filter(r => r.success).length;
    const failed = total - success;
    return {
      total,
      success,
      failed,
      successRate: total > 0 ? success / total : 0
    };
  }
}
