from dataclasses import dataclass, field
from typing import Any, Dict, Tuple


@dataclass
class CognitiveState:
    """Unified runtime state of cognition."""

    coordinate: Tuple[int, ...]
    perception: Dict[str, Any] = field(default_factory=dict)
    beliefs: Dict[str, Any] = field(default_factory=dict)
    memory_context: Dict[str, Any] = field(default_factory=dict)

    def snapshot(self) -> Dict[str, Any]:
        return {
            "coordinate": self.coordinate,
            "perception": self.perception,
            "beliefs": self.beliefs,
            "memory_context": self.memory_context,
        }
