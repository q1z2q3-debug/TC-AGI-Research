"""TC-AGI Judgment Engine

Produces balanced ternary judgments from evidence.
"""


class JudgmentEngine:
    def evaluate(self, positive, negative, threshold=0.0):
        score = positive - negative
        if score > threshold:
            return 1
        if score < -threshold:
            return -1
        return 0
