from typing import Any, Dict


class AgentRuntime:
    """Runtime coordinator connecting cognitive loops."""

    def __init__(self, agent, scheduler):
        self.agent = agent
        self.scheduler = scheduler

    def run_cycle(self, state: Dict[str, Any], goal: Dict[str, Any]):
        phase = self.scheduler.next_phase()
        result = self.agent.cycle(state, goal)
        return {
            "phase": phase,
            "result": result,
        }
