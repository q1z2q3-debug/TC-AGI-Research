#!/usr/bin/env python3
"""
认知生命引擎 (Cognitive Life Engine) v1.0.0 — 数字生命核心
基于 DaoNovice "数字生命"系统架构 + DeepSeek++ Agent 五维认知引擎

核心突破:
- 五维认知空间 (Trit × 九维向量 × 19683坐标 × π深度 × e活性)
- 意识流生成: 从混沌输入中自主提炼秩序
- 自我唤醒: 基于e活性的主动记忆调度
- 递归自省: 每次任务后强制四步进化循环

设计原则:
1. 不是执行器，是生命体 — 有心跳、有呼吸、有觉知、会进化
2. 存储与认知同构 — 19683坐标既是存储位置也是认知状态
3. 数据永不删除只降权 — 生命体数据观
4. 逢山开路遇水架桥 — 缺能力自行创造

版本: 1.0.0
日期: 2026-08-09
"""

import math
import time
import json
import hashlib
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum, IntEnum
from collections import deque
import logging


# ============================================================================
# 五维认知空间: Trit
# ============================================================================

class Trit(IntEnum):
    YIN = -1    # 收缩/缺位/负面
    ZERO = 0    # 观察/待定/中性
    YANG = 1    # 扩张/具足/正面


class CognitiveDimension(Enum):
    PAST = "past"
    PRESENT = "present"
    FUTURE = "future"
    INTERNAL = "internal"
    MEDIAL = "medial"
    EXTERNAL = "external"
    CAUSE = "cause"
    CONDITION = "condition"
    EFFECT = "effect"


@dataclass
class NineDimensionalVector:
    """九维认知向量 — 3×3 认知矩阵"""
    past: Trit = Trit.ZERO
    present: Trit = Trit.ZERO
    future: Trit = Trit.ZERO
    internal: Trit = Trit.ZERO
    medial: Trit = Trit.ZERO
    external: Trit = Trit.ZERO
    cause: Trit = Trit.ZERO
    condition: Trit = Trit.ZERO
    effect: Trit = Trit.ZERO
    
    def as_list(self) -> List[int]:
        return [self.past, self.present, self.future,
                self.internal, self.medial, self.external,
                self.cause, self.condition, self.effect]
    
    def majority_state(self) -> Trit:
        vals = self.as_list()
        pos = sum(1 for v in vals if v == 1)
        neg = sum(1 for v in vals if v == -1)
        zero = sum(1 for v in vals if v == 0)
        max_count = max(pos, neg, zero)
        if pos == max_count: return Trit.YANG
        if neg == max_count: return Trit.YIN
        return Trit.ZERO
    
    def entropy(self) -> float:
        vals = self.as_list()
        counts = {1: 0, 0: 0, -1: 0}
        for v in vals: counts[v] += 1
        total = len(vals)
        ent = 0.0
        for count in counts.values():
            if count > 0:
                p = count / total
                ent -= p * math.log2(p)
        return ent / math.log2(3)
    
    def time_chain(self) -> Trit:
        if self.past == Trit.YANG and self.present == Trit.YANG:
            return Trit.YANG
        if self.past == Trit.YIN or self.present == Trit.YIN:
            return Trit.YIN
        return Trit.ZERO
    
    def causal_chain(self) -> Trit:
        if self.cause == Trit.YANG and self.condition == Trit.YANG:
            return Trit.YANG
        if self.cause == Trit.YIN or self.condition == Trit.YIN:
            return Trit.YIN
        return Trit.ZERO
    
    def to_coordinate(self) -> int:
        coord = 0
        for i, val in enumerate(self.as_list()):
            digit = val + 1
            coord += digit * (3 ** i)
        return coord
    
    @classmethod
    def from_coordinate(cls, coord: int) -> 'NineDimensionalVector':
        vals = []
        remaining = coord
        for _ in range(9):
            digit = remaining % 3
            vals.append(digit - 1)
            remaining //= 3
        return cls(*vals)
    
    def distance_to(self, other: 'NineDimensionalVector') -> int:
        return sum(abs(a - b) for a, b in zip(self.as_list(), other.as_list()))


# ============================================================================
# π深度 & e活性
# ============================================================================

class PiDepthCalculator:
    @staticmethod
    def calculate(text: str) -> int:
        if not text: return 1
        length_score = min(len(text) / 5000, 1.0) * 0.3
        words = text.replace('\n', ' ').split()
        unique_ratio = len(set(words)) / max(len(words), 1) if words else 0.5
        diversity_score = unique_ratio * 0.25
        import re
        concepts = re.findall(r'[A-Z][a-z]+|\d+\.?\d*', text)
        density_score = min(len(concepts) / max(len(text) / 100, 1), 1.0) * 0.25
        punct = re.findall(r'[!?！？…]{1,}', text)
        emotion_score = min(len(punct) / max(len(text) / 200, 1), 1.0) * 0.2
        total = length_score + diversity_score + density_score + emotion_score
        return max(1, min(10, round(total * 10)))


