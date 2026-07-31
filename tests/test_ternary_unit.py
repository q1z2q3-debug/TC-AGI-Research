from core.ternary_unit.ternary_unit import CognitiveUnit, TernaryState


def test_positive_transition():
    unit = CognitiveUnit(TernaryState(0))
    state = unit.transition(1.0)
    assert state.value == 1


def test_negative_transition():
    unit = CognitiveUnit(TernaryState(0))
    state = unit.transition(-1.0)
    assert state.value == -1
