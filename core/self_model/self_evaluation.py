"""TC-AGI Self Evaluation Model

Evaluates confidence and reliability of internal cognition.
"""


class SelfEvaluation:
    def evaluate(self, confidence, consistency):
        return {
            "confidence": confidence,
            "consistency": consistency,
            "reliable": confidence > 0.5 and consistency > 0.5
        }
