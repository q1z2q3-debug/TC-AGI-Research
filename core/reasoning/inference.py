"""TC-AGI V0.3 Reasoning Inference"""


class InferenceEngine:
    def infer(self, observations):
        score = sum(observations)
        if score > 0:
            return 1
        if score < 0:
            return -1
        return 0
