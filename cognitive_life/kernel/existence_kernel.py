from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class ExistenceKernel:
    """Lowest-level existence continuity layer."""

    identity: str
    invariants: Dict[str, Any] = field(default_factory=dict)

    def preserve(self, state: Dict[str, Any]) -> bool:
        return all(
            state.get(key) == value
            for key, value in self.invariants.items()
        )

    def describe(self) -> Dict[str, Any]:
        return {
            "identity": self.identity,
            "invariants": self.invariants,
        }
