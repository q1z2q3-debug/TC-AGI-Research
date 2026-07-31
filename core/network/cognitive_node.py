"""TC-AGI V0.3 Cognitive Network Node"""

from dataclasses import dataclass


@dataclass
class CognitiveNode:
    node_id: str
    state: int = 0
    activation: float = 0.0

    def activate(self, value: float):
        self.activation = value
        if value > 0:
            self.state = 1
        elif value < 0:
            self.state = -1
        else:
            self.state = 0
        return self.state
