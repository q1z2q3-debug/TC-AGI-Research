from dataclasses import dataclass, field
from typing import Callable, Dict


@dataclass
class ProceduralMemory:
    """Stores reusable action procedures."""

    skills: Dict[str, Callable] = field(default_factory=dict)

    def register(self, name: str, procedure: Callable):
        self.skills[name] = procedure

    def execute(self, name: str, *args, **kwargs):
        return self.skills[name](*args, **kwargs)
