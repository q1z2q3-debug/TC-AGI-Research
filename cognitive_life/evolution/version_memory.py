from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class VersionMemory:
    """Stores evolution history without losing continuity."""

    history: List[Dict[str, Any]] = field(default_factory=list)

    def record(self, version: str, change: Dict[str, Any]):
        self.history.append({
            "version": version,
            "change": change,
        })

    def latest(self):
        return self.history[-1] if self.history else None
