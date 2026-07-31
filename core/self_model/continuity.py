"""TC-AGI Temporal Self Continuity

Maintains relationship between past, present and future self states.
"""


class SelfContinuity:
    def __init__(self):
        self.timeline = []

    def add(self, state):
        self.timeline.append(state)

    def history(self):
        return self.timeline
