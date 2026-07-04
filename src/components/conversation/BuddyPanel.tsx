import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { BUDDY_SUPPORT_TYPES, getBuddySupportTypeOption } from '../../data/buddySupportTypes';
import type { BuddySupportType, BuddyType, Message } from '../../types/conversation';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

type BuddyPanelProps = {
  buddyType?: BuddyType;
  supportType: BuddySupportType;
  onSupportTypeChange?: (type: BuddySupportType) => void;
  supportTypeFixed?: boolean;
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  peerInputRef?: RefObject<HTMLTextAreaElement | null>;
};

export function BuddyPanel({
  buddyType,
  supportType,
  onSupportTypeChange,
  supportTypeFixed = false,
  messages,
  isLoading,
  onSend,
  inputRef: inputRefProp,
  peerInputRef,
}: BuddyPanelProps) {
  const displayName = buddyType?.label ?? 'チサト';
  const subtitle = buddyType?.subtitle ?? '困ったら日本語で相談できます';
  const supportOption = getBuddySupportTypeOption(supportType);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = inputRefProp ?? localInputRef;
  const pendingConsultFocusRef = useRef(false);

  const lastBuddyReplyId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.channel === 'buddy' && message.speaker === 'buddy') {
        return message.id;
      }
    }
    return null;
  }, [messages]);

  const handleSend = (content: string) => {
    pendingConsultFocusRef.current = true;
    onSend(content);
  };

  useEffect(() => {
    if (!pendingConsultFocusRef.current || isLoading) return;
    inputRef.current?.focus();
    pendingConsultFocusRef.current = false;
  }, [isLoading, lastBuddyReplyId, inputRef]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <h2 className="text-base font-semibold text-emerald-900">{displayName}</h2>
        <p className="text-xs text-emerald-700">{subtitle}</p>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-emerald-800">サポートタイプ</p>
          {supportTypeFixed ? (
            <p className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800">
              High（固定）
            </p>
          ) : (
            <div className="flex gap-1 rounded-lg border border-emerald-200 bg-white p-1">
              {BUDDY_SUPPORT_TYPES.map((option) => {
                const selected = supportType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSupportTypeChange?.(option.id)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-xs text-emerald-600">{supportOption.description}</p>
        </div>
      </header>

      <MessageList
        messages={messages}
        channel="buddy"
        isLoading={isLoading}
        emptyMessage={supportOption.emptyMessage}
        assistantLabel={displayName}
      />

      <div className="shrink-0">
        <ChatInput
          ref={inputRef}
          peerInputRef={peerInputRef}
          placeholder="日本語で相談..."
          onSend={handleSend}
          disabled={isLoading}
          buttonLabel="相談"
        />
      </div>
    </section>
  );
}
