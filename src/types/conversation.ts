export type Speaker = 'user' | 'friend' | 'buddy';

export type MessageChannel = 'friend' | 'buddy';

export type ScenarioId = 'casual' | 'cafe' | 'bar' | 'sns';

export type AiModelId = 'qwen' | 'claude';

export type FriendTypeId = string;

export type BuddyTypeId = string;

export type BuddySupportType = 'high' | 'middle' | 'low';

export type CharacterTypeBase = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
};

export type FriendType = CharacterTypeBase & {
  id: string;
  hasReference?: boolean;
  referenceUrl?: string | null;
};
export type BuddyType = CharacterTypeBase & { id: string };

export type Message = {
  id: string;
  speaker: Speaker;
  channel: MessageChannel;
  content: string;
  timestamp: number;
  usage?: ApiUsage;
};

export type Scenario = {
  id: ScenarioId;
  title: string;
  description: string;
};

export type Character = 'friend' | 'buddy';

export type ApiUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  service_tier?: string;
};

export type ConversationResponse = {
  text: string;
  usage: ApiUsage;
  aiTokenBalance?: number;
};
