"""TC-AGI Autonomous Agent Loop

Connects self model, goals, world model and cognition cycle.
"""


class AgentLoop:
    def __init__(self, scheduler, goals, world):
        self.scheduler = scheduler
        self.goals = goals
        self.world = world

    def step(self):
        task = self.scheduler.next_task()
        return task