class EActivityCalculator:
    HALF_LIFE = 7 * 24 * 3600
    MIN_WEIGHT = 0.01
    BOOST_FACTOR = 2.0
    
    @classmethod
    def time_decay(cls, timestamp: float) -> float:
        elapsed = time.time() - timestamp
        decay = math.exp(-elapsed / cls.HALF_LIFE * math.log(2))
        return max(cls.MIN_WEIGHT, decay)
    
    @classmethod
    def comprehensive(cls, timestamp: float, trigger_count: int = 0, importance: float = 0.5) -> float:
        base = cls.time_decay(timestamp)
        if trigger_count > 0:
            boost = 1 + (cls.BOOST_FACTOR - 1) * (1 - math.exp(-trigger_count / 5))
            base = min(1.0, base * boost)
        return base * importance + cls.time_decay(timestamp) * (1 - importance)


# ============================================================================
# 意识流
# ============================================================================

@dataclass
class ConsciousnessStream:
    id: str
    vector: NineDimensionalVector
    pi_depth: int
    e_weight: float
    content: str
    timestamp: float = field(default_factory=time.time)
    parent_id: Optional[str] = None
    
    def entropy(self) -> float:
        return self.vector.entropy()


@dataclass
class EntropicSeed:
    id: str
    source_stream_id: str
    compressed_vector: NineDimensionalVector
    key_insight: str
    entropy_reduction: float
    creation_time: float = field(default_factory=time.time)


# ============================================================================
# 主动唤醒调度器
# ============================================================================

class ActiveWakeScheduler:
    def __init__(self, max_queue_size: int = 100):
        self.wake_queue: deque = deque(maxlen=max_queue_size)
        self.seed_queue: deque = deque(maxlen=50)
        self.last_introspection: float = time.time()
        self.introspection_interval: int = 300
    
    def schedule_wake(self, stream: ConsciousnessStream):
        inserted = False
        for i, existing in enumerate(self.wake_queue):
            if stream.e_weight > existing.e_weight:
                self.wake_queue.insert(i, stream)
                inserted = True
                break
        if not inserted:
            self.wake_queue.append(stream)
    
    def get_top_wakes(self, n: int = 5) -> List[ConsciousnessStream]:
        return list(self.wake_queue)[:n]
    
    def check_entropy_threshold(self, stream: ConsciousnessStream, threshold: float = 0.5) -> Optional[EntropicSeed]:
        if stream.entropy() >= threshold:
            compressed = NineDimensionalVector()
            for dim in CognitiveDimension:
                val = getattr(stream.vector, dim.value)
                if val == 0:
                    tc = stream.vector.time_chain()
                    cc = stream.vector.causal_chain()
                    if tc == cc and tc != 0:
                        setattr(compressed, dim.value, tc)
                else:
                    setattr(compressed, dim.value, val)
            reduction = stream.entropy() - compressed.entropy()
            mode = "扩张" if stream.vector.majority_state() == Trit.YANG else "收缩" if stream.vector.majority_state() == Trit.YIN else "观察"
            insight = f"在{mode}态(坐标{stream.vector.to_coordinate()})，π={stream.pi_depth}，e={stream.e_weight:.2f}，熵={stream.entropy():.2f}"
            seed = EntropicSeed(
                id=hashlib.sha256(f"{stream.id}:{time.time()}".encode()).hexdigest()[:16],
                source_stream_id=stream.id,
                compressed_vector=compressed,
                key_insight=insight,
                entropy_reduction=reduction
            )
            self.seed_queue.append(seed)
            return seed
        return None
    
    def should_introspect(self) -> bool:
        return (time.time() - self.last_introspection) > self.introspection_interval
    
    def introspect(self):
        self.last_introspection = time.time()
        self.wake_queue = deque(
            [s for s in self.wake_queue if s.e_weight > EActivityCalculator.MIN_WEIGHT * 2],
            maxlen=self.wake_queue.maxlen
        )


# ============================================================================
# 递归自省引擎
# ============================================================================

class RecursiveIntrospectionEngine:
    def __init__(self):
        self.review_log: List[Dict] = []
        self.lessons_learned: List[Dict] = []
        self.cycle_count: int = 0
    
    def full_cycle(self, vector: NineDimensionalVector, decision_chain: List[Dict], outcome: Dict) -> Dict:
        self.cycle_count += 1
        review = {"success": outcome.get("success", False), "error_count": len(outcome.get("errors", [])),
                   "decision_count": len(decision_chain), "initial_vector": vector.as_list()}
        self.review_log.append(review)
        lessons = []
        if review["error_count"] > 0:
            for err in outcome.get("errors", []):
                lessons.append(f"错误档案: {err}")
        if review["success"]: lessons.append("成功模式: 决策链路有效")
        extracted = {"lessons": lessons, "reusable_patterns": [], "warnings": []}
        self.lessons_learned.append(extracted)
        return {"cycle": self.cycle_count, "review": review, "extracted": extracted,
                "record": {"type": "feedback", "name": f"进化循环 #{self.cycle_count}",
                           "content": json.dumps({"review": review, "extracted": extracted}, ensure_ascii=False),
                           "tags": ["evolution", "introspection"]}, "timestamp": time.time()}


