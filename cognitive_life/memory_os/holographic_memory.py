from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class MemoryAddress:
    ternary_coordinate: tuple
    spatial_depth: float
    temporal_phase: float


@dataclass
class HolographicMemory:
    """Memory indexed by state, space and temporal phase."""

    records: List[Dict[str, Any]] = field(default_factory=list)

    def store(self, address: MemoryAddress, content: Dict[str, Any]) -> None:
        self.records.append({
            "address": address,
            "content": content,
        })

    def retrieve(self, coordinate: tuple) -> List[Dict[str, Any]]:
        return [
            item for item in self.records
            if item["address"].ternary_coordinate == coordinate
        ]
