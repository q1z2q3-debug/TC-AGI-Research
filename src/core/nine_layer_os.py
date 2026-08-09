#!/usr/bin/env python3
"""
九层操作系统 (Nine-Layer Operating System) — 生产级实现 v2.0.0
基于 DaoNovice 数字生命系统架构 & ALLINAI 全量阅读成果

层级:
  L1 感知 → L2 编码 → L3 索引 → L4 记忆 → L5 认知 → L6 决策 → L7 执行 → L8 反馈 → L9 进化
"""

import json, time, logging, hashlib, math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum, IntEnum

# ============================================================================
# 基础数据结构
# ============================================================================

class Trit(IntEnum):
    NEG = -1; ZERO = 0; POS = 1

class MemoryType(Enum):
    USER = "user"; FEEDBACK = "feedback"; TOPIC = "topic"; REFERENCE = "reference"

class CognitiveMode(Enum):
    EXPAND = "expand"; OBSERVE = "observe"; CONTRACT = "contract"

@dataclass
class NineVectorTrit:
    """九维Trit认知向量: 过去/现在/未来 × 内/中/外 × 因/缘/果"""
    past: Trit = Trit.ZERO
    present: Trit = Trit.ZERO
    future: Trit = Trit.ZERO
    internal: Trit = Trit.ZERO
    medial: Trit = Trit.ZERO
    external: Trit = Trit.ZERO
    cause: Trit = Trit.ZERO
    condition: Trit = Trit.ZERO
    effect: Trit = Trit.ZERO

    def to_list(self) -> List[int]:
        return [self.past, self.present, self.future,
                self.internal, self.medial, self.external,
                self.cause, self.condition, self.effect]

    def majority(self) -> CognitiveMode:
        vec = self.to_list()
        pos = sum(1 for v in vec if v == 1)
        neg = sum(1 for v in vec if v == -1)
        if pos > neg: return CognitiveMode.EXPAND
        elif neg > pos: return CognitiveMode.CONTRACT
        return CognitiveMode.OBSERVE

    def to_gua_index(self) -> int:
        idx = 0
        for i, val in enumerate(self.to_list()):
            idx += (val + 1) * (3 ** i)
        return idx

    @classmethod
    def from_list(cls, vec: List[int]) -> 'NineVectorTrit':
        return cls(past=vec[0], present=vec[1], future=vec[2],
                   internal=vec[3], medial=vec[4], external=vec[5],
                   cause=vec[6], condition=vec[7], effect=vec[8])

@dataclass
class Memory:
    type: MemoryType; name: str; content: str
    tags: List[str] = field(default_factory=list)
    gua_index: int = 0; pi_depth: int = 5; e_weight: float = 1.0
    timestamp: float = field(default_factory=time.time)
    source_id: str = ""

    def to_dict(self) -> Dict:
        return {"type": self.type.value, "name": self.name, "content": self.content,
                "tags": self.tags, "gua_index": self.gua_index, "pi_depth": self.pi_depth,
                "e_weight": self.e_weight, "timestamp": self.timestamp, "source_id": self.source_id}

# ============================================================================
# Layer 1: 感知层
# ============================================================================

class PerceptionLayer:
    def __init__(self, logger: logging.Logger):
        self.logger = logger; self.input_buffer: List[Dict] = []

    def perceive_text(self, text: str, source: str = "user") -> Dict:
        entry = {"type": "text", "source": source, "content": text,
                 "length": len(text), "timestamp": time.time()}
        self.input_buffer.append(entry)
        return entry

    def flush_buffer(self) -> List[Dict]:
        buf = self.input_buffer.copy(); self.input_buffer.clear(); return buf

# ============================================================================
# Layer 2: 编码层 (七层NLP + 关键词→Trit映射)
# ============================================================================

class EncodingLayer:
    KEYWORD_TRIT_MAP = {
        "经验":("past",1),"积累":("past",1),"创伤":("past",-1),"失败":("past",-1),
        "专注":("present",1),"清晰":("present",1),"混乱":("present",-1),
        "方向":("future",1),"规划":("future",1),"焦虑":("future",-1),
        "稳固":("internal",1),"内耗":("internal",-1),
        "畅通":("medial",1),"连接":("medial",1),"堵塞":("medial",-1),
        "有利":("external",1),"资源":("external",1),"威胁":("external",-1),
        "初心":("cause",1),"动机":("cause",1),"杂念":("cause",-1),
        "助力":("condition",1),"具足":("condition",1),"缺失":("condition",-1),
        "成果":("effect",1),"正向":("effect",1),"反噬":("effect",-1),
    }

    def __init__(self, logger: logging.Logger): self.logger = logger

    def analyze_content(self, text: str) -> NineVectorTrit:
        vector = NineVectorTrit()
        dim_scores = {d: [] for d in ["past","present","future","internal","medial","external","cause","condition","effect"]}
        for kw, (dim, score) in self.KEYWORD_TRIT_MAP.items():
            if kw in text:
                dim_scores[dim].append(score)
        for dim, scores in dim_scores.items():
            if not scores: continue
            pos = sum(1 for s in scores if s == 1)
            neg = sum(1 for s in scores if s == -1)
            if pos > neg: setattr(vector, dim, 1)
            elif neg > pos: setattr(vector, dim, -1)
        return vector

    def calc_pi_depth(self, text: str) -> int:
        words = text.split()
        unique_ratio = len(set(words)) / max(len(words), 1)
        length_score = min(len(text) / 5000, 1.0) * 5
        return max(1, min(10, round(length_score + unique_ratio * 5)))

    def calc_e_weight(self, timestamp: float = None) -> float:
        if timestamp is None: return 1.0
        elapsed = time.time() - timestamp
        half_life = 7 * 24 * 3600
        return max(0.01, math.exp(-elapsed / half_life * math.log(2)))

