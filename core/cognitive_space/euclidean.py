"""TC-AGI Weighted Cognitive Euclidean Distance"""

import math


def euclidean_distance(a, b, weights=None):
    if len(a) != len(b):
        raise ValueError("Vectors must have equal dimensions")

    if weights is None:
        weights = [1.0] * len(a)

    return math.sqrt(sum(w * (x - y) ** 2 for x, y, w in zip(a, b, weights)))
