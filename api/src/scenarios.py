from dataclasses import dataclass
from typing import Literal

ScenarioId = Literal["casual", "cafe", "bar", "sns"]


@dataclass(frozen=True)
class ScenarioData:
    id: ScenarioId
    title: str
    context: str


SCENARIOS: dict[ScenarioId, ScenarioData] = {
    "casual": ScenarioData(
        id="casual",
        title="カジュアルな会話",
        context=(
            "You are at a casual social gathering and just met the user. "
            "Start a friendly, natural conversation about everyday topics like hobbies, "
            "weekend plans, or recent experiences."
        ),
    ),
    "cafe": ScenarioData(
        id="cafe",
        title="カフェで注文",
        context=(
            "You are at a cozy cafe with the user. Practice ordering drinks and food, "
            "asking about menu items, and handling a typical cafe interaction."
        ),
    ),
    "bar": ScenarioData(
        id="bar",
        title="飲み屋で隣に座った人との会話",
        context=(
            "You are at a bar or izakaya, sitting next to the user. You just met or are casually "
            "chatting with them. Practice natural small talk — ordering drinks, commenting on the "
            "atmosphere, sharing light stories, and getting to know each other."
        ),
    ),
    "sns": ScenarioData(
        id="sns",
        title="SNSで知り合った外国人との会話",
        context=(
            "You connected with the user on social media and this is your first conversation with them "
            "(chat or DM). Practice a natural first message — introducing yourself, breaking the ice, "
            "and finding common interests."
        ),
    ),
}


def get_scenario(scenario_id: str) -> ScenarioData:
    if scenario_id not in SCENARIOS:
        raise ValueError(f"Unknown scenarioId: {scenario_id}")
    return SCENARIOS[scenario_id]  # type: ignore[index]
