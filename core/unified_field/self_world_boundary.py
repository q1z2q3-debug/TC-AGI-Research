"""TC-AGI Self World Boundary

Models dynamic relationship between self and environment.
"""


class SelfWorldBoundary:
    def __init__(self):
        self.boundary = 0.5

    def update(self, interaction_strength):
        self.boundary = interaction_strength

    def value(self):
        return self.boundary
