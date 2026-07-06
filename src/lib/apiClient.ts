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
  conversationId?: string;
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

type PostConversationContext = {
  userId?: string;
  conversationId?: string;
};

const REQUEST_TIMEOUT_MS = 120_000;

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

async function postConversation(
  body: ConversationRequest,
  context?: PostConversationContext,
): Promise<ConversationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': crypto.randomUUID(),
  };
  if (context?.userId) {
    headers['X-User-Id'] = context.userId;
  }

  const payload: ConversationRequest = context?.conversationId
    ? { ...body, conversationId: context.conversationId }
    : body;

  try {
    const response = await fetch(`${getApiBaseUrl()}/conversation`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let data: ConversationResponse & { error?: string; detail?: string };
    try {
      data = (await response.json()) as ConversationResponse & { error?: string; detail?: string };
    } catch {
      throw new Error('API から不正なレスポンスが返されました。');
    }

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(data.detail ?? 'AIトークンの残高がありません。');
      }
      throw new Error(data.error ?? data.detail ?? 'API リクエストに失敗しました。');
    }

    if (!data.text || !data.usage) {
      throw new Error('API からテキスト応答が返されませんでした。');
    }

    return {
      text: data.text,
      usage: data.usage,
      ...(typeof data.aiTokenBalance === 'number' ? { aiTokenBalance: data.aiTokenBalance } : {}),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildContext(userId?: string, conversationId?: string): PostConversationContext | undefined {
  if (!userId && !conversationId) return undefined;
  return { userId, conversationId };
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
  userId?: string,
  conversationId?: string,
): Promise<ConversationResponse> {
  return postConversation(
    {
      type: 'message',
      scenarioId,
      friendType,
      buddyType,
      aiModel,
      character,
      messages,
      mode: 'consult',
    },
    buildContext(userId, conversationId),
  );
}

export async function sendCoachFeedback(
  scenarioId: ScenarioId,
  messages: Message[],
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
  userId?: string,
  conversationId?: string,
): Promise<ConversationResponse> {
  return postConversation(
    {
      type: 'message',
      scenarioId,
      friendType,
      buddyType,
      aiModel,
      character: 'buddy',
      messages,
      mode: 'feedback',
    },
    buildContext(userId, conversationId),
  );
}

export async function sendBuddySupport(
  scenarioId: ScenarioId,
  messages: Message[],
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
  userId?: string,
  conversationId?: string,
): Promise<ConversationResponse> {
  return postConversation(
    {
      type: 'message',
      scenarioId,
      friendType,
      buddyType,
      aiModel,
      character: 'buddy',
      messages,
      mode: 'support',
    },
    buildContext(userId, conversationId),
  );
}

export async function sendAiBuddyTranslation(
  scenarioId: ScenarioId,
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  englishText: string,
  aiModel: AiModelId,
  userId?: string,
  conversationId?: string,
): Promise<ConversationResponse> {
  return postConversation(
    {
      type: 'message',
      scenarioId,
      friendType,
      buddyType,
      aiModel,
      mode: 'translate',
      englishText,
    },
    buildContext(userId, conversationId),
  );
}

export async function generateFriendOpening(
  scenarioId: ScenarioId,
  friendType: FriendTypeId,
  buddyType: BuddyTypeId,
  aiModel: AiModelId,
  userId?: string,
  conversationId?: string,
): Promise<ConversationResponse> {
  return postConversation(
    {
      type: 'opening',
      scenarioId,
      friendType,
      buddyType,
      aiModel,
    },
    buildContext(userId, conversationId),
  );
}
