"""TC-AGI Memory Attention Layer

Links cognitive memory retrieval with transformer attention.
"""


class MemoryAttention:
    def __init__(self, memory):
        self.memory = memory

    def recall(self, addresses):
        return [self.memory.recall(a) for a in addresses]
