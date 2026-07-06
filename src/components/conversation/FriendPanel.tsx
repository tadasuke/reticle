import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { getMediaUrl } from '../../lib/apiClient';
import type { FriendType, Message } from '../../types/conversation';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

type FriendPanelProps = {
  friendType?: FriendType;
  messages: Message[];
  isLoading: boolean;
  isTyping?: boolean;
  onSend: (content: string) => void;
  onRewindTo?: (messageId: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  peerInputRef?: RefObject<HTMLTextAreaElement | null>;
  inputDisabled?: boolean;
};

export function FriendPanel({
  friendType,
  messages,
  isLoading,
  isTyping = false,
  onSend,
  onRewindTo,
  inputRef: inputRefProp,
  peerInputRef,
  inputDisabled = false,
}: FriendPanelProps) {
  const displayName = friendType?.label ?? 'フレンド';
  const subtitle = friendType?.subtitle ?? '英語で会話しましょう';
  const imageUrl = friendType?.referenceUrl ? getMediaUrl(friendType.referenceUrl) : null;
  const isBusy = isLoading || isTyping;
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = inputRefProp ?? localInputRef;

  const lastFriendReplyId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.channel === 'friend' && message.speaker === 'friend') {
        return message.id;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!isBusy && lastFriendReplyId) {
      // #region agent log
      fetch('/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb04b'},body:JSON.stringify({sessionId:'cbb04b',location:'FriendPanel.tsx:auto-focus',message:'FriendPanel auto-focus effect',data:{isBusy,lastFriendReplyId,activeBefore:(document.activeElement as HTMLTextAreaElement|null)?.placeholder},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      inputRef.current?.focus();
    }
  }, [isBusy, lastFriendReplyId]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-gray-200">
      <header className="shrink-0 border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-blue-100 ring-2 ring-blue-200">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-blue-400">
                画像なし
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-blue-900">{displayName}</h2>
            <p className="text-xs text-blue-700">{subtitle}</p>
          </div>
        </div>
      </header>

      {isLoading && messages.length === 0 && !isTyping ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
          <LoadingIndicator label={`${displayName} が話しかけています...`} />
        </div>
      ) : (
        <MessageList
          messages={messages}
          channel="friend"
          isLoading={isLoading}
          isTyping={isTyping}
          emptyMessage={`${displayName} の最初のメッセージを待っています...`}
          assistantLabel={displayName}
          onRewindTo={onRewindTo}
          rewindDisabled={isBusy}
        />
      )}

      <div className="shrink-0">
        <ChatInput
          inputRef={inputRef}
          peerInputRef={peerInputRef}
          placeholder="Type your reply in English..."
          onSend={onSend}
          disabled={isBusy || inputDisabled}
          buttonLabel="Send"
        />
      </div>
    </section>
  );
}
