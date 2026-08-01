from typing import Dict, Any


class SelfModificationGuard:
    """Controls self-change boundaries."""

    def __init__(self, protected_axioms=None):
        self.protected_axioms = protected_axioms or []

    def approve(self, proposal: Dict[str, Any]) -> bool:
        target = proposal.get("target")
        return target not in self.protected_axioms

    def inspect(self, proposal: Dict[str, Any]):
        return {
            "approved": self.approve(proposal),
            "proposal": proposal,
        }