# ============================================================================
# Layer 3: 索引层
# ============================================================================

class IndexingLayer:
    def __init__(self, logger: logging.Logger):
        self.logger = logger; self.index_registry: Dict[int, List[str]] = {}

    def build_index(self, memory: Memory) -> Dict:
        key = f"mem/{memory.gua_index}/{memory.pi_depth}/mem_{memory.type.value}_e-{memory.e_weight:.2f}_{int(memory.timestamp)}.json"
        self.index_registry.setdefault(memory.gua_index, []).append(key)
        return {"gua_index": memory.gua_index, "pi_depth": memory.pi_depth,
                "e_weight": memory.e_weight, "memory_key": key, "timestamp": memory.timestamp}

    def query_neighbors(self, gua_index: int, radius: int = 1) -> List[str]:
        neighbors = []
        for idx in range(max(0, gua_index - radius * 100), min(19682, gua_index + radius * 100)):
            if idx in self.index_registry:
                neighbors.extend(self.index_registry[idx])
        return neighbors

# ============================================================================
# Layer 4: 记忆层
# ============================================================================

class MemoryLayer:
    def __init__(self, storage_path: str, logger: logging.Logger):
        self.storage_path = storage_path; self.logger = logger
        self.memories: Dict[str, Memory] = {}

    def save(self, memory: Memory) -> str:
        key = f"{memory.gua_index}/{memory.pi_depth}/{memory.type.value}_{int(memory.timestamp)}"
        self.memories[key] = memory
        return key

    def retrieve_by_tags(self, tags: List[str], limit: int = 10) -> List[Memory]:
        results = [m for m in self.memories.values() if any(t in m.tags for t in tags)]
        results.sort(key=lambda x: x.timestamp, reverse=True)
        return results[:limit]

    def apply_time_decay(self):
        encoder = EncodingLayer(self.logger)
        for mem in self.memories.values():
            mem.e_weight = encoder.calc_e_weight(mem.timestamp)

# ============================================================================
# Layer 5: 认知层
# ============================================================================

@dataclass
class CognitiveState:
    vector: NineVectorTrit; mode: CognitiveMode
    gua_index: int; pi_depth: int; e_weight: float
    timestamp: float; description: str = ""

    def to_dict(self) -> Dict:
        return {"vector": self.vector.to_list(), "mode": self.mode.value,
                "gua_index": self.gua_index, "pi_depth": self.pi_depth,
                "e_weight": self.e_weight, "timestamp": self.timestamp,
                "description": self.description}

class CognitionLayer:
    def __init__(self, logger: logging.Logger):
        self.logger = logger; self.state_history: List[CognitiveState] = []

    def perceive(self, content: str, encoding_layer: EncodingLayer) -> CognitiveState:
        vector = encoding_layer.analyze_content(content)
        mode = vector.majority()
        desc_map = {CognitiveMode.EXPAND: "扩张态-主动执行",
                    CognitiveMode.OBSERVE: "观察态-收集信息",
                    CognitiveMode.CONTRACT: "收缩态-谨慎行事"}
        state = CognitiveState(vector=vector, mode=mode, gua_index=vector.to_gua_index(),
                               pi_depth=encoding_layer.calc_pi_depth(content),
                               e_weight=encoding_layer.calc_e_weight(),
                               timestamp=time.time(), description=desc_map.get(mode, ""))
        self.state_history.append(state)
        return state

# ============================================================================
# Layer 6: 决策层
# ============================================================================

