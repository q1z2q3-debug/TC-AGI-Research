"""TC-AGI Decision Layer"""


class DecisionEngine:
    def decide(self, state):
        return {
            -1: "reject",
            0: "observe",
            1: "accept"
        }.get(state, "unknown")
