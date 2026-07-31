"""TC-AGI Cognitive Connection"""


class CognitiveConnection:
    def __init__(self, source, target, weight=1.0):
        self.source = source
        self.target = target
        self.weight = weight

    def transmit(self):
        return self.target.activate(self.source.activation * self.weight)
