import type { Message } from '../../types/conversation';
import { MessageContent } from './MessageContent';
import { UsageDebugBar } from './UsageDebugBar';

type MessageBubbleProps = {
  message: Message;
  variant: 'friend' | 'buddy';
  assistantLabel?: string;
  showRewind?: boolean;
  onRewind?: () => void;
  rewindDisabled?: boolean;
};

export function MessageBubble({
  message,
  variant,
  assistantLabel,
  showRewind = false,
  onRewind,
  rewindDisabled = false,
}: MessageBubbleProps) {
  const isUser = message.speaker === 'user';
  const defaultLabel = variant === 'friend' ? 'フレンド' : 'チサト';

  const variantStyles = {
    friend: {
      user: 'ml-auto bg-blue-600 text-white',
      assistant: 'mr-auto bg-blue-50 text-gray-900 border border-blue-100',
      label: isUser ? 'You' : (assistantLabel ?? defaultLabel),
    },
    buddy: {
      user: 'ml-auto bg-emerald-600 text-white',
      assistant: 'mr-auto bg-emerald-50 text-gray-900 border border-emerald-100',
      label: isUser ? 'You' : (assistantLabel ?? defaultLabel),
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <span className="text-xs font-medium text-gray-500">{styles.label}</span>
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? `whitespace-pre-wrap ${styles.user}` : styles.assistant}`}
      >
        <MessageContent content={message.content} isUser={isUser} />
      </div>
      {message.usage && <UsageDebugBar usage={message.usage} />}
      {showRewind && onRewind && (
        <button
          type="button"
          onClick={onRewind}
          disabled={rewindDisabled}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ここまで戻る
        </button>
      )}
    </div>
  );
}
