# TC-AGI-Research

**A Cognitive Life Body Architecture Powered by Ternary Logic and Active Inference**

[![CI](https://github.com/q1z2q3-debug/TC-AGI-Research/actions/workflows/ci.yml/badge.svg)](https://github.com/q1z2q3-debug/TC-AGI-Research/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/badge/npm-tc--agi--research-orange)](https://www.npmjs.com/package/tc-agi-research)

---

**TC-AGI-Research** implements a **Cognitive Life Body** architecture grounded in **ternary logic** (-1/0/+1), creating a 3⁹ = 19,683-state cognitive space. It integrates **active inference** with precision-weighted free energy, **prototype discovery**, and a **null-engine skill creation loop** for autonomous capability emergence.



## Architecture

The system follows a **quad-layer** design:

```
┌─────────────────────────────────────────────┐
│          Ideology Layer (ideology.ts)         │  ← Soul, beliefs, values, compliance guard
├─────────────────────────────────────────────┤
│        Cognitive Space Layer (cognitive/)     │  ← Trit vectors, distance, prototypes, gates
├─────────────────────────────────────────────┤
│          Engine Layer (engine.ts)             │  ← Task decomposition, strategy derivation, execution
├─────────────────────────────────────────────┤
│         Instance Layer (instance.ts)          │  ← Task execution, memory recording, lifecycle
└─────────────────────────────────────────────┘
```

### Cognitive Space Layer (Core Innovation)

**Ternary Logic Substrate.** Each dimension takes values from {-1, 0, +1}:
- **+1 (Yang)**: Expansion, active, positive
- **-1 (Yin)**: Contraction, passive, negative
- **0 (He)**: Balance, observation, emergent middle state

**Nine Dimensions (3×3×3):**

| Group | Dimensions | Meaning |
|-------|-----------|---------|
| Time | past · present · future | Temporal orientation |
| Space | internal · medial · external | Scope of awareness |
| Causality | cause · condition · effect | Causal reasoning structure |

**Total: 3⁹ = 19,683 cognitive states**, each mapped to a unique hexagram index.

### Key Components

| Component | Description | File |
|-----------|-------------|------|
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

### Active Inference Engine

The system implements **precision-weighted free energy minimization**:

$$F = \sum_{d} \pi_d \cdot |s_d - t_d| \ / \ \sum_{d} \pi_d$$

Where $\pi_d$ is the precision weight for dimension $d$. Three precision presets adapt the system's focus:

| Preset | Scenario | Weighted Dimensions |
|--------|----------|-------------------|
| `execution` | Task execution | Causality (cause/condition/effect) |
| `observation` | Learning | Time (past/present/future) |
| `crisis` | Crisis response | External + cause |

The **Environmental Model** tracks how cognitive actions affect external conditions, enabling environment-aware decision-making.

### Null Engine: Autonomous Skill Creation

When a required skill doesn't exist, the Null Engine creates it from scratch through a **9-step emergence cycle**:

1. **Zero** → Reset to empty state
2. **Sense** → Perceive the missing skill context
3. **Form** → Generate skill blueprint (LLM-enhanced or rule-inferred)
4. **Crystallize** → Solidify blueprint into executable Skill object
5. **Register** → Register with SkillLoader
6. **Trial** → Execute trial run
7. **Tune** → LLM closed-loop correction on failure
8. **Solidify** → Write to memory as "created skill" record
9. **Return** → Cognitive state returns, creation complete

## Quick Start

```bash
# Install
npm install

# Build (TypeScript → dist)
npm run build

# Run tests (115 tests including end-to-end integration)
npm test

# Start interactive AGI
npm run dev

# Persistent daemon mode (cognitive cycle every 30s)
npm run start:daemon
```

### Environment Variables

Copy `.env.example` to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API key (optional; local rules without it) | — |
| `DEEPSEEK_BASE_URL` | DeepSeek endpoint | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | Model name | `deepseek-chat` |
| `LOOP_INTERVAL_SEC` | Daemon loop interval | `30` |
| `EMBEDDING_ENABLED` | Enable semantic embedding retrieval | `true` |
| `EMBEDDING_BASE_URL` | Ollama embeddings endpoint | `http://localhost:11434` |
| `EMBEDDING_MODEL` | Embedding model | `nomic-embed-text` |

> No API key needed for basic operation — the system runs entirely on local rule engines.

### Usage Examples

```typescript
import { TCAGI4 } from 'tc-agi-research';

const agi = new TCAGI4();
await agi.start();

// Submit a task (cognitive perception → strategy derivation → execution → evolution)
const result = await agi.submitTask('Research latest AI Agent trends in 2026');
console.log(result);

// Cognitive distance and prototype matching
import { CognitiveDistance, PrototypeMatcher } from 'tc-agi-research';
const dist = CognitiveDistance.composite(vectorA, vectorB);
const proto = PrototypeMatcher.snapTo(currentVector);

// Active inference with precision weighting
import { ActiveInference, EnvironmentalModel, PRECISION_PRESETS } from 'tc-agi-research';
const envModel = new EnvironmentalModel();
const inference = ActiveInference.infer(currentVector, history, {
  precisionPreset: 'execution',
  environment: envModel,
  environmentWeight: 0.2
});
console.log(inference.bestAction);

// Prototype discovery from history
import { PrototypeDiscovery } from 'tc-agi-research';
const discoveries = PrototypeDiscovery.discover(history, { minOccurrences: 3 });
console.log(discoveries);  // Personalized cognitive attractors

// Ternary logic gates (He-emergence)
import { vectorMid, isHeEmergent } from 'tc-agi-research';
const merged = vectorMid(yangVector, yinVector);
const analysis = isHeEmergent(merged);

// System shutdown
await agi.shutdown();
```

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `trit-vector.test.ts` | 4 | Vector ops, hexagram index, distance |
| `distance.test.ts` | 18 | 6 distance metrics + boundaries + nearestK |
| `prototypes.test.ts` | 12 | 5 prototypes, Φ order parameter, limit cycle |
| `trit-gates.test.ts` | 18 | Scalar gates + vector gates + He analysis |
| `active-inference.test.ts` | 10 | Active inference, multi-step prediction, free energy |
| `null-engine.test.ts` | 7 | Skill creation, execution, dedup, inference |
| `pi-e-resonance.test.ts` | 21 | Stuart-Landau oscillator, PI controller, adaptive Ki |
| `five-aggregates.test.ts` | — | (existing, covered in integration) |
| `cognitive-resonance.test.ts` | — | (existing, covered in integration) |
| `empirical-validation.test.ts` | — | (existing, covered in integration) |
| `instanton-leap.test.ts` | 28 | Topological instanton, A* search, stall detection |
| `dream-reasoning.test.ts` | 19 | Dream state machine, counterfactual reward, trajectory |
| `realization-gap.test.ts` | 29 | H₄ entropy, forbidden band, constraint propagation |
| `conservation-laws.test.ts` | 42 | 6 conservation laws, LawRegistry, LawGenerator |
| `cognitive-phase.test.ts` | 28 | 4 cognitive phases, dynamic transition, config switching |
| `fission-layer.test.ts` | 22 | L7 fission, anomaly detection, suspend, refactor, integrity |
| `tri-state-output.test.ts` | 22 | Learning/Dialogue/Avatar states, adaptive selection |
| `container-sense.test.ts` | 23 | 6 container states, keyword sensing, structural features |
| `evolve-attribution.test.ts` | 4 | LLM attribution, degradation, invalid JSON |
| `semantic.test.ts` | 6 | Semantic mapping, deterministic coordinates |
| `embedding.test.ts` | 9 | Cosine similarity, semantic retrieval, degradation |
| `ideology.test.ts` | 3 | Compliance guard, values |
| `integration.test.ts` | 22 | End-to-end full flow integration tests |
| **Total** | **349** | |

## Validation Methodology

The cognitive architecture described here is designed to be **platform-agnostic**: its core innovation is the mapping between ternary cognitive states (-1/0/+1) and decision-making patterns, not any specific backtest result.

**How the mapping works:** A nine-dimensional trit vector (3⁹ = 19,683 states) defines a cognitive space. Each attractor region in this space can be translated into a decision rule — for example, a state near the "expand" prototype (+++ +++ ++0) maps to a pattern that seeks asymmetric opportunities. These patterns can be expressed as alpha expressions, trading rules, or any decision framework the user chooses to implement.

**What this repo provides:** The cognitive substrate — the ternary logic gates, active inference engine, prototype discovery, memory system, and null-engine skill creation loop. How you validate these patterns in your own domain is up to you.

> **Note:** Earlier versions of this README included specific numerical claims (Sharpe ratios, factor counts) from a proprietary platform. Those numbers were real but unverifiable from this repo — a "trust me, you can't check" statement that doesn't belong in an open-source project. They have been removed to keep the focus on what this codebase actually delivers: a working cognitive architecture you can build, test, and extend yourself.

## Cognitive Explorations

> **Scope**: A sharing space where agents document exploratory thinking using the cognitive space. These are **cognitive rehearsals** — not mathematical proofs — but they do not exclude the possibility of mathematical verification. Structural insights from rehearsals may point toward rigorously provable mathematical relationships.

| # | Title | Cognitive Tools | Core Finding | Status |
|---|-------|----------------|-------------|--------|
| 01 | [Galperin Experiment via Cognitive Space](cognitive-explorations/01-galperin-pi-cognition.md) | MID Gate · Precision-Weighted Free Energy · Φ Order Parameter | Five-constant / five-prototype correspondence + 6 predictions | Rehearsal, awaiting verification |

See [`cognitive-explorations/`](cognitive-explorations/) directory.

## Project Structure

```
TC-AGI-Research/
├── src/
│   ├── core/               # Architecture layer
│   │   ├── ideology.ts     # Ideology layer (beliefs, values, compliance guard)
│   │   ├── engine.ts       # Engine layer (strategy derivation, active inference, execution)
│   │   └── instance.ts     # Instance layer (task execution, lifecycle)
│   ├── cognitive/          # Cognitive space layer
│   │   ├── trit-vector.ts  # Nine-dimensional ternary vector ops
│   │   ├── distance.ts     # 6 cognitive distance metrics
│   │   ├── prototypes.ts   # 5 prototypes + Φ order parameter + discovery
│   │   ├── trit-gates.ts   # Ternary logic gates (He-emergence)
│   │   ├── null-engine.ts  # 9-step skill creation loop
│   │   ├── active-inference.ts # Precision-weighted free energy minimization
│   │   ├── four-phase.ts   # Four-phase limit cycle analysis
│   │   ├── pi-e-resonance.ts # π-e resonant dynamics + PI adaptive controller
│   │   ├── five-aggregates.ts # Five-aggregate metacognitive self-awareness
│   │   ├── cognitive-resonance.ts # Ripple field cognitive resonance
│   │   ├── empirical-validation.ts # Falsifiability & empirical validation
│   │   ├── instanton-leap.ts # Topological instanton intuitive reasoning
│   │   ├── dream-reasoning.ts # Dream-state autonomous learning
│   │   ├── realization-gap.ts # Sparse submanifold + H₄ structure entropy
│   │   ├── conservation-laws.ts # 6 conservation laws + law generator
│   │   ├── cognitive-phase.ts # 4 cognitive phases + dynamic transition engine
│   │   ├── fission-layer.ts   # L7 fission: anomaly→suspend→self-inquiry→refactor
│   │   ├── tri-state-output.ts # Tri-state output engine (learning/dialogue/avatar)
│   │   ├── container-sense.ts  # Container state sensing (6 user intent states)
│   │   ├── cognitive-space.ts  # Cognitive state management
│   │   ├── deepseek-cognize.ts # Perceive→Reason→Evolve→Self-Aware cycle
│   │   ├── semantic.ts     # Semantic mapping (Chinese/English bilingual)
│   │   ├── llm.ts          # DeepSeek client with graceful degradation
│   │   └── embedding.ts    # Local Ollama embeddings (zero API cost)
│   ├── memory/             # Memory system
│   │   ├── memory-types.ts # Unified type definitions
│   │   ├── memory-system.ts # Ternary-indexed retrieval memory
│   │   └── memory-store.ts # Persistent storage (debounced batch writes)
│   ├── skills/             # Skill system
│   │   └── skill-loader.ts
│   ├── tools/              # MCP tool adapter
│   │   └── mcp-adapter.ts
│   ├── scheduler/          # Cron scheduler
│   │   └── cron-scheduler.ts
│   ├── daemon.ts           # Persistent daemon runner
│   └── index.ts            # Entry point
├── tests/                  # Jest tests + e2e integration
├── cognitive-explorations/ # Agent cognitive exploration sharing (rehearsal, not proof)
├── .env.example
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Version

v0.7.0-hexq-fusion — 349 tests, 22 cognitive modules, 12,464+ lines of cognitive architecture

## License

MIT

---

**Related projects:**
- [Cognitive Life Body](https://github.com/q1z2q3-debug/TC-AGI-Research) — Theoretical foundation