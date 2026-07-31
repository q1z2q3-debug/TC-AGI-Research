"""TC-AGI 19683 Cognitive State Encoder"""


class CognitiveStateEncoder:
    def encode(self, vector):
        if len(vector) != 9:
            raise ValueError("Cognitive vector must have 9 dimensions")

        index = 0
        for i, value in enumerate(vector):
            if value not in (-1, 0, 1):
                raise ValueError("Each dimension must be -1, 0, or 1")
            index += (value + 1) * (3 ** i)

        return index

    def decode(self, index):
        if index < 0 or index >= 19683:
            raise ValueError("Index out of cognitive space")

        vector = []
        for _ in range(9):
            value = index % 3 - 1
            vector.append(value)
            index //= 3

        return vector
