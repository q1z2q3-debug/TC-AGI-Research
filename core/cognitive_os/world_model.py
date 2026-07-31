"""TC-AGI World Model

Maintains internal representation of external reality.
"""


class WorldModel:
    def __init__(self):
        self.entities = {}

    def update(self, entity, state):
        self.entities[entity] = state

    def query(self, entity):
        return self.entities.get(entity)
