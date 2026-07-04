import type { AiModelId, BuddyTypeId, ConversationResponse, Message } from '../types/conversation';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL が設定されていません。.env ファイルを確認してください。');
  }
  return baseUrl.replace(/\/$/, '');
}

// #region agent log
function dbgApi(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '30c584' },
    body: JSON.stringify({ sessionId: '30c584', location, message, data, hypothesisId, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = (await response.json()) as T & { error?: string; detail?: string };
  if (!response.ok) {
    // #region agent log
    dbgApi('realApiClient:parseResponse', 'non-ok response', {
      status: response.status,
      url: response.url,
      detail: data.error ?? data.detail ?? fallbackMessage,
    }, 'C');
    // #endregion
    throw new Error(data.error ?? data.detail ?? fallbackMessage);
  }
  return data;
}

async function fetchWithLog(url: string, init: RequestInit, hypothesisId: string): Promise<Response> {
  try {
    const response = await fetch(url, init);
    // #region agent log
    dbgApi('realApiClient:fetchWithLog', 'fetch completed', { url, method: init.method ?? 'GET', status: response.status }, hypothesisId);
    // #endregion
    return response;
  } catch (e) {
    // #region agent log
    dbgApi('realApiClient:fetchWithLog', 'fetch failed', {
      url,
      method: init.method ?? 'GET',
      error: e instanceof Error ? e.message : String(e),
    }, hypothesisId);
    // #endregion
    throw e;
  }
}

export async function fetchRealFriends() {
  const response = await fetch(`${getApiBaseUrl()}/real-friends`);
  const data = await parseResponse<{ realFriends: import('../types/realFriend').RealFriendListItem[] }>(
    response,
    'リアルフレンド一覧の取得に失敗しました。',
  );
  return data.realFriends;
}

export async function createRealFriend(input: import('../types/realFriend').RealFriendInput) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResponse<import('../types/realFriend').RealFriendDetail>(
    response,
    'リアルフレンドの作成に失敗しました。',
  );
}

export async function updateRealFriend(id: string, input: Omit<import('../types/realFriend').RealFriendInput, 'id'>) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseResponse<import('../types/realFriend').RealFriendDetail>(
    response,
    'リアルフレンドの更新に失敗しました。',
  );
}

export async function deleteRealFriend(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ ok: boolean }>(response, 'リアルフレンドの削除に失敗しました。');
}

export async function fetchRealFriendPhotos(realFriendId: string) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${realFriendId}/photos`);
  const data = await parseResponse<{ photos: import('../types/realFriend').RealFriendPhoto[] }>(
    response,
    '画像一覧の取得に失敗しました。',
  );
  return data.photos;
}

export async function uploadRealFriendPhoto(realFriendId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${realFriendId}/photos`, {
    method: 'POST',
    body: formData,
  });
  const data = await parseResponse<{ photos: import('../types/realFriend').RealFriendPhoto[] }>(
    response,
    '画像のアップロードに失敗しました。',
  );
  return data.photos;
}

export async function setRealFriendDefaultPhoto(realFriendId: string, photoId: string) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${realFriendId}/photos/default`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId }),
  });
  const data = await parseResponse<{ photos: import('../types/realFriend').RealFriendPhoto[] }>(
    response,
    'デフォルト画像の設定に失敗しました。',
  );
  return data.photos;
}

export async function deleteRealFriendPhoto(realFriendId: string, photoId: string) {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${realFriendId}/photos/${photoId}`, {
    method: 'DELETE',
  });
  const data = await parseResponse<{ photos: import('../types/realFriend').RealFriendPhoto[] }>(
    response,
    '画像の削除に失敗しました。',
  );
  return data.photos;
}

export async function fetchRealFriendMessages(realFriendId: string): Promise<Message[]> {
  const response = await fetch(`${getApiBaseUrl()}/real-friends/${realFriendId}/messages`);
  const data = await parseResponse<{ messages: Message[] }>(
    response,
    '会話履歴の取得に失敗しました。',
  );
  return data.messages;
}

export async function saveRealFriendMessages(realFriendId: string, messages: Message[]): Promise<Message[]> {
  const response = await fetchWithLog(`${getApiBaseUrl()}/real-friends/${realFriendId}/messages`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  }, 'C');
  const data = await parseResponse<{ messages: Message[] }>(
    response,
    '会話履歴の保存に失敗しました。',
  );
  return data.messages;
}

type RealConversationRequest = {
  character: 'buddy';
  mode: 'consult' | 'feedback' | 'support';
  messages: Message[];
  realFriendId: string;
  buddyType: BuddyTypeId;
  aiModel: AiModelId;
};

async function postRealConversation(body: RealConversationRequest): Promise<ConversationResponse> {
  const response = await fetchWithLog(`${getApiBaseUrl()}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'message',
      conversationMode: 'real',
      scenarioId: 'sns',
      ...body,
    }),
  }, 'B');

  const data = (await response.json()) as ConversationResponse & { error?: string; detail?: string };

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? 'API リクエストに失敗しました。');
  }

  if (!data.text || !data.usage) {
    throw new Error('API からテキスト応答が返されませんでした。');
  }

  return { text: data.text, usage: data.usage };
}

export async function sendRealCoachFeedback(
  realFriendId: string,
  messages: Message[],
  buddyTypeId: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postRealConversation({
    character: 'buddy',
    mode: 'feedback',
    messages,
    realFriendId,
    buddyType: buddyTypeId,
    aiModel,
  });
}

export async function sendRealBuddySupport(
  realFriendId: string,
  messages: Message[],
  buddyTypeId: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postRealConversation({
    character: 'buddy',
    mode: 'support',
    messages,
    realFriendId,
    buddyType: buddyTypeId,
    aiModel,
  });
}

export async function sendRealConsult(
  realFriendId: string,
  messages: Message[],
  buddyTypeId: BuddyTypeId,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  return postRealConversation({
    character: 'buddy',
    mode: 'consult',
    messages,
    realFriendId,
    buddyType: buddyTypeId,
    aiModel,
  });
}

export async function sendRealTranslation(
  realFriendId: string,
  englishText: string,
  aiModel: AiModelId,
): Promise<ConversationResponse> {
  const response = await fetchWithLog(`${getApiBaseUrl()}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'message',
      conversationMode: 'real',
      scenarioId: 'sns',
      mode: 'translate',
      realFriendId,
      englishText,
      aiModel,
    }),
  }, 'B');

  const data = (await response.json()) as ConversationResponse & { error?: string; detail?: string };

  if (!response.ok) {
    // #region agent log
    dbgApi('realApiClient:sendRealTranslation', 'translate non-ok', {
      status: response.status,
      detail: data.error ?? data.detail,
    }, 'B');
    // #endregion
    throw new Error(data.error ?? data.detail ?? 'API リクエストに失敗しました。');
  }

  if (!data.text || !data.usage) {
    throw new Error('API からテキスト応答が返されませんでした。');
  }

  return { text: data.text, usage: data.usage };
}
