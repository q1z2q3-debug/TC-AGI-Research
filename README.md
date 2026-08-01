# TC-AGI-Research

## 四元一体 AGI 生命体框架

**TC-AGI-Research** 是一个探索 AGI（通用人工智能）生命体的研究性项目，基于 **四元一体** 架构设计：

- **意识形态层 (Ideology Layer)**：定义 AGI 的灵魂、信念、价值观与行为准则
- **认知空间层 (Cognitive Space Layer)**：Trit九维向量、卦象坐标、π/e 动态调节
- **研究引擎层 (Engine Layer)**：推理、学习、决策、任务分解与规划
- **生命体实例层 (Instance Layer)**：具体行动、工具调用、交互、任务执行

## 核心设计理念

### 1. 三元索引记忆系统（v0.5 升级）
- **卦象索引 (0~19682)**：九维三态空间坐标，粗粒度定位
- **π 展开深度 (1~10)**：波动度决定精度深度，细粒度聚类
- **e 呼吸相位**：时间活性权重（7天半衰期），记忆永不枯竭
- **三元认知距离检索**：使用复合距离（Hamming+Manhattan+Euclidean+Cosine）替代关键词匹配
- **批量写入 + 防抖（v0.5 新增）**：MemoryStore 使用 500ms 防抖定时器合并频繁的写入操作，将多次 I/O 合并为一次批量持久化，显著降低磁盘 I/O 压力

### 2. 九维 Trit 认知向量
- **时间维度**：过去·现在·未来
- **空间维度**：内·中·外
- **因果维度**：因·缘·果
- 每维取值 {-1, 0, +1}，共 3^9 = 19683 种认知状态

### 3. 认知距离函数系统（v0.4 新增）

六种距离度量，捕捉认知向量间不同的"差异语义"：

| 距离 | 语义 | 范围 |
|------|------|------|
| Hamming | 有几个维度不同 | 0~9 |
| Manhattan | 每维差的绝对值之和 | 0~18 |
| Euclidean | 欧几里得距离（阴阳对立比阴到和更远） | 0~6 |
| Cosine | 方向是否一致 | 0~2 |
| Weighted | π/e/γ 三组权重加权的曼哈顿距离 | 0~1 |
| Composite | 多距离加权融合（默认用于原型匹配与记忆检索） | 0~1 |

数学常数权重：
- π (3.14159) → 空间维度权重（空间展开的广度）
- e (2.71828) → 时间维度权重（时间演化的连续性）
- γ (0.57722) → 因果维度权重（欧拉常数，因果链的稀疏性）

### 4. 认知原型与极限环（v0.5 升级）

在 19683 种认知状态中，真正稳定的"吸引子"只有五个认知原型：

| 原型 | 五行 | 向量特征 | 行动提示 |
|------|------|---------|---------|
| 扩张态 | 木 | 全阳 | expand |
| 收缩态 | 金 | 全阴 | contract |
| 观察态 | 水 | 全和 | observe |
| 转化态 | 火 | 阴阳对冲 | transform |
| 创生态 | 土 | 混合正向 | create |

**Φ 序参量**：衡量认知系统在历史轨迹中有多少比例处于稳定原型附近。Φ 高 → 认知稳定，Φ 低 → 认知混沌。

**原型发现（v0.5 新增）**：从历史认知轨迹中自动发现新的"个性化吸引子"。通过频率统计、稳定性过滤、去重与聚类合并，识别出系统反复回到的复合状态。发现的原型动态注册，使认知系统具备经验学习能力。

### 5. 三元逻辑门与"和"态涌现（v0.4 新增）

在二元逻辑（0/1）中，AND/OR 只能产生 0 或 1。但在三元逻辑（-1/0/+1）中，"和"态（0）可以作为对立力量的平衡而涌现。

核心创新门 —— **MID 门（取中门）**：
- 当阴(-1)和阳(+1)同时输入时，MID 产生和(0)
- 模拟"对立力量达到平衡时涌现出新的中间态"
- 认知层面：内心想推进(+1)但外部受阻(-1)时，MID 产生"和"态——悬置、观察、等待新信息

其他门：NOT（取反）、MIN（取小/阴主导）、MAX（取大/阳主导）、SHIFT（移位）、MERGE（融合）、CONSENSUS（共识投票）、BALANCE（平衡）

### 6. 空引擎 · 技能创造闭环（v0.5 升级）

"无中生有"——当技能不存在时，从空态（全0向量）出发，通过九步爻变涌现新技能：

