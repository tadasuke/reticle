import { useEffect, useMemo, useState } from 'react';
import { fetchBuddyTypes, fetchFriendTypes } from '../../lib/apiClient';
import type { AiConversationListItem } from '../../types/aiConversation';
import type { BuddyType, FriendType } from '../../types/conversation';
import { ErrorBanner } from '../common/ErrorBanner';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { ScenarioSelect } from '../scenario/ScenarioSelect';
import type { StartScenarioOptions } from '../../hooks/useConversation';
import { AiConversationThreadTable } from './AiConversationThreadTable';

type AiConversationHomeProps = {
  userId: string;
  aiTokenBalance: number;
  aiTokensUsed: number;
  onRefreshUserProfile: () => Promise<void>;
  conversations: AiConversationListItem[];
  loadingConversations: boolean;
  conversationsError?: string | null;
  onRefreshConversations: () => Promise<unknown>;
  onDismissConversationsError?: () => void;
  onSelectConversation: (conversationId: string) => Promise<boolean>;
  onStartScenario: (options: StartScenarioOptions) => Promise<boolean>;
  isStartingScenario?: boolean;
  startError?: string | null;
  onDismissStartError?: () => void;
  onLogout: () => void;
};

export function AiConversationHome({
  userId,
  aiTokenBalance,
  aiTokensUsed,
  onRefreshUserProfile,
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
    void onRefreshUserProfile();
  }, [onRefreshConversations, onRefreshUserProfile]);

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

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => Date.parse(b.lastInteractionAt) - Date.parse(a.lastInteractionAt),
      ),
    [conversations],
  );

  const tokensDepleted = aiTokenBalance <= 0;

  if (showNewConversation) {
    return (
      <ScenarioSelect
        conversations={conversations}
        onSelect={async (options) => {
          const started = await onStartScenario(options);
          if (started) {
            setShowNewConversation(false);
          }
        }}
        onResumeThread={async (conversationId) => {
          const resumed = await onSelectConversation(conversationId);
          if (resumed) {
            setShowNewConversation(false);
          }
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI会話</h1>
            <p className="mt-1 text-sm text-gray-600">ユーザー ID: {userId}</p>
            <p className="mt-1 text-sm text-gray-600">
              残り AI トークン: {aiTokenBalance.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              累計消費: {aiTokensUsed.toLocaleString()}
            </p>
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

        {startError ? (
          <div className="mb-4">
            <ErrorBanner message={startError} onDismiss={onDismissStartError} />
          </div>
        ) : null}

        {tokensDepleted ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            AIトークンの残高がありません。新しい会話を始めるにはトークンの追加が必要です。
          </div>
        ) : null}

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowNewConversation(true)}
            disabled={isStartingScenario || loadingTypes || tokensDepleted}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            新しいスレッドを始める
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
              まだ会話がありません。「新しいスレッドを始める」から始めてください。
            </div>
          ) : (
            <AiConversationThreadTable
              threads={sortedConversations}
              friendTypes={friendTypes}
              buddyTypes={buddyTypes}
              onSelectThread={(conversationId) => {
                void onSelectConversation(conversationId);
              }}
              disabled={isStartingScenario}
            />
          )}
        </section>
      </div>
    </div>
  );
}
