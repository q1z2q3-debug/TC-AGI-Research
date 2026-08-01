# TC-AGI-Research

## 四元一体 AGI 生命体框架

**TC-AGI-Research** 是一个探索 AGI（通用人工智能）生命体的研究性项目，基于 **四元一体** 架构设计：

- **意识形态层 (Ideology Layer)**：定义 AGI 的灵魂、信念、价值观与行为准则
- **认知空间层 (Cognitive Space Layer)**：Trit九维向量、卦象坐标、π/e 动态调节
- **研究引擎层 (Engine Layer)**：推理、学习、决策、任务分解与规划
- **生命体实例层 (Instance Layer)**：具体行动、工具调用、交互、任务执行

## 核心设计理念

### 1. 三元索引记忆系统
- **卦象索引 (0~19682)**：九维三态空间坐标，粗粒度定位
- **π 展开深度 (1~10)**：波动度决定精度深度，细粒度聚类
- **e 呼吸相位**：时间活性权重（7天半衰期），记忆永不枯竭

### 2. 九维 Trit 认知向量
- **时间维度**：过去·现在·未来
- **空间维度**：内·中·外
- **因果维度**：因·缘·果

### 3. DeepSeekCognize 认知循环
- **觉知 (perceive / perceiveLLM)**：输入 → Trit分解 → 卦象 → π/e调节
  - 默认本地规则引擎；配置 `DEEPSEEK_API_KEY` 后由 DeepSeek LLM 抽取语义向量（网络异常自动降级）
- **推理 (reason)**：状态 → 策略派生（扩张/收缩/观察）
- **进化 (evolve)**：结果反馈 → **增量**调整认知向量（只动被结果证实/证伪的维度，避免向量饱和）
- **自知 (get_state)**：完整态势快照

### 4. 自我进化机制
每次任务完成后由引擎层 `evolveFromResults` 自动执行：
1. 复盘全过程（成功/失败）
2. **LLM 失败归因**（仅失败且已接入 LLM 时）：穿透表面报错，定位根因、归类、给出修正建议与可复用教训
3. 写入记忆（持久化；归因作为独立标签 `failure-attribution` + 失败类别，便于后续检索）
4. 优化流程（新技能/新工具）

> 失败归因由 DeepSeek LLM 完成；未配置 `DEEPSEEK_API_KEY` 或 LLM 异常/解析失败时，自动降级为"成功/失败"二元复盘，绝不阻断主流程。

### 5. 语义检索与 LLM 失败归因

#### 5.1 技能/工具语义检索（替代关键词匹配）
引擎在任务分解时，不再用脆弱的 `goal.includes(skill)` 子串匹配，而是通过 **余弦相似度** 从向量索引中检索最相关的技能与工具：
- **嵌入来源**：默认本地 **Ollama**（`nomic-embed-text`），零 API 成本、零密钥
- **优雅降级**：Ollama 不可达 / 未配置时，自动回退关键词匹配，绝不报错
- **阈值可调**：`matchSkills(goal, topK, threshold)`，默认阈值 `0.25` 过滤弱相关

#### 5.2 LLM 失败归因（真正的复盘）
`evolveFromResults` 在任务失败时调用 LLM（依赖可注入的 `LLMProvider` 接口，真实实现为 `DeepSeekClient`），将复盘材料交给模型，返回结构化归因：

```typescript
interface FailureAttribution {
  rootCause: string;        // 一句话根因（聚焦真正原因）
  failedStep: string | null;// 失败步骤 id
  category:                 // skill_mismatch | tool_failure | param_error
    | 'skill_mismatch'      //   | dependency_blocked | timeout | llm_error | unknown
    | 'tool_failure' | 'param_error' | 'dependency_blocked'
    | 'timeout' | 'llm_error' | 'unknown';
  correctiveAction: string; // 针对根因的修正建议
  confidence: number;       // 0~1 归因置信度
  lesson: string;           // 一句可复用教训
}
```

归因结果会：
- 写入记忆（内容含 `attribution`，标签含 `failure-attribution` 与失败类别）；
- 驱动认知空间（`perceive("任务失败·根因[category]: lesson")` 而非泛化字符串）；
- 通过 `evolved` 事件与控制台输出，便于运维与调试。

## 目录结构

```
TC-AGI-Research/
├── src/
│   ├── core/               # 核心层
│   │   ├── ideology.ts     # 意识形态层（含合规守卫）
│   │   ├── engine.ts       # 研究引擎层
│   │   └── instance.ts     # 生命体实例层
│   ├── cognitive/          # 认知空间层
│   │   ├── trit-vector.ts  # 九维向量运算
│   │   ├── cognitive-space.ts # 认知空间管理
│   │   ├── deepseek-cognize.ts # 认知循环（接真实 LLM）
│   │   ├── semantic.ts     # 语义坐标映射（认知/记忆共用）
│   │   ├── llm.ts          # DeepSeek 客户端（优雅降级）
│   │   └── embedding.ts    # 本地 Ollama 语义嵌入（余弦检索，降级关键词）
│   ├── memory/             # 记忆系统
│   │   ├── memory-system.ts
│   │   └── memory-store.ts
│   ├── skills/             # 技能系统
│   │   └── skill-loader.ts
│   ├── tools/              # MCP工具适配
│   │   └── mcp-adapter.ts
│   ├── scheduler/          # 定时任务
│   │   └── cron-scheduler.ts
│   ├── daemon.ts           # 持久化运行器
│   └── index.ts            # 入口
├── tests/                  # Jest 单元测试
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

# 运行单元测试
npm test

# 启动四元一体 AGI（一次性）
npm run dev

# 持久化运行（固定间隔持续认知循环，支持优雅退出）
npm run start:daemon
```

## 环境变量

复制 `.env.example` 为 `.env` 后填写：

| 变量 | 说明 | 默认 |
|:----|:-----|:----|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥；**留空则用本地规则引擎**。配置后同时启用：认知层语义觉知 + 引擎层 LLM 失败归因 | 空 |
| `DEEPSEEK_BASE_URL` | DeepSeek 端点 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名 | `deepseek-chat` |
| `LOOP_INTERVAL_SEC` | 守护进程循环间隔（秒） | `30` |
| `EMBEDDING_ENABLED` | 是否启用语义嵌入检索 | `true` |
| `EMBEDDING_BASE_URL` | Ollama embeddings 端点 | `http://localhost:11434` |
| `EMBEDDING_MODEL` | 嵌入模型名 | `nomic-embed-text` |

> 密钥只从环境变量读取，绝不硬编码进仓库；`.env` 已被 `.gitignore` 忽略。

## 使用示例

```typescript
import { TCAGI4, getDefaultAGI, getCognitiveSnapshot } from 'tc-agi-research';

const agi = new TCAGI4();
await agi.start();

// 提交任务
const result = await agi.submitTask('研究2026年AI Agent的最新趋势');
console.log(result);

// 直接驱动认知循环（可接入 LLM）
const cognize = agi.getComponents().cognize;
cognize.setLLM(/* DeepSeekClient */);
const cycle = await cognize.cycle('反思最近一次失败，提炼教训');
console.log(cycle.snapshot);

// 查看认知态势
const snapshot = agi.getCognitiveSnapshot();
console.log(snapshot.dimensionAnalysis);

// 关闭系统
await agi.shutdown();
```

## 版本

v0.3.1-attribution

## 许可证

MIT
