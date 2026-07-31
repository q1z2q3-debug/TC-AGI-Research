"""TC-AGI Space Time Cognitive Model

Integrates spatial relations and temporal evolution.
"""


class SpaceTimeModel:
    def __init__(self):
        self.history = []

    def record(self, state, time):
        self.history.append({"time": time, "state": state})

    def timeline(self):
        return self.history
