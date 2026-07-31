"""TC-AGI Mathematical Cognitive Field: E Time

Models temporal evolution weighting.
"""

import math


class ETime:
    def evolve(self, value, t):
        return value * math.exp(t)
