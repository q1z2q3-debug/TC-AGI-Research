from typing import Any, Dict, List


class StrategicPlanner:
    """Plans long-term actions based on goals and predicted states."""

    def plan(self, goal: Dict[str, Any], futures: List[Dict[str, Any]]):
        return {
            "goal": goal,
            "candidates": futures,
            "selected": futures[0] if futures else None,
        }