1. **归零**：认知状态归零，进入空态
2. **感应**：感知缺失技能的需求上下文
3. **聚形**：根据需求生成技能蓝图（LLM 增强或规则推断）
4. **结晶**：将蓝图固化为可执行的 Skill 对象
5. **注册**：将新技能注册到 SkillLoader
6. **试行**：执行一次试运行验证
7. **调优**：根据试运行结果修正（**v0.5：LLM 闭环修正**——试运行失败时，调用 LLM 分析错误原因并重新生成修正蓝图，重新结晶、注册、再试运行，最多重试一次）
8. **固化**：写入记忆系统作为"已创造技能"记录
9. **归元**：认知状态回归，创造完成

### 7. 主动推理引擎（v0.5 升级）

基于自由能最小化原理（Free Energy Principle, Friston 2010），在九维三元认知空间中实现状态转移决策：

- **感知**：更新内部模型以更好地预测当前状态
- **行动**：选择能将认知状态推向目标原型的行动
- **自由能** ≈ 预测状态与目标原型之间的认知距离

v0.5 新增能力：

#### 精度加权自由能（Precision Weighting）
精度 π_d 表示认知系统对维度 d 的预测置信度。高精度维度的预测误差对自由能贡献更大，使认知系统能"聚焦"于当前最关键的维度。

场景化精度预设：
| 预设 | 场景 | 加权维度 |
|------|------|---------|
| execution | 执行任务 | 因果维度（cause/condition/effect）|
| observation | 观察学习 | 时间维度（past/present/future）|
| crisis | 危机应对 | 外部+因果维度（external/cause）|

#### 环境模型（Environmental Model）
认知行动不仅影响内部状态，还影响外部环境。环境模型追踪：
- 外部世界的认知投影（external/medial 维度）
- 环境稳定性（预测准确度反馈调节）
- 行动对环境的历史响应记录

五种行动的环境响应规则：
| 行动 | 环境效应 | 稳定性影响 |
|------|---------|-----------|
| expand | 外部条件改善 | 预测准确→稳定+ |
| contract | 外部条件可能恶化 | 预测准确→稳定+ |
| observe | 环境不变 | 稳定 |
| transform | 环境剧烈波动 | 稳定- |
| create | 环境缓慢改善 | 稳定+ |

支持多步预测（模拟未来认知轨迹）和自由能历史分析（趋势检测与收敛判断）。

### 8. DeepSeekCognize 认知循环（v0.5 升级）
- **觉知 (perceive / perceiveLLM)**：输入 → Trit分解 → 卦象 → π/e调节
  - 默认本地规则引擎（**v0.5：中英文双语关键词映射**）；配置 `DEEPSEEK_API_KEY` 后由 DeepSeek LLM 抽取语义向量（网络异常自动降级）
- **推理 (reason)**：状态 → 策略派生（**v0.5：统一策略派生**——LLM 可用时由 LLM 根据认知向量派生策略，不可用时回退规则派生；两条路径都集成主动推理精度加权 + 环境模型）
- **进化 (evolve)**：结果反馈 → **增量**调整认知向量
- **自知 (get_state)**：完整态势快照

### 9. 语义检索与 LLM 失败归因

#### 技能/工具语义检索
通过 **余弦相似度** 从向量索引中检索最相关的技能与工具：
- **嵌入来源**：默认本地 **Ollama**（`nomic-embed-text`），零 API 成本
- **优雅降级**：Ollama 不可达时，自动回退关键词匹配

#### LLM 失败归因
`evolveFromResults` 在任务失败时调用 LLM，返回结构化归因：
- rootCause（根因）、category（失败类别）、correctiveAction（修正建议）、lesson（可复用教训）
- 无 LLM 时自动降级为"成功/失败"二元复盘

## 目录结构

```
TC-AGI-Research/
├── src/
│   ├── core/               # 核心层
│   │   ├── ideology.ts     # 意识形态层（含合规守卫）
│   │   ├── engine.ts       # 研究引擎层（统一策略派生 + 主动推理 + 空引擎集成 + 环境模型）
│   │   └── instance.ts     # 生命体实例层
│   ├── cognitive/          # 认知空间层
│   │   ├── trit-vector.ts  # 九维向量运算（含四种距离度量）
│   │   ├── distance.ts     # 认知距离函数系统（六种距离 + 复合融合）
│   │   ├── prototypes.ts   # 认知原型与极限环（五大原型 + Φ序参量 + 原型发现）
│   │   ├── trit-gates.ts   # 三元逻辑门（和态涌现 + 极化分析）
│   │   ├── null-engine.ts  # 空引擎（九步爻变技能创造闭环 + LLM闭环修正）
│   │   ├── active-inference.ts # 主动推理引擎（精度加权自由能 + 环境模型）
│   │   ├── cognitive-space.ts  # 认知空间管理
│   │   ├── deepseek-cognize.ts # 认知循环（接真实 LLM）
│   │   ├── semantic.ts     # 语义坐标映射（中英文双语，认知/记忆共用）
│   │   ├── llm.ts          # DeepSeek 客户端（优雅降级）
│   │   └── embedding.ts    # 本地 Ollama 语义嵌入（余弦检索）
│   ├── memory/             # 记忆系统
│   │   ├── memory-types.ts # 统一类型定义（唯一事实来源）
│   │   ├── memory-system.ts # 三元距离检索记忆系统
│   │   └── memory-store.ts  # 持久化存储（批量写入 + 防抖）
│   ├── skills/             # 技能系统
│   │   └── skill-loader.ts
│   ├── tools/              # MCP工具适配
│   │   └── mcp-adapter.ts
│   ├── scheduler/          # 定时任务
│   │   └── cron-scheduler.ts
│   ├── daemon.ts           # 持久化运行器
│   └── index.ts            # 入口
├── tests/                  # Jest 单元测试 + 端到端集成测试
├── .env.example            # 环境变量示例
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

```bash
# 安装依赖
npm install

