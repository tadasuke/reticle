import { useMemo } from 'react';
import { formatDateTime } from '../../lib/formatDateTime';
import type { AiConversationListItem } from '../../types/aiConversation';
import type { BuddyType, FriendType } from '../../types/conversation';

type AiConversationThreadTableProps = {
  threads: AiConversationListItem[];
  friendTypes: FriendType[];
  buddyTypes: BuddyType[];
  onSelectThread: (conversationId: string) => void;
  showFriendColumn?: boolean;
  actionLabel?: string;
  disabled?: boolean;
};

export function AiConversationThreadTable({
  threads,
  friendTypes,
  buddyTypes,
  onSelectThread,
  showFriendColumn = true,
  actionLabel,
  disabled = false,
}: AiConversationThreadTableProps) {
  const friendMap = useMemo(() => new Map(friendTypes.map((type) => [type.id, type.label])), [friendTypes]);
  const buddyMap = useMemo(() => new Map(buddyTypes.map((type) => [type.id, type.label])), [buddyTypes]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {showFriendColumn ? (
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
                フレンド名
              </th>
            ) : null}
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
              バディ名
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
              会話開始日時
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
              会話終了日時
            </th>
            {actionLabel ? (
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                <span className="sr-only">{actionLabel}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {threads.map((thread) => {
            const friendLabel = friendMap.get(thread.friendTypeId) ?? thread.friendTypeId;
            const buddyLabel = buddyMap.get(thread.buddyTypeId) ?? thread.buddyTypeId;

            if (actionLabel) {
              return (
                <tr key={thread.conversationId} className="hover:bg-gray-50">
                  {showFriendColumn ? (
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">{friendLabel}</td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-3 text-gray-900">{buddyLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDateTime(thread.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDateTime(thread.lastInteractionAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectThread(thread.conversationId)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {actionLabel}
                    </button>
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={thread.conversationId}
                className="cursor-pointer transition hover:bg-blue-50"
                onClick={() => {
                  if (!disabled) onSelectThread(thread.conversationId);
                }}
              >
                {showFriendColumn ? (
                  <td className="whitespace-nowrap px-4 py-3 text-gray-900">{friendLabel}</td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{buddyLabel}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {formatDateTime(thread.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {formatDateTime(thread.lastInteractionAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
