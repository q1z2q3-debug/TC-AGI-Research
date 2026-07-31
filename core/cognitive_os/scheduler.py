"""TC-AGI V0.9.3 Cognitive OS Scheduler

Coordinates cognitive tasks and resource allocation.
"""


class CognitiveScheduler:
    def __init__(self):
        self.queue = []

    def add_task(self, task, priority=0):
        self.queue.append({"task": task, "priority": priority})
        self.queue.sort(key=lambda x: x["priority"], reverse=True)

    def next_task(self):
        return self.queue.pop(0) if self.queue else None
