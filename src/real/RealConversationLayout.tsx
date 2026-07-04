import { useMemo, useRef } from 'react';
import type { BuddyType, Message } from '../types/conversation';
import type { RealFriendListItem } from '../types/realFriend';
import { sumUsageFromMessages } from '../lib/usageTotals';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { BuddyPanel } from '../components/conversation/BuddyPanel';
import { TotalUsageBadge } from '../components/conversation/TotalUsageBadge';
import { RealFriendPanel } from './RealFriendPanel';
import { RealFriendSidebar } from './RealFriendSidebar';

type RealConversationLayoutProps = {
  realFriends: RealFriendListItem[];
  realFriend: RealFriendListItem | null;
  activeFriendId: string | null;
  buddyTypes: BuddyType[];
  buddyTypeId: string;
  onBuddyTypeChange: (buddyId: string) => void;
  sidebarLoading: boolean;
  messages: Message[];
  loading: { friend: boolean; buddy: boolean };
  translatingIds: Set<string>;
  error: string | null;
  onSelectFriend: (friendId: string) => void;
  onCreateFriend: () => void;
  onEditFriend: () => void;
  onPasteFriendMessage: (content: string, speaker: 'friend' | 'user') => void;
  onDeleteLastMessage: () => void;
  deletableMessageId: string | null;
  deleteDisabled: boolean;
  onSendToBuddy: (content: string) => void;
  onDismissError: () => void;
};

export function RealConversationLayout({
  realFriends,
  realFriend,
  activeFriendId,
  buddyTypes,
  buddyTypeId,
  onBuddyTypeChange,
  sidebarLoading,
  messages,
  loading,
  translatingIds,
  error,
  onSelectFriend,
  onCreateFriend,
  onEditFriend,
  onPasteFriendMessage,
  onDeleteLastMessage,
  deletableMessageId,
  deleteDisabled,
  onSendToBuddy,
  onDismissError,
}: RealConversationLayoutProps) {
  const buddyInputRef = useRef<HTMLTextAreaElement>(null);
  const totalUsageTokens = useMemo(() => sumUsageFromMessages(messages), [messages]);
  const buddyType = buddyTypes.find((buddy) => buddy.id === buddyTypeId);
  const isFriendBusy = loading.friend || loading.buddy;
  const pasteDisabled = !buddyTypeId;

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">リアルモード</p>
            <h1 className="text-lg font-semibold text-gray-900">リアルトーク画面</h1>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-gray-700">
              <span className="mb-1 block text-xs font-medium text-gray-500">バディ（固定）</span>
              <select
                value={buddyTypeId}
                onChange={(e) => onBuddyTypeChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {buddyTypes.map((buddy) => (
                  <option key={buddy.id} value={buddy.id}>
                    {buddy.label}
                  </option>
                ))}
              </select>
            </label>
            <TotalUsageBadge totalTokens={totalUsageTokens} />
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              モード選択
            </a>
          </div>
        </div>
      </header>

      {error && (
        <div className="shrink-0 px-4 pt-4">
          <ErrorBanner message={error} onDismiss={onDismissError} />
        </div>
      )}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <RealFriendSidebar
          realFriends={realFriends}
          activeFriendId={activeFriendId}
          loading={sidebarLoading}
          onSelectFriend={onSelectFriend}
          onCreateFriend={onCreateFriend}
          onEditFriend={onEditFriend}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
          <RealFriendPanel
            realFriend={realFriend}
            messages={messages}
            isLoading={isFriendBusy}
            translatingIds={translatingIds}
            pasteDisabled={pasteDisabled}
            deletableMessageId={deletableMessageId}
            deleteDisabled={deleteDisabled}
            onPasteMessage={onPasteFriendMessage}
            onDeleteLastMessage={onDeleteLastMessage}
          />
          <BuddyPanel
            buddyType={buddyType}
            supportType="high"
            supportTypeFixed
            messages={messages}
            isLoading={loading.buddy}
            onSend={onSendToBuddy}
            inputRef={buddyInputRef}
          />
        </div>
      </main>
    </div>
  );
}
