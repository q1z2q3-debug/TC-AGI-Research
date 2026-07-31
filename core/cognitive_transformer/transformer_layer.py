"""TC-AGI Cognitive Transformer Layer"""


class CognitiveTransformerLayer:
    def __init__(self, attention, memory_attention):
        self.attention = attention
        self.memory_attention = memory_attention

    def forward(self, state, candidates):
        attended = self.attention.attend(state, candidates)
        return attended
