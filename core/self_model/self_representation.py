"""TC-AGI V0.2 Self Model Prototype"""


class SelfRepresentation:
    def __init__(self):
        self.identity = "TC-AGI-Cognitive-Agent"
        self.history = []

    def update(self, event):
        self.history.append(event)

    def describe(self):
        return {
            "identity": self.identity,
            "experience_count": len(self.history)
        }
