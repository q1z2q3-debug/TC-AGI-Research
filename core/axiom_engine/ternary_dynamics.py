"""TC-AGI Three State Cognitive Dynamics

Maps Yin, Harmony and Yang as dynamic cognitive modes.
"""


class TernaryDynamics:
    STATES = {
        -1: "yin",
         0: "harmony",
         1: "yang"
    }

    def interpret(self, value):
        return self.STATES.get(value, "undefined")

    def transition(self, current, direction):
        return max(-1, min(1, current + direction))
