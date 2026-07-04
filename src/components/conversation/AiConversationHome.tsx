import { useEffect, useMemo, useState } from 'react';
import { fetchBuddyTypes, fetchFriendTypes } from '../../lib/apiClient';
import type { AiConversationListItem } from '../../types/aiConversation';
import type { BuddyType, FriendType } from '../../types/conversation';
import { ErrorBanner } from '../common/ErrorBanner';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { ScenarioSelect } from '../scenario/ScenarioSelect';
import type { StartScenarioOptions } from '../../hooks/useConversation';

type AiConversationHomeProps = {
  userId: string;
  conversations: AiConversationListItem[];
  loadingConversations: boolean;
  conversationsError?: string | null;
  onRefreshConversations: () => Promise<unknown>;
  onDismissConversationsError?: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartScenario: (options: StartScenarioOptions) => void;
  isStartingScenario?: boolean;
  startError?: string | null;
  onDismissStartError?: () => void;
  onLogout: () => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP');
}

export function AiConversationHome({
  userId,
  conversations,
  loadingConversations,
  conversationsError,
  onRefreshConversations,
  onDismissConversationsError,
  onSelectConversation,
  onStartScenario,
  isStartingScenario = false,
  startError,
  onDismissStartError,
  onLogout,
}: AiConversationHomeProps) {
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [friendTypes, setFriendTypes] = useState<FriendType[]>([]);
  const [buddyTypes, setBuddyTypes] = useState<BuddyType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    void onRefreshConversations();
  }, [onRefreshConversations]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTypes(true);
    Promise.all([fetchFriendTypes(), fetchBuddyTypes()])
      .then(([friends, buddies]) => {
        if (cancelled) return;
        setFriendTypes(friends);
        setBuddyTypes(buddies);
      })
      .catch(() => {
        if (cancelled) return;
        setFriendTypes([]);
        setBuddyTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeLabels = useMemo(() => {
    const friendMap = new Map(friendTypes.map((type) => [type.id, type.label]));
    const buddyMap = new Map(buddyTypes.map((type) => [type.id, type.label]));
    return { friendMap, buddyMap };
  }, [friendTypes, buddyTypes]);

  if (showNewConversation) {
    return (
      <ScenarioSelect
        onSelect={(options) => {
          onStartScenario(options);
          setShowNewConversation(false);
        }}
        onBack={() => setShowNewConversation(false)}
        isLoading={isStartingScenario}
        error={startError}
        onDismissError={onDismissStartError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI会話</h1>
            <p className="mt-1 text-sm text-gray-600">ユーザー ID: {userId}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>

        {conversationsError ? (
          <div className="mb-4">
            <ErrorBanner message={conversationsError} onDismiss={onDismissConversationsError} />
          </div>
        ) : null}

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowNewConversation(true)}
            disabled={isStartingScenario || loadingTypes}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            新しい会話を始める
          </button>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">過去の会話</h2>
          </div>

          {loadingConversations ? (
            <div className="flex justify-center px-5 py-10">
              <LoadingIndicator label="会話一覧を読み込み中..." />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600">
              まだ会話がありません。「新しい会話を始める」から始めてください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th scope="col" className="px-5 py-3 font-medium">
                      AIフレンド
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      バディ
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      会話を始めた日時
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      最後に会話した日時
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conversations.map((conversation) => {
                    const friendLabel =
                      typeLabels.friendMap.get(conversation.friendTypeId) ?? conversation.friendTypeId;
                    const buddyLabel =
                      typeLabels.buddyMap.get(conversation.buddyTypeId) ?? conversation.buddyTypeId;
                    return (
                      <tr
                        key={conversation.conversationId}
                        onClick={() => onSelectConversation(conversation.conversationId)}
                        className="cursor-pointer text-sm transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 font-medium text-gray-900">{friendLabel}</td>
                        <td className="px-5 py-4 text-gray-900">{buddyLabel}</td>
                        <td className="px-5 py-4 text-gray-600">{formatDateTime(conversation.createdAt)}</td>
                        <td className="px-5 py-4 text-gray-600">
                          {formatDateTime(conversation.lastInteractionAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
