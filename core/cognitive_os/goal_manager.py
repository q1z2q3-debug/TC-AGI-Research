"""TC-AGI Goal Management System"""


class GoalManager:
    def __init__(self):
        self.goals = []

    def create_goal(self, goal, priority=0):
        self.goals.append({"goal": goal, "priority": priority})

    def active_goals(self):
        return sorted(self.goals, key=lambda x: x["priority"], reverse=True)
