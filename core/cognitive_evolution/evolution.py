"""TC-AGI Cognitive Evolution Engine"""

import math


class EvolutionEngine:
    def evolve_memory(self, value, time, decay=0.01):
        return value * math.exp(-decay * time)

    def ternary_change(self, previous, current):
        if current > previous:
            return 1
        if current < previous:
            return -1
        return 0
