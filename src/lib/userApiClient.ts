import type { AiConversationCreateRequest, AiConversationDetail, AiConversationListItem } from '../types/aiConversation';
import type { BuddySupportType, Message } from '../types/conversation';
import type { TokenLedgerResponse } from '../types/tokenLedger';
import type { User, UserLoginResponse } from '../types/user';

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
  const baseUrl = getApiBaseUrl();
  const loginUrl = `${baseUrl}/users/login`;
  // #region agent log
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe457c'},body:JSON.stringify({sessionId:'fe457c',location:'userApiClient.ts:loginUser:pre-fetch',message:'login request starting',data:{baseUrl,loginUrl,userIdLength:userId.length},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  let response: Response;
  try {
    response = await fetchWithTimeout(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe457c'},body:JSON.stringify({sessionId:'fe457c',location:'userApiClient.ts:loginUser:fetch-error',message:'login fetch failed',data:{loginUrl,errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
  // #region agent log
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe457c'},body:JSON.stringify({sessionId:'fe457c',location:'userApiClient.ts:loginUser:post-fetch',message:'login fetch completed',data:{loginUrl,status:response.status,ok:response.ok},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return parseResponse<UserLoginResponse>(response, 'ログインに失敗しました。');
}

export async function fetchUserProfile(userId: string): Promise<User> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/users/${encodeURIComponent(userId)}`,
    {
      headers: userHeaders(userId),
    },
  );
  const data = await parseResponse<{ user: User }>(response, 'ユーザ情報の取得に失敗しました。');
  return data.user;
}

export async function fetchTokenLedger(
  userId: string,
  options?: { limit?: number; cursor?: string },
): Promise<TokenLedgerResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.cursor) params.set('cursor', options.cursor);
  const query = params.toString();
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/users/${encodeURIComponent(userId)}/token-ledger${query ? `?${query}` : ''}`,
    {
      headers: userHeaders(userId),
    },
  );
  return parseResponse<TokenLedgerResponse>(response, 'トークン利用履歴の取得に失敗しました。');
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
