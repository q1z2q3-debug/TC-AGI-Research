"""TC-AGI V0.9.7.5 Existence Kernel

First principle layer: existence, awareness and possibility of action.
"""


class ExistenceKernel:
    def __init__(self):
        self.present = True
        self.awareness = False

    def activate(self):
        self.awareness = True
        return {"existence": self.present, "awareness": self.awareness}

    def enable_action(self):
        return self.present and self.awareness
