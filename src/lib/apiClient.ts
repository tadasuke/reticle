import type {
  AiModelId,
  BuddyType,
  BuddyTypeId,
  Character,
  ConversationResponse,
  FriendType,
  FriendTypeId,
  Message,
  ScenarioId,
} from '../types/conversation';

type ConversationRequestBase = {
  scenarioId: ScenarioId;
  friendType: FriendTypeId;
  buddyType: BuddyTypeId;
  aiModel: AiModelId;
};

type ConversationRequest =
  | (ConversationRequestBase & {
      type: 'opening';
    })
  | (ConversationRequestBase & {
      type: 'message';
      character: Character;
      messages: Message[];
      mode?: 'consult' | 'feedback' | 'support';
    })
  | (ConversationRequestBase & {
      type: 'message';
      mode: 'translate';
      englishText: string;
    });

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL が設定されていません。.env ファイルを確認してください。');
  }
  return baseUrl.replace(/\/$/, '');
}

export function getMediaUrl(urlPath: string): string {
  if (urlPath.startsWith('http')) {
    return urlPath;
  }
  return `${getApiBaseUrl()}${urlPath}`;
}

async function postConversation(body: ConversationRequest): Promise<ConversationResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3adb99'},body:JSON.stringify({sessionId:'3adb99',location:'apiClient.ts:postConversation',message:'conversation request body',data:{type:body.type,friendType:'friendType' in body ? body.friendType : null,buddyType:'buddyType' in body ? body.buddyType : null,hasLisaType:Object.prototype.hasOwnProperty.call(body,'lisaType')},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  const response = await fetch(`${getApiBaseUrl()}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as ConversationResponse & { error?: string; detail?: string };

  if (!response.ok) {
    // #region agent log
    fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3adb99'},body:JSON.stringify({sessionId:'3adb99',location:'apiClient.ts:postConversation',message:'conversation error response',data:{status:response.status,detail:data.error ?? data.detail ?? null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw new Error(data.error ?? data.detail ?? 'API リクエストに失敗しました。');
  }

  if (!data.text || !data.usage) {
    throw new Error('API からテキスト応答が返されませんでした。');
  }

  return { text: data.text, usage: data.usage };
}

export async function fetchFriendTypes(): Promise<FriendType[]> {
  const response = await fetch(`${getApiBaseUrl()}/friend-types`);
  const data = (await response.json()) as {
    friendTypes: FriendType[];
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? 'フレンド一覧の取得に失敗しました。');
  }

  return data.friendTypes;
}

export async function fetchBuddyTypes(): Promise<BuddyType[]> {
  const response = await fetch(`${getApiBaseUrl()}/buddy-types`);
  const data = (await response.json()) as {
    buddyTypes: BuddyType[];
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? 'バディ一覧の取得に失敗しました。');
  }

  return data.buddyTypes;
}

export async function sendMessage(
  character: Character,
  scenarioId: ScenarioId,
  messages: Message[],
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postConversation({
    type: 'message',
    scenarioId,
    friendType,
    buddyType,
    aiModel,
    character,
    messages,
    mode: 'consult',
  });
}

export async function sendCoachFeedback(
  scenarioId: ScenarioId,
  messages: Message[],
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postConversation({
    type: 'message',
    scenarioId,
    friendType,
    buddyType,
    aiModel,
    character: 'buddy',
    messages,
    mode: 'feedback',
  });
}

export async function sendBuddySupport(
  scenarioId: ScenarioId,
  messages: Message[],
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postConversation({
    type: 'message',
    scenarioId,
    friendType,
    buddyType,
    aiModel,
    character: 'buddy',
    messages,
    mode: 'support',
  });
}

export async function sendAiBuddyTranslation(
  scenarioId: ScenarioId,
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  englishText: string,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postConversation({
    type: 'message',
    scenarioId,
    friendType,
    buddyType,
    aiModel,
    mode: 'translate',
    englishText,
  });
}

export async function generateFriendOpening(
  scenarioId: ScenarioId,
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postConversation({
    type: 'opening',
    scenarioId,
    friendType,
    buddyType,
    aiModel,
  });
}