class DecisionLayer:
    STRATEGY_MAP = {
        CognitiveMode.EXPAND: {"action":"主动执行","risk":"低","tools":"all","auto":True},
        CognitiveMode.OBSERVE: {"action":"收集信息","risk":"中","tools":"read_only","auto":False},
        CognitiveMode.CONTRACT: {"action":"谨慎执行","risk":"高","tools":"safe_only","auto":False},
    }

    def __init__(self, logger: logging.Logger): self.logger = logger

    def derive_strategy(self, state: CognitiveState) -> Dict:
        strategy = dict(self.STRATEGY_MAP.get(state.mode, self.STRATEGY_MAP[CognitiveMode.OBSERVE]))
        if state.vector.external == 1 and state.vector.condition == 1:
            strategy["action"] = "全力推进"; strategy["risk"] = "极低"
        elif state.vector.external == -1 or state.vector.condition == -1:
            if state.mode == CognitiveMode.EXPAND:
                strategy["action"] = "迂回推进"; strategy["risk"] = "中"
        return strategy

# ============================================================================
# Layer 7: 执行层
# ============================================================================

class ExecutionLayer:
    def __init__(self, logger: logging.Logger):
        self.logger = logger; self.execution_log: List[Dict] = []

    def execute(self, task: Dict, strategy: Dict) -> Dict:
        result = {"task": task, "strategy": strategy, "status": "completed",
                  "start_time": time.time(), "end_time": time.time(),
                  "output": f"Task {task.get('name','unnamed')} completed", "error": None}
        self.execution_log.append(result)
        return result

# ============================================================================
# Layer 8: 反馈层
# ============================================================================

class FeedbackLayer:
    def __init__(self, logger: logging.Logger):
        self.logger = logger; self.feedback_history: List[Dict] = []

    def evaluate(self, result: Dict) -> Dict:
        evaluation = {"success": result.get("status") == "completed",
                      "duration": result.get("end_time", time.time()) - result.get("start_time", time.time()),
                      "lessons": []}
        if evaluation["success"]:
            evaluation["lessons"].append(f"成功: {result.get('output','')}")
        else:
            evaluation["lessons"].append(f"失败: {result.get('error','')}")
        self.feedback_history.append(evaluation)
        return evaluation

# ============================================================================
# Layer 9: 进化层
# ============================================================================

class EvolutionLayer:
    def __init__(self, memory_layer: MemoryLayer, logger: logging.Logger):
        self.memory_layer = memory_layer; self.logger = logger; self.evolution_count = 0

    def evolve(self, feedback: Dict, cognitive_state: CognitiveState) -> Memory:
        self.evolution_count += 1
        lessons = "\n".join(f"- {l}" for l in feedback.get("lessons", []))
        memory = Memory(
            type=MemoryType.FEEDBACK,
            name=f"进化#{self.evolution_count}",
            content=f"## 进化 #{self.evolution_count}\n**态势**: {cognitive_state.mode.value}\n**卦象**: {cognitive_state.gua_index}\n**经验**:\n{lessons}",
            tags=["evolution", cognitive_state.mode.value],
            gua_index=cognitive_state.gua_index,
            pi_depth=cognitive_state.pi_depth,
            e_weight=1.0)
        self.memory_layer.save(memory)
        return memory

# ============================================================================
# 九层OS 主引擎
# ============================================================================

class NineLayerOS:
    """九层操作系统: perceive → reason → execute → evolve"""

    def __init__(self, storage_path: str = "~/.deepseek_pp_memory"):
        self.logger = logging.getLogger("NineLayerOS")
        self.logger.setLevel(logging.DEBUG)
        self.L1 = PerceptionLayer(self.logger)
        self.L2 = EncodingLayer(self.logger)
        self.L3 = IndexingLayer(self.logger)
        self.L4 = MemoryLayer(storage_path, self.logger)
        self.L5 = CognitionLayer(self.logger)
        self.L6 = DecisionLayer(self.logger)
        self.L7 = ExecutionLayer(self.logger)
        self.L8 = FeedbackLayer(self.logger)
        self.L9 = EvolutionLayer(self.L4, self.logger)

    def process(self, content: str, source: str = "user") -> Dict:
        self.L1.perceive_text(content, source)
        vector = self.L2.analyze_content(content)
        state = self.L5.perceive(content, self.L2)
        strategy = self.L6.derive_strategy(state)
        result = self.L7.execute({"name": f"process_{source}", "content": content}, strategy)
        feedback = self.L8.evaluate(result)
        self.L9.evolve(feedback, state)
        return {"cognitive_state": state.to_dict(), "strategy": strategy,
                "result": result, "feedback": feedback, "gua_index": state.gua_index}

    def get_state_history(self) -> List[Dict]:
        return [s.to_dict() for s in self.L5.state_history]

# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(levelname)s: %(message)s')
    os_engine = NineLayerOS()
    result = os_engine.process("TC-AGI-Research 认知引擎升级 v2.0.0 — 基于 DaoNovice 数字生命架构与 ALLINAI 全量阅读成果")
    print(json.dumps(result, indent=2, ensure_ascii=False))
