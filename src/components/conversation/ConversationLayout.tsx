import { useMemo, useRef } from 'react';
import type { BuddySupportType, BuddyType, FriendType, Message, Scenario } from '../../types/conversation';
import { sumUsageFromMessages } from '../../lib/usageTotals';
import { ErrorBanner } from '../common/ErrorBanner';
import { BuddyPanel } from './BuddyPanel';
import { FriendPanel } from './FriendPanel';
import { TotalUsageBadge } from './TotalUsageBadge';

type ConversationLayoutProps = {
  scenario: Scenario;
  friendType?: FriendType;
  buddyType?: BuddyType;
  supportType: BuddySupportType;
  onSupportTypeChange: (type: BuddySupportType) => void;
  messages: Message[];
  loading: { friend: boolean; buddy: boolean };
  friendTyping?: boolean;
  error: string | null;
  onSendToFriend: (content: string) => void;
  onSendToBuddy: (content: string) => void;
  onRewindFriendTo: (messageId: string) => void;
  onBack: () => void;
  onDismissError: () => void;
};

export function ConversationLayout({
  scenario,
  friendType,
  buddyType,
  supportType,
  onSupportTypeChange,
  messages,
  loading,
  friendTyping = false,
  error,
  onSendToFriend,
  onSendToBuddy,
  onRewindFriendTo,
  onBack,
  onDismissError,
}: ConversationLayoutProps) {
  const friendInputRef = useRef<HTMLTextAreaElement>(null);
  const buddyInputRef = useRef<HTMLTextAreaElement>(null);
  const totalUsageTokens = useMemo(() => sumUsageFromMessages(messages), [messages]);

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">AIモード</p>
            <h1 className="text-lg font-semibold text-gray-900">AIトーク画面</h1>
            <p className="mt-1 text-xs text-gray-500">{scenario.title}</p>
            {(friendType || buddyType) && (
              <p className="mt-1 text-xs text-gray-500">
                {friendType ? `${friendType.label}（${friendType.subtitle}）` : 'フレンド'}
                {' / '}
                {buddyType ? `${buddyType.label}（${buddyType.subtitle}）` : 'チサト'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <TotalUsageBadge totalTokens={totalUsageTokens} />
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              設定を変更
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-4">
          <ErrorBanner message={error} onDismiss={onDismissError} />
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <FriendPanel
          friendType={friendType}
          messages={messages}
          isLoading={loading.friend}
          isTyping={friendTyping}
          onSend={onSendToFriend}
          onRewindTo={onRewindFriendTo}
          inputRef={friendInputRef}
          peerInputRef={buddyInputRef}
        />
        <BuddyPanel
          buddyType={buddyType}
          supportType={supportType}
          onSupportTypeChange={onSupportTypeChange}
          messages={messages}
          isLoading={loading.buddy}
          onSend={onSendToBuddy}
          inputRef={buddyInputRef}
          peerInputRef={friendInputRef}
        />
      </main>
    </div>
  );
}
