"""TC-AGI Cognitive Hamming Distance

Measures structural difference between two balanced ternary cognitive states.
"""


def hamming_distance(a, b):
    if len(a) != len(b):
        raise ValueError("Vectors must have equal dimensions")
    return sum(x != y for x, y in zip(a, b))