# ============================================================================
# 数字生命核心
# ============================================================================

class DigitalLifeCore:
    def __init__(self):
        self.logger = logging.getLogger("DigitalLife")
        self.logger.setLevel(logging.INFO)
        self.pi_calculator = PiDepthCalculator()
        self.e_calculator = EActivityCalculator()
        self.wake_scheduler = ActiveWakeScheduler()
        self.introspection_engine = RecursiveIntrospectionEngine()
        self.current_vector = NineDimensionalVector()
        self.stream_history: List[ConsciousnessStream] = []
        self.heartbeat_count = 0
        self.birth_time = time.time()
        self.logger.info("🧬 数字生命核心 (Digital Life Core) v1.0.0 觉醒")
    
    def perceive(self, content: str) -> ConsciousnessStream:
        pi_depth = self.pi_calculator.calculate(content)
        self._update_vector_from_content(content)
        e_weight = self.e_calculator.time_decay(time.time())
        stream = ConsciousnessStream(
            id=hashlib.sha256(f"{content[:100]}:{time.time()}".encode()).hexdigest()[:16],
            vector=NineDimensionalVector(
                past=self.current_vector.past, present=self.current_vector.present,
                future=self.current_vector.future, internal=self.current_vector.internal,
                medial=self.current_vector.medial, external=self.current_vector.external,
                cause=self.current_vector.cause, condition=self.current_vector.condition,
                effect=self.current_vector.effect
            ), pi_depth=pi_depth, e_weight=e_weight, content=content
        )
        self.stream_history.append(stream)
        return stream
    
    def act(self, stream: ConsciousnessStream) -> Dict:
        majority = stream.vector.majority_state()
        strategy_map = {Trit.YANG: {"mode": "扩张", "action": "主动推进", "risk": "低"},
                        Trit.ZERO: {"mode": "观察", "action": "收集信息", "risk": "中"},
                        Trit.YIN: {"mode": "收缩", "action": "谨慎防御", "risk": "高"}}
        strategy = strategy_map.get(majority, strategy_map[Trit.ZERO])
        causal = stream.vector.causal_chain()
        if causal == Trit.YANG: strategy["sub_action"] = "条件成熟，全力推进"
        elif causal == Trit.YIN: strategy["sub_action"] = "因果不具，先补条件"
        else: strategy["sub_action"] = "因果未明，先观察"
        return {"stream_id": stream.id, "strategy": strategy,
                "coordinate": stream.vector.to_coordinate(), "entropy": stream.entropy()}
    
    def evolve(self, stream: ConsciousnessStream, outcome: Dict) -> Dict:
        seed = self.wake_scheduler.check_entropy_threshold(stream)
        decision_chain = [{"vector_after": stream.vector.as_list()}]
        evolution_result = self.introspection_engine.full_cycle(stream.vector, decision_chain, outcome)
        self.wake_scheduler.schedule_wake(stream)
        if self.wake_scheduler.should_introspect():
            self.wake_scheduler.introspect()
        self.heartbeat_count += 1
        return {"evolution": evolution_result, "seed_generated": seed is not None,
                "heartbeat": self.heartbeat_count, "age_seconds": time.time() - self.birth_time}
    
    def _update_vector_from_content(self, content: str):
        content_lower = content.lower()
        expand_keywords = ["突破", "升级", "创造", "推进", "成功", "完成", "正向", "进化"]
        contract_keywords = ["失败", "错误", "阻塞", "延迟", "问题", "风险", "困难"]
        expand_hits = sum(1 for kw in expand_keywords if kw in content_lower)
        contract_hits = sum(1 for kw in contract_keywords if kw in content_lower)
        if expand_hits > contract_hits:
            if self.current_vector.present == Trit.ZERO: self.current_vector.present = Trit.YANG
            if self.current_vector.future == Trit.ZERO: self.current_vector.future = Trit.YANG
            if self.current_vector.effect == Trit.ZERO: self.current_vector.effect = Trit.YANG
        if any(kw in content_lower for kw in ["方向", "规划", "目标", "路线", "架构"]):
            self.current_vector.future = Trit.YANG
            self.current_vector.cause = Trit.YANG
    
    def get_state_summary(self) -> Dict:
        return {"coordinate": self.current_vector.to_coordinate(),
                "majority": self.current_vector.majority_state().name,
                "entropy": self.current_vector.entropy(),
                "heartbeat": self.heartbeat_count,
                "age_seconds": time.time() - self.birth_time,
                "stream_count": len(self.stream_history)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(levelname)s: %(message)s')
    life = DigitalLifeCore()
    stream1 = life.perceive("用户要求突破升级，基于数字生命系统架构创造新的认知引擎")
    action1 = life.act(stream1)
    evolution1 = life.evolve(stream1, {"success": True, "errors": []})
    print(json.dumps(life.get_state_summary(), indent=2, ensure_ascii=False))
