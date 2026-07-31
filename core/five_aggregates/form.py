"""TC-AGI Five Aggregates: Form (色)

Represents physical/world state perception.
"""


class FormLayer:
    def __init__(self):
        self.world_state = {}

    def observe(self, entity_id, state):
        self.world_state[entity_id] = state
        return state
