import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '../types/conversation';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { MessageContent } from '../components/conversation/MessageContent';

type RealFriendMessageListProps = {
  messages: Message[];
  assistantLabel: string;
  isLoading: boolean;
  translatingIds: Set<string>;
  emptyMessage: string;
  deletableMessageId: string | null;
  onDeleteLastMessage: () => void;
  deleteDisabled?: boolean;
};

export function RealFriendMessageList({
  messages,
  assistantLabel,
  isLoading,
  translatingIds,
  emptyMessage,
  deletableMessageId,
  onDeleteLastMessage,
  deleteDisabled = false,
}: RealFriendMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const filtered = messages.filter((message) => message.channel === 'friend');
  const lastFriendMessageId = useMemo(() => filtered.at(-1)?.id ?? null, [filtered]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [filtered.length, isLoading, translatingIds.size, lastFriendMessageId]);

  const handleConfirmDelete = () => {
    onDeleteLastMessage();
    setPendingDelete(false);
  };

  return (
    <>
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {filtered.length === 0 && !isLoading && (
        <p className="text-center text-sm text-gray-400">{emptyMessage}</p>
      )}
      {filtered.map((message) => {
        const isUser = message.speaker === 'user';
        const label = isUser ? 'You' : assistantLabel;
        const isTranslating = translatingIds.has(message.id);

        return (
          <div
            key={message.id}
            className={`flex max-w-[85%] flex-col gap-1 ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
          >
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isUser
                  ? 'whitespace-pre-wrap bg-blue-600 text-white'
                  : 'bg-blue-50 text-gray-900 border border-blue-100'
              }`}
            >
              <MessageContent content={message.content} isUser={isUser} />
            </div>
            {isTranslating && !message.translationJa && (
              <p className="text-xs text-gray-400">訳を取得中...</p>
            )}
            {message.translationJa && (
              <p className="max-w-full text-xs leading-relaxed text-gray-500">{message.translationJa}</p>
            )}
            {lastFriendMessageId === message.id && (
              <button
                type="button"
                onClick={() => setPendingDelete(true)}
                disabled={deleteDisabled}
                className="mt-0.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                削除
              </button>
            )}
          </div>
        );
      })}
      {isLoading && filtered.length > 0 && <LoadingIndicator />}
    </div>

    <ConfirmDialog
      open={pendingDelete}
      title="メッセージを削除しますか？"
      message="このメッセージを削除します。バディパネルのトークは残ります。"
      onConfirm={handleConfirmDelete}
      onCancel={() => setPendingDelete(false)}
    />
    </>
  );
}
