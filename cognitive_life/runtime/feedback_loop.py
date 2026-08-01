from typing import Dict, Any


class FeedbackLoop:
    def evaluate(self, result: Dict[str, Any]):
        return {
            "feedback": result,
            "learning_signal": True,
        }
