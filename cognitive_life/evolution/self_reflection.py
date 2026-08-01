from typing import Any, Dict


class SelfReflection:
    """Analyzes previous cognitive cycles."""

    def review(self, experience: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "observation": experience,
            "insight": self._extract_pattern(experience),
        }

    def _extract_pattern(self, experience):
        return {
            "has_feedback": "feedback" in experience,
            "keys": list(experience.keys()),
        }
