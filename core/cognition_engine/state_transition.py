"""TC-AGI V0.2 Cognitive Engine State Transition"""

from core.ternary_unit.ternary_unit import TernaryState


class StateTransitionEngine:
    def evaluate(self, signal: float, context: float = 0.0) -> TernaryState:
        score = signal + context * 0.5
        if score > 0:
            return TernaryState(1)
        if score < 0:
            return TernaryState(-1)
        return TernaryState(0)
