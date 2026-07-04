type TypingIndicatorProps = {
  variant: 'friend' | 'buddy';
  assistantLabel?: string;
};

export function TypingIndicator({ variant, assistantLabel }: TypingIndicatorProps) {
  const defaultLabel = variant === 'friend' ? 'フレンド' : 'チサト';
  const bubbleStyle =
    variant === 'friend'
      ? 'bg-blue-50 text-gray-500 border border-blue-100'
      : 'bg-emerald-50 text-gray-500 border border-emerald-100';

  return (
    <div className="flex max-w-[85%] flex-col gap-1 self-start items-start">
      <span className="text-xs font-medium text-gray-500">{assistantLabel ?? defaultLabel}</span>
      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${bubbleStyle}`}>
        書き込み中
        <span className="inline-block animate-pulse">・・・</span>
      </div>
    </div>
  );
}
