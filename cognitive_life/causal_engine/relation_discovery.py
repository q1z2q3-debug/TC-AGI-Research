from typing import Any, Dict, List


class RelationDiscovery:
    """Discovers candidate relationships from observations."""

    def discover(self, observations: List[Dict[str, Any]]):
        relations = []
        for item in observations:
            keys = list(item.keys())
            if len(keys) >= 2:
                relations.append({
                    "source": keys[0],
                    "target": keys[1],
                    "confidence": 0.0,
                })
        return relations
