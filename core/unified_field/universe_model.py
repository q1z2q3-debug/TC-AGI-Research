"""TC-AGI Universe Cognitive Model

Unified representation of self, world and relational field.
"""


class UniverseModel:
    def __init__(self):
        self.states = []

    def integrate(self, self_state, world_state):
        self.states.append({
            "self": self_state,
            "world": world_state
        })

    def field(self):
        return self.states
