from typing import Dict, Any


class PerceptionLoop:
    def process(self, observation: Dict[str, Any]):
        return {
            "type": "perception",
            "data": observation,
        }
