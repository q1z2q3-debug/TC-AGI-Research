"""TC-AGI Cognitive Manifold

Combines multiple distance perspectives into a unified cognitive geometry.
"""

from .hamming import hamming_distance
from .euclidean import euclidean_distance
from .manhattan import manhattan_distance
from .cosine import cosine_similarity


class CognitiveManifold:
    def distance(self, a, b, weights=None):
        return {
            "hamming": hamming_distance(a, b),
            "euclidean": euclidean_distance(a, b, weights),
            "manhattan": manhattan_distance(a, b),
            "cosine": cosine_similarity(a, b)
        }
