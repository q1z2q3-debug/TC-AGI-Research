"""TC-AGI Cognitive Energy Field

Measures dynamic cognitive activation.
"""


class CognitiveEnergy:
    def measure(self, state_activity, attention, memory):
        return state_activity * attention * memory
