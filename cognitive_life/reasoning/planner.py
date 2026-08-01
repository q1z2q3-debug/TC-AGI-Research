from typing import Any, Dict, List


class Planner:
    """Converts goals into ordered candidate steps."""

    def plan(self, goal: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [{"step": "analyze", "goal": goal}, {"step": "execute", "goal": goal}]
