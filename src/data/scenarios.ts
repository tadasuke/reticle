import type { Scenario, ScenarioId } from '../types/conversation';

export const DEFAULT_SCENARIO_ID: ScenarioId = 'sns';

export const scenarios: Scenario[] = [
  {
    id: 'sns',
    title: 'SNSで知り合った外国人との会話',
    description: 'SNSでつながった会話相手との初めてのやりとり',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}
