from dataclasses import dataclass


@dataclass
class CognitiveScheduler:
    """Controls cognitive cycle ordering."""

    phase: str = "idle"

    def next_phase(self):
        order = ["perception", "reasoning", "action", "feedback"]
        index = order.index(self.phase) if self.phase in order else -1
        self.phase = order[(index + 1) % len(order)]
        return self.phase
