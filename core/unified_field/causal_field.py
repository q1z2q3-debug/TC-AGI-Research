"""TC-AGI Causal Field

Models cause-condition-effect relationships.
"""


class CausalField:
    def __init__(self):
        self.relations = []

    def add_relation(self, cause, condition, effect):
        self.relations.append({
            "cause": cause,
            "condition": condition,
            "effect": effect
        })

    def query(self):
        return self.relations
