from itertools import product


class TernaryStateMapper:
    """Maps ternary cognitive coordinates into a 3^9 holographic space."""

    DIMENSIONS = 9

    def encode(self, coordinate):
        if len(coordinate) != self.DIMENSIONS:
            raise ValueError("requires nine ternary dimensions")
        if any(value not in (-1, 0, 1) for value in coordinate):
            raise ValueError("ternary values must be -1, 0, 1")
        return sum(
            (value + 1) * (3 ** index)
            for index, value in enumerate(coordinate)
        )

    def space_size(self):
        return 3 ** self.DIMENSIONS
