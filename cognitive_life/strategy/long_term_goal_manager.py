from typing import Any, Dict, List


class LongTermGoalManager:
    """Maintains persistent objectives across cognitive cycles."""

    def __init__(self):
        self.goals: List[Dict[str, Any]] = []

    def add(self, goal: Dict[str, Any]):
        self.goals.append(goal)

    def active_goals(self):
        return self.goals
