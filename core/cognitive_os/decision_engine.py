"""TC-AGI Decision Engine"""


class DecisionEngine:
    def decide(self, judgment):
        actions = {
            -1: "avoid",
            0: "observe",
            1: "execute"
        }
        return actions.get(judgment, "unknown")
