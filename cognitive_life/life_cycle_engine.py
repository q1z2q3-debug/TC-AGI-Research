from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class LifeCycleEngine:
    """Autonomous cognitive loop.

    Sense -> integrate -> act -> feedback -> memory.
    """

    memory: List[Dict[str, Any]] = field(default_factory=list)

    def breathe(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "phase": "integration",
            "input": perception,
        }

    def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        record = {
            "action": decision,
            "phase": "execution",
        }
        self.memory.append(record)
        return record

    def feedback(self, result: Dict[str, Any]) -> None:
        self.memory.append({"feedback": result})