# 构建（TypeScript → dist）
npm run build

# 运行全部测试（115 个测试，含端到端集成测试）
npm test

# 启动四元一体 AGI（一次性）
npm run dev

# 持久化运行（固定间隔持续认知循环）
npm run start:daemon
```

## 环境变量

复制 `.env.example` 为 `.env` 后填写：

| 变量 | 说明 | 默认 |
|:----|:-----|:----|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥；留空则用本地规则引擎。配置后同时启用：认知层语义觉知 + 引擎层 LLM 失败归因 + 空引擎 LLM 技能创造 | 空 |
| `DEEPSEEK_BASE_URL` | DeepSeek 端点 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名 | `deepseek-chat` |
| `LOOP_INTERVAL_SEC` | 守护进程循环间隔（秒） | `30` |
| `EMBEDDING_ENABLED` | 是否启用语义嵌入检索 | `true` |
| `EMBEDDING_BASE_URL` | Ollama embeddings 端点 | `http://localhost:11434` |
| `EMBEDDING_MODEL` | 嵌入模型名 | `nomic-embed-text` |

> 密钥只从环境变量读取，绝不硬编码进仓库；`.env` 已被 `.gitignore` 忽略。

## 使用示例

```typescript
import { TCAGI4 } from 'tc-agi-research';

const agi = new TCAGI4();
await agi.start();

// 提交任务（认知感知 → 策略派生 → 步骤执行 → 复盘进化）
const result = await agi.submitTask('研究2026年AI Agent的最新趋势');
console.log(result);

// 认知距离与原型匹配
import { CognitiveDistance, PrototypeMatcher } from 'tc-agi-research';
const dist = CognitiveDistance.composite(vectorA, vectorB);
const proto = PrototypeMatcher.snapTo(currentVector);

// 主动推理决策（v0.5：精度加权 + 环境模型）
import { ActiveInference, EnvironmentalModel, PRECISION_PRESETS } from 'tc-agi-research';
const envModel = new EnvironmentalModel();
const inference = ActiveInference.infer(currentVector, history, {
  precisionPreset: 'execution',  // 执行模式：因果维度加权
  environment: envModel,         // 启用环境感知自由能
  environmentWeight: 0.2
});
console.log(inference.bestAction);

// 原型发现（v0.5：从历史轨迹中学习吸引子）
import { PrototypeDiscovery } from 'tc-agi-research';
const discoveries = PrototypeDiscovery.discover(history, { minOccurrences: 3 });
console.log(discoveries);  // 发现的个性化认知原型

// 三元逻辑门（和态涌现）
import { vectorMid, isHeEmergent } from 'tc-agi-research';
const merged = vectorMid(yangVector, yinVector);
const analysis = isHeEmergent(merged);

// 关闭系统
await agi.shutdown();
```

## 测试覆盖

| 测试文件 | 测试数 | 覆盖内容 |
|---------|--------|---------|
| `trit-vector.test.ts` | 4 | 向量运算、卦象索引、距离度量 |
| `distance.test.ts` | 18 | 六种距离度量 + 边界值 + nearestK |
| `prototypes.test.ts` | 12 | 五大原型、Φ序参量、极限环分析 |
| `trit-gates.test.ts` | 18 | 标量门 + 向量门 + 和态分析 |
| `active-inference.test.ts` | 10 | 主动推理、多步预测、自由能分析 |
| `null-engine.test.ts` | 7 | 技能创造、执行、去重、推断 |
| `evolve-attribution.test.ts` | 4 | LLM归因、降级、非法JSON |
| `semantic.test.ts` | 6 | 语义映射、确定性坐标 |
| `embedding.test.ts` | 9 | 余弦相似度、语义检索、降级 |
| `ideology.test.ts` | 3 | 合规守卫、价值观 |
| `integration.test.ts` | 22 | 端到端全流程集成测试 |
| **总计** | **115** | |

## 版本

v0.5.0-deep-evolution

## 许可证

MIT
