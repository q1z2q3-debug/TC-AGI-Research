from dataclasses import dataclass, field
from typing import Dict, Any, List


@dataclass
class GoalEngine:
    """Maintains persistent and adaptive goals."""

    goals: List[Dict[str, Any]] = field(default_factory=list)

    def add_goal(self, goal: Dict[str, Any]):
        self.goals.append(goal)

    def prioritize(self):
        return sorted(self.goals, key=lambda x: x.get("priority", 0), reverse=True)
