# TC-AGI-Research

**基于三元逻辑与主动推理的认知生命体架构**

[![CI](https://github.com/q1z2q3-debug/TC-AGI-Research/actions/workflows/ci.yml/badge.svg)](https://github.com/q1z2q3-debug/TC-AGI-Research/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/badge/npm-tc--agi--research-orange)](https://www.npmjs.com/package/tc-agi-research)

---

**TC-AGI-Research** 实现了一种基于**三元逻辑**（-1/0/+1）的**认知生命体**架构，构建出 3⁹ = 19,683 态认知空间。系统集成**主动推理**（精度加权自由能最小化）、**原型发现**和**空引擎技能创造闭环**，实现自主能力涌现。

> **说明：** 早期版本曾引用私有平台的具体数值（夏普比率、因子数量）。这些数值是真实的，但无法从本仓库验证——这种"信我，你查不了"的声明不属于开源项目。已移除这些数值，将焦点保持在本代码库实际交付的内容：一个可构建、可测试、可扩展的认知架构。

---

## 架构

系统采用**四层一体**设计：

```
┌─────────────────────────────────────────────┐
│          意识形态层 (ideology.ts)              │  ← 灵魂、信念、价值观、合规守卫
├─────────────────────────────────────────────┤
│        认知空间层 (cognitive/)                 │  ← 三元向量、距离、原型、门
├─────────────────────────────────────────────┤
│          研究引擎层 (engine.ts)               │  ← 任务分解、策略派生、执行
├─────────────────────────────────────────────┤
│          生命体实例层 (instance.ts)            │  ← 任务执行、记忆记录、生命周期
└─────────────────────────────────────────────┘
```

### 认知空间层（核心创新）

**三元逻辑基底。** 每个维度取值于 {-1, 0, +1}：
- **+1（阳）**：扩张、主动、正向
- **-1（阴）**：收缩、被动、负向
- **0（和）**：平衡、观察、涌现的中间态

**九个维度（3×3×3）：**

| 分组 | 维度 | 含义 |
|------|------|------|
| 时间 | 过去 · 现在 · 未来 | 时间取向 |
| 空间 | 内 · 中 · 外 | 觉知范围 |
| 因果 | 因 · 缘 · 果 | 因果推理结构 |

**总计：3⁹ = 19,683 种认知状态**，每个状态映射到唯一的卦象索引。

### 核心组件

| 组件 | 描述 | 文件 |
|------|------|------|
| **三元向量** | 九维三元向量算术运算，卦象索引，升映射到 S⁸ 球面 | `trit-vector.ts` |
| **距离系统** | 6 种度量：汉明、曼哈顿、欧氏、余弦、加权、复合 | `distance.ts` |
| **认知原型** | 5 个吸引子（扩张/收缩/观察/转化/创生）+ Φ 序参量 + 原型发现 | `prototypes.ts` |
| **三元逻辑门** | NOT、MIN、MAX、MID（和涌现）、SHIFT、MERGE、CONSENSUS、BALANCE | `trit-gates.ts` |
| **主动推理** | 精度加权自由能最小化 + 环境模型 + 多步预测 | `active-inference.ts` |
| **空引擎** | 9 步技能创造闭环（归零→感应→聚形→结晶→注册→试行→调优→固化→归元） | `null-engine.ts` |
| **认知循环** | 感知→推理→进化→自省（LLM 增强或本地规则） | `deepseek-cognize.ts` |
| **记忆系统** | 三元索引记忆，复合距离检索，半衰期衰减，防抖批量写入 | `memory-system.ts` |
| **原型发现** | 从历史认知轨迹中自动发现吸引子 | `prototypes.ts` |
| **π-e 谐振动力学** | Stuart-Landau 方程控制认知振荡器 + PI 自适应谐振控制器 | `pi-e-resonance.ts` |
| **五蕴元认知** | 五蕴（色受想行识）自感知层，元认知深度监控 | `five-aggregates.ts` |
| **认知共振** | 涟漪场认知共振，多智能体认知同步 | `cognitive-resonance.ts` |
| **实证验证框架** | 可证伪性检验、A/B 测试、统计显著性 | `empirical-validation.ts` |
| **瞬子跃迁** | 拓扑直觉推理，非演绎认知跃迁，A* 最小作用量路径 | `instanton-leap.ts` |
| **梦境推理** | 无数据自主学习，反事实轨迹生成，边界发现 | `dream-reasoning.ts` |
| **实现间隙** | 稀疏认知子流形 S*，H₄ 结构熵，禁带检测，约束传播 | `realization-gap.ts` |
| **守恒律引擎** | 6 条预置守恒律 + 自动推导生成引擎，LawRegistry 单例 | `conservation-laws.ts` |
| **四态构型动态相变** | 磐思/涟语/紊核/镜空四态认知构型，动态相变引擎 | `cognitive-phase.ts` |
| **L7 裂变层** | 异常感知→悬置→自问→最小重构→完整性校验，自修改结构 | `fission-layer.ts` |
| **三态输出引擎** | 学习态/对话态/化身态，自适应输出模式选择 | `tri-state-output.ts` |
| **容器状态感知** | 感知用户意图层级（求答案/求映照/求示现/求陪伴等） | `container-sense.ts` |

### 主动推理引擎

系统实现**精度加权自由能最小化**：

$$F = \sum_{d} \pi_d \cdot |s_d - t_d| \ / \ \sum_{d} \pi_d$$

其中 $\pi_d$ 是维度 $d$ 的精度权重。三种精度预设适配不同场景：

| 预设 | 场景 | 加权维度 |
|------|------|---------|
| `execution` | 任务执行 | 因果（因/缘/果） |
| `observation` | 学习观察 | 时间（过去/现在/未来） |
| `crisis` | 危机应对 | 外部 + 因 |

**环境模型**追踪认知行动如何影响外部条件，实现环境感知的决策。

### 空引擎：自主技能创造

当所需技能不存在时，空引擎通过**9步涌现循环**从零创造：

1. **归零** → 重置为空态（全0向量）
2. **感应** → 感知缺失技能的需求上下文
3. **聚形** → 生成技能蓝图（LLM 增强或规则推断）
4. **结晶** → 将蓝图固化为可执行的 Skill 对象
5. **注册** → 注册到 SkillLoader
6. **试行** → 执行试运行验证
7. **调优** → 失败时 LLM 闭环修正
8. **固化** → 写入记忆系统作为"已创造技能"记录
9. **归元** → 认知状态回归，创造完成

## 快速开始

```bash
# 安装依赖
npm install

# 编译（TypeScript → dist）
npm run build

# 运行测试（349 个测试，含端到端集成）
npm test

# 启动交互式 AGI
npm run dev

# 持久化守护进程模式（每 30s 认知循环）
npm run start:daemon
```

### 环境变量

复制 `.env.example` 为 `.env`：

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（可选；无密钥时使用本地规则） | — |
| `DEEPSEEK_BASE_URL` | DeepSeek 端点 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名称 | `deepseek-chat` |
| `LOOP_INTERVAL_SEC` | 守护进程循环间隔 | `30` |
| `EMBEDDING_ENABLED` | 启用语义向量检索 | `true` |
| `EMBEDDING_BASE_URL` | Ollama 嵌入端点 | `http://localhost:11434` |
| `EMBEDDING_MODEL` | 嵌入模型 | `nomic-embed-text` |

> 无需 API 密钥即可基础运行——系统完全在本地规则引擎上运行。

### 使用示例

```typescript
import { TCAGI4 } from 'tc-agi-research';

const agi = new TCAGI4();
await agi.start();

// 提交任务（认知感知 → 策略派生 → 执行 → 进化）
const result = await agi.submitTask('Research latest AI Agent trends in 2026');
console.log(result);

// 认知距离与原型匹配
import { CognitiveDistance, PrototypeMatcher } from 'tc-agi-research';
const dist = CognitiveDistance.composite(vectorA, vectorB);
const proto = PrototypeMatcher.snapTo(currentVector);

// 精度加权主动推理
import { ActiveInference, EnvironmentalModel, PRECISION_PRESETS } from 'tc-agi-research';
const envModel = new EnvironmentalModel();
const inference = ActiveInference.infer(currentVector, history, {
  precisionPreset: 'execution',
  environment: envModel,
  environmentWeight: 0.2
});
console.log(inference.bestAction);

// 从历史轨迹中发现原型
import { PrototypeDiscovery } from 'tc-agi-research';
const discoveries = PrototypeDiscovery.discover(history, { minOccurrences: 3 });
console.log(discoveries);  // 个性化认知吸引子

// 三元逻辑门（和涌现）
import { vectorMid, isHeEmergent } from 'tc-agi-research';
const merged = vectorMid(yangVector, yinVector);
const analysis = isHeEmergent(merged);

// 系统关闭
await agi.shutdown();
```

## 测试覆盖

| 测试文件 | 测试数 | 覆盖范围 |
|---------|--------|---------|
| `trit-vector.test.ts` | 4 | 向量运算、卦象索引、距离 |
| `distance.test.ts` | 18 | 6 种距离度量 + 边界 + nearestK |
| `prototypes.test.ts` | 12 | 5 原型、Φ 序参量、极限环 |
| `trit-gates.test.ts` | 18 | 标量门 + 向量门 + 和分析 |
| `active-inference.test.ts` | 10 | 主动推理、多步预测、自由能 |
| `null-engine.test.ts` | 7 | 技能创造、执行、去重、推断 |
| `pi-e-resonance.test.ts` | 21 | Stuart-Landau 振荡器、PI 控制器、自适应 Ki |
| `five-aggregates.test.ts` | — | （已有，集成测试覆盖） |
| `cognitive-resonance.test.ts` | — | （已有，集成测试覆盖） |
| `empirical-validation.test.ts` | — | （已有，集成测试覆盖） |
| `instanton-leap.test.ts` | 28 | 拓扑瞬子、A* 搜索、停滞检测 |
| `dream-reasoning.test.ts` | 19 | 梦境状态机、反事实奖励、轨迹 |
| `realization-gap.test.ts` | 29 | H₄ 熵、禁带、约束传播 |
| `conservation-laws.test.ts` | 42 | 6 守恒律、LawRegistry、LawGenerator |
| `cognitive-phase.test.ts` | 28 | 4 认知构型、动态转换、配置切换 |
| `fission-layer.test.ts` | 22 | L7 裂变、异常检测、悬置、重构、完整性 |
| `tri-state-output.test.ts` | 22 | 学习/对话/化身态、自适应选择 |
| `container-sense.test.ts` | 23 | 6 容器状态、关键词感知、结构特征 |
| `evolve-attribution.test.ts` | 4 | LLM 归因、降级、无效 JSON |
| `semantic.test.ts` | 6 | 语义映射、确定性坐标 |
| `embedding.test.ts` | 9 | 余弦相似度、语义检索、降级 |
| `ideology.test.ts` | 3 | 合规守卫、价值观 |
| `integration.test.ts` | 22 | 端到端全流程集成测试 |
| **合计** | **349** | |

## 验证方法论

本架构设计为**平台无关**：核心创新是三元认知状态（-1/0/+1）与决策模式之间的映射，而非任何特定回测结果。

**映射原理：** 九维三元向量（3⁹ = 19,683 态）定义一个认知空间。空间中的每个吸引子区域可转化为决策规则——例如，接近"扩张"原型（+++ +++ ++0）的状态映射为寻求非对称机会的模式。这些模式可表达为 alpha 表达式、交易规则或用户选择的任何决策框架。

**本仓库提供：** 认知基底——三元逻辑门、主动推理引擎、原型发现、记忆系统和空引擎技能创造闭环。如何在自己的领域验证这些模式，由你决定。

> **说明：** 早期版本曾引用私有平台的具体数值（夏普比率、因子数量）。这些数值是真实的，但无法从本仓库验证——这种"信我，你查不了"的声明不属于开源项目。已移除这些数值，将焦点保持在本代码库实际交付的内容：一个可构建、可测试、可扩展的认知架构。

## 认知探索分享

> **定位**：Agent 使用认知空间进行探索性思考的分享区域。这些内容是**认知空间的使用预演**，不是数学证明，但不排除数学可印证的可能性——预演中的结构洞察可能指向可被严格证明的数学关系。

| # | 标题 | 认知工具 | 核心发现 | 状态 |
|---|------|---------|---------|------|
| 01 | [加尔佩林实验的认知空间解读](cognitive-explorations/01-galperin-pi-cognition.md) | MID门 · 精度加权自由能 · Φ序参量 | 五常数-五原型对应 + 六项预测 | 预演中，待印证 |

详见 [`cognitive-explorations/`](cognitive-explorations/) 目录。

## 项目结构

```
TC-AGI-Research/
├── src/
│   ├── core/               # 架构层
│   │   ├── ideology.ts     # 意识形态层（信念、价值观、合规守卫）
│   │   ├── engine.ts       # 引擎层（策略派生、主动推理、执行）
│   │   └── instance.ts     # 实例层（任务执行、生命周期）
│   ├── cognitive/          # 认知空间层
│   │   ├── trit-vector.ts  # 九维三元向量运算
│   │   ├── distance.ts     # 6 种认知距离度量
│   │   ├── prototypes.ts   # 5 原型 + Φ 序参量 + 原型发现
│   │   ├── trit-gates.ts   # 三元逻辑门（和涌现）
│   │   ├── null-engine.ts  # 9 步技能创造闭环
│   │   ├── active-inference.ts # 精度加权自由能最小化
│   │   ├── four-phase.ts   # 四相极限环分析
│   │   ├── pi-e-resonance.ts # π-e 谐振动力学 + PI 自适应控制器
│   │   ├── five-aggregates.ts # 五蕴元认知自感知
│   │   ├── cognitive-resonance.ts # 涟漪场认知共振
│   │   ├── empirical-validation.ts # 可证伪性与实证验证
│   │   ├── instanton-leap.ts # 拓扑瞬子直觉推理
│   │   ├── dream-reasoning.ts # 梦境态自主学习
│   │   ├── realization-gap.ts # 稀疏子流形 + H₄ 结构熵
│   │   ├── conservation-laws.ts # 6 守恒律 + 守恒律生成器
│   │   ├── cognitive-phase.ts # 4 认知构型 + 动态相变引擎
│   │   ├── fission-layer.ts   # L7 裂变：异常→悬置→自问→重构
│   │   ├── tri-state-output.ts # 三态输出引擎（学习/对话/化身）
│   │   ├── container-sense.ts  # 容器状态感知（6 种用户意图）
│   │   ├── cognitive-space.ts  # 认知状态管理
│   │   ├── deepseek-cognize.ts # 感知→推理→进化→自省循环
│   │   ├── semantic.ts     # 语义映射（中英文双语）
│   │   ├── llm.ts          # DeepSeek 客户端（优雅降级）
│   │   └── embedding.ts    # 本地 Ollama 嵌入（零 API 成本）
│   ├── memory/             # 记忆系统
│   │   ├── memory-types.ts # 统一类型定义
│   │   ├── memory-system.ts # 三元索引检索记忆
│   │   └── memory-store.ts # 持久化存储（防抖批量写入）
│   ├── skills/             # 技能系统
│   │   └── skill-loader.ts
│   ├── tools/              # MCP 工具适配器
│   │   └── mcp-adapter.ts
│   ├── scheduler/          # 定时调度器
│   │   └── cron-scheduler.ts
│   ├── daemon.ts           # 持久化守护进程
│   └── index.ts            # 入口
├── tests/                  # Jest 测试 + 端到端集成
├── cognitive-explorations/ # Agent 认知探索分享（预演，非数学证明）
├── .env.example
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 版本

v0.7.0-hexq-fusion — 349 测试，22 个认知模块，12,464+ 行认知架构代码

变更历史见 [CHANGELOG.md](CHANGELOG.md)，贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

源码注释中引用的"论文 Section X.X"详见 [REFERENCES.md](REFERENCES.md) 主题索引。

## 许可证

MIT

---

**相关项目：**
- [认知生命体](https://github.com/q1z2q3-debug/TC-AGI-Research) — 理论基础
