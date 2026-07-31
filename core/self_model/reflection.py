"""TC-AGI Self Reflection Engine

Allows the system to evaluate its own cognitive process.
"""


class ReflectionEngine:
    def reflect(self, input_state, output_state):
        return {
            "input": input_state,
            "output": output_state,
            "comparison": input_state != output_state
        }
