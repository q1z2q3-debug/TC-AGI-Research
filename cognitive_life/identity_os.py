from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class IdentityOS:
    """Maintains continuity of self-model and mission representation."""

    identity: Dict[str, Any] = field(default_factory=dict)
    beliefs: Dict[str, Any] = field(default_factory=dict)

    def update_belief(self, key: str, value: Any) -> None:
        self.beliefs[key] = value

    def self_model(self) -> Dict[str, Any]:
        return {
            "identity": self.identity,
            "beliefs": self.beliefs,
        }
