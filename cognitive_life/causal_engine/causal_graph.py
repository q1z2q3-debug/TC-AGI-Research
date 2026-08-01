from collections import defaultdict
from typing import Any, Dict, List


class CausalGraph:
    """Stores candidate cause-effect relationships."""

    def __init__(self):
        self.edges = defaultdict(list)

    def add_relation(self, cause: str, effect: str, evidence: Any = None):
        self.edges[cause].append({"effect": effect, "evidence": evidence})

    def causes_of(self, effect: str) -> List[Dict[str, Any]]:
        result = []
        for cause, targets in self.edges.items():
            for target in targets:
                if target["effect"] == effect:
                    result.append({"cause": cause, **target})
        return result
