from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class DecisionTrace:
    """Trace autonomous decisions back to their causal origin."""

    action: Dict[str, Any]
    capability: Dict[str, Any]
    belief: Dict[str, Any]
    identity: Dict[str, Any]
    purpose: Dict[str, Any]
    axiom: Dict[str, Any]

    def explain(self) -> Dict[str, Any]:
        return {
            "action": self.action,
            "capability": self.capability,
            "belief": self.belief,
            "identity": self.identity,
            "purpose": self.purpose,
            "axiom": self.axiom,
        }
