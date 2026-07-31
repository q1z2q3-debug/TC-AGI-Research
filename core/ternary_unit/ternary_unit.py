"""
TC-AGI V0.1
Ternary Cognitive Unit Prototype

State space:
-1 : inhibitory / contradiction
 0 : neutral / context holding
+1 : activation / affirmation
"""

from dataclasses import dataclass


@dataclass
class TernaryState:
    value: int

    def __post_init__(self):
        if self.value not in (-1, 0, 1):
            raise ValueError("Ternary state must be -1, 0, or 1")


@dataclass
class CognitiveUnit:
    state: TernaryState
    memory: float = 0.0

    def transition(self, input_signal: float):
        """Simple V0.1 state transition mechanism."""
        if input_signal > 0:
            self.state = TernaryState(1)
        elif input_signal < 0:
            self.state = TernaryState(-1)
        else:
            self.state = TernaryState(0)

        self.memory = (self.memory * 0.8) + input_signal * 0.2
        return self.state
