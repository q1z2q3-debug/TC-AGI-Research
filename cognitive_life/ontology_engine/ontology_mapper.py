from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class OntologyMapper:
    """Maps entities into universal cognitive representations."""

    entities: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def map_entity(self, name: str, attributes: Dict[str, Any]):
        self.entities[name] = attributes
        return self.entities[name]

    def describe(self, name: str):
        return self.entities.get(name, {})
