from typing import Any, Dict, List


class InvariantDetector:
    """Finds stable patterns across changing observations."""

    def detect(self, states: List[Dict[str, Any]]):
        if not states:
            return []

        common = set(states[0].keys())
        for state in states[1:]:
            common &= set(state.keys())

        return list(common)
