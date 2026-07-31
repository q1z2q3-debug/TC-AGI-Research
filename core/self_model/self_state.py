"""TC-AGI V0.9.2 Self State Model

Maintains the internal cognitive state of the agent.
"""


class SelfState:
    def __init__(self):
        self.state = {}

    def update(self, key, value):
        self.state[key] = value

    def get(self, key):
        return self.state.get(key)

    def snapshot(self):
        return dict(self.state)
