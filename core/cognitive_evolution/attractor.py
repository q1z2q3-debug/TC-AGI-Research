"""TC-AGI Cognitive Attractor Model

Represents stable regions in the 19683 cognitive manifold.
"""


class CognitiveAttractor:
    def __init__(self, center, name=None):
        self.center = center
        self.name = name or "unknown"
        self.members = []

    def absorb(self, state):
        self.members.append(state)

    def contains(self, state):
        return state == self.center or state in self.members
