"""TC-AGI V0.2 Cognitive Memory Module"""


class CognitiveMemory:
    def __init__(self):
        self.trace = []

    def store(self, state, signal):
        self.trace.append({"state": state.value, "signal": signal})

    def recall(self):
        return self.trace[-1] if self.trace else None
