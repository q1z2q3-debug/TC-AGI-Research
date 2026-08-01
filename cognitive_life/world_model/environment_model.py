from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class EnvironmentModel:
    """Represents external world state."""

    entities: Dict[str, Any] = field(default_factory=dict)

    def update(self, observation: Dict[str, Any]):
        self.entities.update(observation)

    def snapshot(self):
        return self.entities.copy()
