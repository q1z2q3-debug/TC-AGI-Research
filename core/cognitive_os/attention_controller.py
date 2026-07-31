"""TC-AGI Attention Controller

Controls allocation of cognitive attention resources.
"""


class AttentionController:
    def focus(self, candidates):
        return max(candidates, key=lambda x: x.get("importance", 0)) if candidates else None
