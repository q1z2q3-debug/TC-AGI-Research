"""TC-AGI Cognitive Cycle

Memory -> Reasoning -> Judgment -> Decision loop.
"""


class CognitiveCycle:
    def __init__(self, memory, reasoning, judgment, decision):
        self.memory = memory
        self.reasoning = reasoning
        self.judgment = judgment
        self.decision = decision

    def process(self, address):
        experience = self.memory.recall(address)
        paths = self.reasoning.infer(address)

        positive = len([p for p in paths if p[1] > 0])
        negative = len([p for p in paths if p[1] < 0])

        state = self.judgment.evaluate(positive, negative)
        return self.decision.decide(state)
