"""TC-AGI Five Aggregates: Feeling (受)

Evaluates states through balanced ternary value perception.
"""


class FeelingLayer:
    def evaluate(self, signal):
        if signal > 0:
            return 1
        if signal < 0:
            return -1
        return 0
