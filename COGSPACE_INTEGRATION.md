# 九维平衡三进制认知空间 — 工程落地文档

## 一、仓库分层简报与三大接入点位

### 仓库结构分析

TC-AGI-Research 原仓库为 TypeScript 项目，核心架构分四层：
- **意识形态层** (`src/core/ideology.ts`) — 价值观与原则约束
- **认知空间层** (`src/cognitive/`) — 九维三元向量、距离度量、语义映射
- **研究引擎层** (`src/core/engine.ts`) — 任务分解、策略派生、执行调度
- **生命体实例层** (`src/core/instance.ts`) — 自主闭环运行

### 三大接入点位

| # | 接入点 | 文件位置 | 函数/方法 | 集成方式 |
|---|--------|----------|-----------|----------|
| ① | Agent Harness 主循环入口 | `src/cognitive/autonomous-loop.ts` | `AutonomousLoop.executeSubTask()` (L275) | 前置插入 `AgentStep` 钩子 |
| ① | Agent Harness 主循环入口 | `src/core/engine.ts` | `EngineLayer.executeStep()` (L633) | 前置插入 `AgentStep` 钩子 |
| ② | 记忆读写/持久化模块 | `src/memory/memory-system.ts` | `MemorySystem.retrieve()` (L118) | 叠加 `CogMemory.SearchTopK` |
| ② | 记忆读写/持久化模块 | `src/memory/memory-store.ts` | `MemoryStore.save()` (L155) | 双写桥接 |
| ③ | 任务完成/终止判断 | `src/cognitive/autonomous-loop.ts` | `executePlan()` allDone (L236) | 叠加 `CheckTermination` |
| ③ | 任务完成/终止判断 | `src/core/engine.ts` | `executePlan()` allDoneSteps (L594) | 叠加 `CheckTermination` |

---

## 二、新增文件清单

### Go 模块（纯数学底层 + 认知记忆 + Agent钩子）

| 文件路径 | 功能 | 行数 |
|----------|------|------|
| `go.mod` | Go 模块定义 | 3 |
| `cogspace/cog_vector.go` | 底层数学算子（编解码/距离/融合/配置/快照） | ~400 |
| `cogspace/cog_test.go` | 单元测试（27项，含全量19683编解码验证） | ~450 |
| `agent/cog_memory.go` | 认知记忆池（定长存储/TopK/快照/桥接） | ~350 |
| `agent/cog_hook.go` | Agent认知钩子（前置/后置/双重终止/循环） | ~380 |
| `agent/cog_test.go` | Agent测试（26项，含并发安全/快照/循环） | ~400 |
| `cmd/cogspace-demo/main.go` | 完整调用示例 | ~150 |

### TypeScript 集成桥接

| 文件路径 | 功能 |
|----------|------|
| `src/integration/cog-hook-bridge.ts` | TS版认知算子 + 钩子 + 记忆池 + AutonomousLoop补丁 |

### 配置与提示词

| 文件路径 | 功能 |
|----------|------|
| `prompt/system_cog.md` | 认知架构全局系统提示词 |
| `.env.cogspace` | 环境配置参数（权重/阈值/TopK/快照路径） |

---

## 三、核心修复：Decode 平衡三进制负数取模 Bug

### 问题描述

原始 `Decode` 函数使用 Go 的 `%` 运算符处理余数，但 Go 的取模运算对负数保留被除数符号：

```
-1 % 3 = -1  (不是 2)
-2 % 3 = -2  (不是 1)
```

原始代码的 `switch mod { case 0/1/2 }` 无法匹配负数余数，导致约一半点位（val < 0 的区间，即 ID < 9841 的点位）解码为全零向量。

### 修复方案

使用标准平衡三进制转换算法：

```go
r := val % 3
if r == 2 {
    r = -1  // 余数2 → 平衡数字-1
} else if r == -2 {
    r = 1   // 余数-2 → 平衡数字+1
}
// r 现在一定是 {-1, 0, 1}
val = (val - r) / 3  // 精确除法
```

### 验证

全量 19683 点位编解码双向可逆测试通过，包括：
- 边界值（全阴 ID=0、全和 ID=9841、全阳 ID=19682）
- 负数区间专项测试（单维阴、混合正负）
- 正向+反向遍历

---

## 四、验收标准对照

