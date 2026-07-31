"""TC-AGI Cognitive Dynamics Integrator"""


class CognitiveDynamics:
    def __init__(self, transition, evolution):
        self.transition = transition
        self.evolution = evolution

    def step(self, state):
        return self.transition.next_states(state)
