from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class SemanticMemory:
    """Stores abstract knowledge representations."""

    knowledge: Dict[str, Any] = field(default_factory=dict)

    def learn(self, concept: str, meaning: Any):
        self.knowledge[concept] = meaning

    def retrieve(self, concept: str):
        return self.knowledge.get(concept)