| # | 验收标准 | 状态 | 验证方式 |
|---|----------|------|----------|
| 1 | 全量19683点位编解码双向可逆，无映射误差 | ✓ | `TestEncodeDecodeAll` + `TestEncodeDecodeAllReverse` |
| 2 | 汉明、欧式、加权曼哈顿距离数值精度正常 | ✓ | `TestDistHamming`/`TestDistEuclid`/`TestDistWeightedManhattan` |
| 3 | 认知记忆池读写、TopK邻近召回功能正常 | ✓ | `TestMemoryWriteRead`/`TestSearchTopK`/`TestSnapshotRoundTrip` |
| 4 | Agent长任务依靠空间收敛阈值双重校验，不会虚假提前终止 | ✓ | `TestTerminationCheck*`/`TestCogAgentLoop*` |
| 5 | 极端提问输入自动与原点中和，降低片面幻觉输出 | ✓ | `TestAgentStepExtreme`/`TestMergeNeutralize` |
| 6 | 所有模块增量接入，不破坏TC-AGI原有调度、ReAct、记忆持久化逻辑 | ✓ | TS桥接文件采用补丁模式，不修改原有类定义 |
| 7 | 单元测试全部通过，支持快照落盘、参数动态调优 | ✓ | 53项测试全通过，`TestConfigFromEnv`/`TestSnapshotRoundTrip` |

---

## 五、参数调优方案

### 动态调整 e/π/γ 权重

通过环境变量或 `CogConfig` 运行时修改：

| 场景 | e (时间) | π (空间) | γ (因果) | 收敛阈值 | 极端阈值 | TopK |
|------|----------|----------|----------|----------|----------|------|
| 默认均衡 | 2.718 | 3.142 | 0.577 | 2.5 | 7 | 3 |
| 创意发散 | 3.0 | 2.5 | 0.8 | 1.5 | 5 | 5 |
| 严谨推理 | 2.5 | 3.5 | 0.4 | 3.0 | 8 | 2 |
| 长期记忆 | 2.718 | 3.142 | 0.577 | 2.5 | 7 | 8 |
| 快速响应 | 2.718 | 3.142 | 0.577 | 2.0 | 7 | 1 |

### 调参接口

```go
// 方式1：环境变量
cogspace.GetConfig().LoadFromEnv()

// 方式2：运行时修改
cfg := cogspace.GetConfig()
cfg.EWeight = 3.0
cfg.ConvergeThresh = 1.5
```

---

## 六、扩展预留方案

### 6.1 时序遗忘衰减

已实现 `SearchTopKWithDecay` 方法：

```go
// 有效距离 = 原始距离 × (1 + decayFactor × age_hours)
// 越久未访问的认知，有效距离越大，越不容易被召回
results := mem.SearchTopKWithDecay(target, k, 0.1)
```

### 6.2 分布式分片

预留接口（未实现，设计如下）：

```go
// 按 CogID 范围分片
// Shard 0: ID [0, 4920]
// Shard 1: ID [4921, 9841]
// Shard 2: ID [9842, 14762]
// Shard 3: ID [14763, 19682]
//
// 写入：根据 ID 直接路由到对应分片
// TopK召回：并行查询所有分片，合并结果后取全局TopK
```

### 6.3 序列化兼容

快照格式采用 JSON，版本字段 `version` 支持未来升级：

```json
{
  "version": "1.0.0",
  "timestamp": 1234567890,
  "nodes": [...],
  "config": {...}
}
```

### 6.4 LLM Embedding 集成

`ParseTextToVector` 已预留 LLM JSON 结构化输出解析接口：

```go
// LLM 输出格式：
// {"past":1,"present":0,"future":-1,"internal":1,"medial":0,"external":-1,"cause":1,"condition":0,"effect":-1}
//
// 解析优先级：
// 1. JSON 直接解析
// 2. Markdown 代码块中的 JSON
// 3. 关键词规则映射（回退）
```

### 6.5 与原有 TypeScript 认知空间的编码差异

| 特性 | Go cogspace | TS trit-vector |
|------|-------------|----------------|
| 编码方式 | 平衡三进制加权 | 偏移base-3 (t+1) |
| 全阴 ID | 0 | 0 |
| 全和 ID | 9841 (Offset) | 0 |
| 全阳 ID | 19682 | 19682 |
| 映射范围 | [0, 19682] | [0, 19682] |
| 双射 | ✓ | ✓ |

两种编码方式不同但都是 [0, 19682] 上的双射，不混用时各自完全自洽。TS桥接文件已实现对齐的 `cogEncode`/`cogDecode` 函数。

---

## 七、运行方式

### 运行测试

```bash
# Go 测试
go test ./cogspace/ ./agent/ -v -count=1

# 性能基准
go test ./cogspace/ -bench=. -benchmem
go test ./agent/ -bench=. -benchmem

# 运行示例
go run ./cmd/cogspace-demo/
```

### TypeScript 集成

```typescript
import { CogMemoryTS, agentStep, agentPostStep, checkTermination } from './integration/cog-hook-bridge';

const cogMem = new CogMemoryTS();
const hookOut = agentStep(intentText, cognitiveSpace, cogMem);
// ... 执行业务逻辑 ...
agentPostStep(result, hookOut.targetVector, cogMem, 1.0);
const termCheck = checkTermination(businessDone, hookOut.targetVector);
```
