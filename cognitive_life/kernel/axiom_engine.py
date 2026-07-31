from typing import Dict, Any


class AxiomEngine:
    """Validates transitions against high-level constraints."""

    def __init__(self, axioms: Dict[str, Any]):
        self.axioms = axioms

    def check(self, transition: Dict[str, Any]) -> bool:
        blocked = self.axioms.get("blocked_states", [])
        return transition.get("state") not in blocked

    def explain(self) -> Dict[str, Any]:
        return self.axioms
