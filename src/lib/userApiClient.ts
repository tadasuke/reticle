import type { AiConversationCreateRequest, AiConversationDetail, AiConversationListItem } from '../types/aiConversation';
import type { BuddySupportType, Message } from '../types/conversation';
import type { UserLoginResponse } from '../types/user';

const REQUEST_TIMEOUT_MS = 30_000;

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL が設定されていません。.env ファイルを確認してください。');
  }
  return baseUrl.replace(/\/$/, '');
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let data: T & { error?: string; detail?: string };
  try {
    data = (await response.json()) as T & { error?: string; detail?: string };
  } catch {
    throw new Error('API から不正なレスポンスが返されました。');
  }

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? fallbackMessage);
  }

  return data;
}

function userHeaders(userId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
  };
}

export async function loginUser(userId: string): Promise<UserLoginResponse> {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return parseResponse<UserLoginResponse>(response, 'ログインに失敗しました。');
}

export async function fetchAiConversations(userId: string): Promise<AiConversationListItem[]> {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/ai-conversations`, {
    headers: userHeaders(userId),
  });
  const data = await parseResponse<{ conversations: AiConversationListItem[] }>(
    response,
    '会話一覧の取得に失敗しました。',
  );
  return data.conversations;
}

export async function createAiConversation(
  userId: string,
  request: AiConversationCreateRequest,
): Promise<AiConversationDetail> {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/ai-conversations`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: JSON.stringify(request),
  });
  return parseResponse<AiConversationDetail>(response, '会話の作成に失敗しました。');
}

export async function fetchAiConversation(userId: string, conversationId: string): Promise<AiConversationDetail> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/ai-conversations/${encodeURIComponent(conversationId)}`,
    {
      headers: userHeaders(userId),
    },
  );
  return parseResponse<AiConversationDetail>(response, '会話の取得に失敗しました。');
}

export async function saveAiConversationMessages(
  userId: string,
  conversationId: string,
  messages: Message[],
): Promise<AiConversationDetail> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/ai-conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'PUT',
      headers: userHeaders(userId),
      body: JSON.stringify({ messages }),
    },
  );
  return parseResponse<AiConversationDetail>(response, '会話の保存に失敗しました。');
}

export async function patchAiConversation(
  userId: string,
  conversationId: string,
  patch: { supportType?: BuddySupportType; buddyTypeId?: string },
): Promise<AiConversationDetail> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/ai-conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'PATCH',
      headers: userHeaders(userId),
      body: JSON.stringify(patch),
    },
  );
  return parseResponse<AiConversationDetail>(response, '会話の更新に失敗しました。');
}
