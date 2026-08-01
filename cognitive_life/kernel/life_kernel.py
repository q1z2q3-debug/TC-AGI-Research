from typing import Any, Dict


class LifeKernel:
    """Central coordinator for autonomous cognitive life."""

    def __init__(self, agent, memory, evolution=None):
        self.agent = agent
        self.memory = memory
        self.evolution = evolution

    def step(self, state: Dict[str, Any], goal: Dict[str, Any]):
        result = self.agent.cycle(state, goal)
        self.memory.store(state.get("address"), result) if state.get("address") else None
        return result
