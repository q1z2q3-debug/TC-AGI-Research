"""TC-AGI Cognitive Evolution Distance"""


def manhattan_distance(a, b):
    if len(a) != len(b):
        raise ValueError("Vectors must have equal dimensions")
    return sum(abs(x - y) for x, y in zip(a, b))
