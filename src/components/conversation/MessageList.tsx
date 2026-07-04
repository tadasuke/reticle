import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message, MessageChannel } from '../../types/conversation';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

type MessageListProps = {
  messages: Message[];
  channel: MessageChannel;
  isLoading: boolean;
  isTyping?: boolean;
  emptyMessage: string;
  assistantLabel?: string;
  onRewindTo?: (messageId: string) => void;
  rewindDisabled?: boolean;
};

export function MessageList({
  messages,
  channel,
  isLoading,
  isTyping = false,
  emptyMessage,
  assistantLabel,
  onRewindTo,
  rewindDisabled = false,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingRewindId, setPendingRewindId] = useState<string | null>(null);
  const filtered = messages.filter((m) => m.channel === channel);
  const rewindEnabled = channel === 'friend' && !!onRewindTo;

  const rewindableIds = useMemo(() => {
    if (!rewindEnabled) return new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i < filtered.length - 1; i += 1) {
      if (filtered[i].speaker === 'friend') {
        ids.add(filtered[i].id);
      }
    }
    return ids;
  }, [filtered, rewindEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [filtered.length, isLoading, isTyping, channel]);

  const handleConfirmRewind = () => {
    if (pendingRewindId && onRewindTo) {
      onRewindTo(pendingRewindId);
    }
    setPendingRewindId(null);
  };

  return (
    <>
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {filtered.length === 0 && !isLoading && !isTyping && (
          <p className="text-center text-sm text-gray-400">{emptyMessage}</p>
        )}
        {filtered.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            variant={channel}
            assistantLabel={assistantLabel}
            showRewind={rewindableIds.has(message.id)}
            onRewind={() => setPendingRewindId(message.id)}
            rewindDisabled={rewindDisabled}
          />
        ))}
        {isTyping && <TypingIndicator variant={channel} assistantLabel={assistantLabel} />}
        {isLoading && !isTyping && filtered.length > 0 && <LoadingIndicator />}
      </div>

      <ConfirmDialog
        open={pendingRewindId !== null}
        title="会話を巻き戻しますか？"
        message="このメッセージ以降の会話相手との会話を削除します。バディの相談は残ります。"
        confirmLabel="巻き戻す"
        onConfirm={handleConfirmRewind}
        onCancel={() => setPendingRewindId(null)}
      />
    </>
  );
}
