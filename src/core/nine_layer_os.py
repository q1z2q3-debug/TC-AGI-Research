#!/usr/bin/env python3
"""九层操作系统 (Nine-Layer Operating System) — 生产级实现 v2.0.0"""
import json, time, logging, hashlib, math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Union
from enum import Enum, IntEnum
from abc import ABC, abstractmethod

class Trit(IntEnum):
    NEG = -1; ZERO = 0; POS = 1

class MemoryType(Enum):
    USER = "user"; FEEDBACK = "feedback"; TOPIC = "topic"; REFERENCE = "reference"

class CognitiveMode(Enum):
    EXPAND = "expand"; OBSERVE = "observe"; CONTRACT = "contract"

@dataclass
class NineVectorTrit:
    past: Trit = Trit.ZERO; present: Trit = Trit.ZERO; future: Trit = Trit.ZERO
    internal: Trit = Trit.ZERO; medial: Trit = Trit.ZERO; external: Trit = Trit.ZERO
    cause: Trit = Trit.ZERO; condition: Trit = Trit.ZERO; effect: Trit = Trit.ZERO
    def to_list(self) -> List[int]:
        return [self.past, self.present, self.future, self.internal, self.medial, self.external, self.cause, self.condition, self.effect]
    def majority(self) -> CognitiveMode:
        vec = self.to_list()
        pos = sum(1 for v in vec if v == 1); neg = sum(1 for v in vec if v == -1); zero = sum(1 for v in vec if v == 0)
        if pos > neg and pos > zero: return CognitiveMode.EXPAND
        elif neg > pos and neg > zero: return CognitiveMode.CONTRACT
        else: return CognitiveMode.OBSERVE
    def to_gua_index(self) -> int:
        index = 0
        for i, val in enumerate(self.to_list()):
            index += (val + 1) * (3 ** i)
        return index

@dataclass
class Memory:
    type: MemoryType; name: str; content: str; tags: List[str] = field(default_factory=list)
    gua_index: int = 0; pi_depth: int = 5; e_weight: float = 1.0
    timestamp: float = field(default_factory=time.time); source_id: str = ""
    def to_dict(self) -> Dict:
        return {"type":self.type.value,"name":self.name,"content":self.content,"tags":self.tags,"gua_index":self.gua_index,"pi_depth":self.pi_depth,"e_weight":self.e_weight,"timestamp":self.timestamp,"source_id":self.source_id}
    def to_filename(self) -> str:
        return f"mem/{self.gua_index}/{self.pi_depth}/mem_{self.type.value}_e-{self.e_weight:.2f}_{int(self.timestamp)}.json"
