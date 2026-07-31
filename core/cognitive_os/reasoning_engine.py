"""TC-AGI Cognitive Reasoning Engine

Reasoning through transitions between cognitive addresses.
"""


class CognitiveReasoningEngine:
    def __init__(self, transition_map=None):
        self.transition_map = transition_map or {}

    def connect(self, source, target, confidence=1.0):
        self.transition_map.setdefault(source, []).append((target, confidence))

    def infer(self, state):
        return self.transition_map.get(state, [])
