import type { BuddySupportType, BuddyTypeId, FriendTypeId, Message, ScenarioId } from './conversation';

export type AiConversationListItem = {
  conversationId: string;
  scenarioId: ScenarioId;
  friendTypeId: FriendTypeId;
  buddyTypeId: BuddyTypeId;
  supportType: BuddySupportType;
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string;
  lastMessagePreview: string;
};

export type AiConversationDetail = AiConversationListItem & {
  messages: Message[];
};

export type AiConversationCreateRequest = {
  scenarioId: ScenarioId;
  friendTypeId: FriendTypeId;
  buddyTypeId: BuddyTypeId;
  supportType: BuddySupportType;
};
