"""TC-AGI Cognitive Attention

Combines geometric similarity with cognitive state relationships.
"""


class CognitiveAttention:
    def __init__(self, similarity_engine):
        self.similarity_engine = similarity_engine

    def retrieve(self, current_state, memory_states):
        results = []
        for address, state in memory_states.items():
            score = self.similarity_engine(current_state, state)
            results.append((address, score))

        return sorted(results, key=lambda x: x[1], reverse=True)
