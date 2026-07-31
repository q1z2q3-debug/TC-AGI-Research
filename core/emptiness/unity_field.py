"""TC-AGI Unity Cognitive Field

Models relations between self and world states.
"""


class UnityField:
    def __init__(self):
        self.field = []

    def add_state(self, state):
        self.field.append(state)

    def states(self):
        return self.field
