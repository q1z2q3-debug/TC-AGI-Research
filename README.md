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
- **觉知 (perceive)**：输入 → Trit分解 → 卦象 → π/e调节
- **推理 (reason)**：状态 → 策略派生（扩张/收缩/观察）
- **进化 (evolve)**：结果反馈 → 向量调整
- **自知 (get_state)**：完整态势快照

### 4. 自我进化机制
每次任务完成后自动执行：
1. 复盘全过程
2. 提取经验（失败/成功）
3. 写入记忆（持久化）
4. 优化流程（新技能/新工具）

## 目录结构

```
TC-AGI-Research/
├── src/
│   ├── core/               # 核心层
│   │   ├── ideology.ts     # 意识形态层
│   │   ├── engine.ts       # 研究引擎层
│   │   └── instance.ts     # 生命体实例层
│   ├── cognitive/          # 认知空间层
│   │   ├── trit-vector.ts  # 九维向量运算
│   │   ├── cognitive-space.ts # 认知空间管理
│   │   └── deepseek-cognize.ts # 认知循环
│   ├── memory/             # 记忆系统
│   │   ├── memory-system.ts
│   │   └── memory-store.ts
│   ├── skills/             # 技能系统
│   │   └── skill-loader.ts
│   ├── tools/              # MCP工具适配
│   │   └── mcp-adapter.ts
│   ├── scheduler/          # 定时任务
│   │   └── cron-scheduler.ts
│   └── index.ts            # 入口
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev

# 测试
npm test
```

## 使用示例

```typescript
import { TCAGI } from 'tc-agi-research';

const agi = new TCAGI();
await agi.start();

// 提交任务
const result = await agi.submitTask('研究2026年AI Agent的最新趋势');
console.log(result);

// 查看认知态势
const snapshot = agi.getCognitiveSnapshot();
console.log(snapshot.dimensionAnalysis);

// 关闭系统
await agi.shutdown();
```

## 版本

v0.2.0-cognitive

## 许可证

MIT
