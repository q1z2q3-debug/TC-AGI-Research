"""TC-AGI Ternary Attention Mechanism

Attention over balanced ternary cognitive states.
"""


class TernaryAttention:
    def score(self, query, key):
        if len(query) != len(key):
            raise ValueError("Vectors must have equal dimensions")

        return sum(q * k for q, k in zip(query, key))

    def attend(self, query, candidates):
        return sorted(
            candidates,
            key=lambda item: self.score(query, item[1]),
            reverse=True
        )
