from typing import Any, Dict


class AutonomousAgent:
    """Connects existence, cognition and action loops."""

    def __init__(self, existence_kernel, axiom_engine, life_cycle_engine):
        self.existence_kernel = existence_kernel
        self.axiom_engine = axiom_engine
        self.life_cycle_engine = life_cycle_engine

    def cycle(self, state: Dict[str, Any], goal: Dict[str, Any]):
        if not self.existence_kernel.preserve(state):
            return {"status": "halt", "reason": "existence constraint"}

        if not self.axiom_engine.check(goal):
            return {"status": "reject", "reason": "axiom constraint"}

        perception = self.life_cycle_engine.breathe(state)
        action = self.life_cycle_engine.act(goal)

        return {
            "status": "complete",
            "perception": perception,
            "action": action,
        }
