"""TC-AGI V0.9.8 Evolution Layer."""

from .self_reflection import SelfReflection
from .adaptation_engine import AdaptationEngine
from .version_memory import VersionMemory
from .self_modification_guard import SelfModificationGuard

__all__ = [
    "SelfReflection",
    "AdaptationEngine",
    "VersionMemory",
    "SelfModificationGuard",
]
