import {
  useRef,
  useState,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

type ChatInputProps = {
  placeholder: string;
  onSend: (content: string) => void;
  disabled?: boolean;
  buttonLabel?: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  peerInputRef?: RefObject<HTMLTextAreaElement | null>;
};

export function ChatInput({
  placeholder,
  onSend,
  disabled = false,
  buttonLabel = '送信',
  inputRef,
  peerInputRef,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const isComposingRef = useRef(false);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (_e: CompositionEvent<HTMLTextAreaElement>) => {
    // IME確定時の Enter が keydown より先に compositionend するブラウザ対策
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      // #region agent log
      fetch('/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb04b'},body:JSON.stringify({sessionId:'cbb04b',location:'ChatInput.tsx:handleKeyDown',message:'Tab keydown',data:{placeholder,shiftKey:e.shiftKey,hasPeerInputRef:!!peerInputRef,peerCurrent:!!peerInputRef?.current,peerDisabled:peerInputRef?.current?.disabled,peerReadOnly:peerInputRef?.current?.readOnly,isComposingRef:isComposingRef.current,nativeIsComposing:e.nativeEvent.isComposing,activePlaceholder:(document.activeElement as HTMLTextAreaElement|null)?.placeholder},timestamp:Date.now(),hypothesisId:'H1-H4'})}).catch(()=>{});
      // #endregion
    }

    if (e.key === 'Tab' && !e.shiftKey && peerInputRef) {
      if (isComposingRef.current || e.nativeEvent.isComposing) {
        // #region agent log
        fetch('/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb04b'},body:JSON.stringify({sessionId:'cbb04b',location:'ChatInput.tsx:ime-block',message:'Tab blocked by IME guard',data:{placeholder,isComposingRef:isComposingRef.current,nativeIsComposing:e.nativeEvent.isComposing},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      peerInputRef.current?.focus();
      // #region agent log
      fetch('/debug-ingest',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb04b'},body:JSON.stringify({sessionId:'cbb04b',location:'ChatInput.tsx:after-focus',message:'Tab focus attempted',data:{placeholder,peerCurrent:!!peerInputRef.current,activeAfter:(document.activeElement as HTMLTextAreaElement|null)?.placeholder,activeTag:document.activeElement?.tagName},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
      // #endregion
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (isComposingRef.current || e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 bg-white p-3">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={disabled}
        aria-disabled={disabled}
        rows={2}
        className={`flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
          disabled ? 'cursor-not-allowed bg-gray-50' : ''
        }`}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="self-end rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
