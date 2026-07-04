import { useCallback, useState } from 'react';
import { fetchAiConversations } from '../lib/userApiClient';
import type { AiConversationListItem } from '../types/aiConversation';

export function useAiConversations(userId: string | null) {
  const [conversations, setConversations] = useState<AiConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const items = await fetchAiConversations(userId);
      setConversations(items);
      return items;
    } catch (e) {
      const message = e instanceof Error ? e.message : '会話一覧の取得に失敗しました。';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    conversations,
    loading,
    error,
    refreshConversations,
    clearError: () => setError(null),
  };
}
