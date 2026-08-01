from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class EpisodicMemory:
    """Stores lived experiences with context."""

    episodes: List[Dict[str, Any]] = field(default_factory=list)

    def remember(self, event: Dict[str, Any]) -> None:
        self.episodes.append(event)

    def recall(self, key: str, value: Any):
        return [e for e in self.episodes if e.get(key) == value]
