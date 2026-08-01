from typing import Any, Dict, List


class FutureTree:
    """Stores possible future branches."""

    def branch(self, state: Dict[str, Any], actions: List[Dict[str, Any]]):
        return [
            {
                "parent": state,
                "action": action,
            }
            for action in actions
        ]
