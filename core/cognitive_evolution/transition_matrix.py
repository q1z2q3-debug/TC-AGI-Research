"""TC-AGI V0.7 Cognitive Transition Matrix

Models movement probabilities between 19683 balanced ternary cognitive states.
"""


class TransitionMatrix:
    def __init__(self):
        self.transitions = {}

    def add_transition(self, source, target, probability=1.0):
        self.transitions.setdefault(source, []).append({
            "target": target,
            "probability": probability
        })

    def next_states(self, source):
        return self.transitions.get(source, [])
