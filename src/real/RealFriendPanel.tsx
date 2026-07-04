import {
  useEffect,
  useRef,
  useState,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { Message } from '../types/conversation';
import type { RealFriendListItem } from '../types/realFriend';
import { RealFriendMessageList } from './RealFriendMessageList';
import { RealFriendAvatar } from './components/RealFriendAvatar';
import { RealFriendImageLightbox } from './components/RealFriendImageLightbox';

type RealFriendPanelProps = {
  realFriend: RealFriendListItem | null;
  messages: Message[];
  isLoading: boolean;
  translatingIds: Set<string>;
  pasteDisabled: boolean;
  deletableMessageId: string | null;
  deleteDisabled: boolean;
  onPasteMessage: (content: string, speaker: 'friend' | 'user') => void;
  onDeleteLastMessage: () => void;
};

type PasteInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  variant: 'partner' | 'user';
  inputRef: RefObject<HTMLTextAreaElement | null>;
  peerInputRef: RefObject<HTMLTextAreaElement | null>;
};

function PasteInput({
  label,
  value,
  onChange,
  onSubmit,
  disabled,
  variant,
  inputRef,
  peerInputRef,
}: PasteInputProps) {
  const isComposingRef = useRef(false);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSubmit();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (_e: CompositionEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      peerInputRef.current?.focus();
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

  const isPartner = variant === 'partner';

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 p-3 ${
        isPartner
          ? 'border-r border-blue-100 bg-blue-50/50 sm:border-r'
          : 'bg-gray-50/80'
      }`}
    >
      <label className={`text-xs font-medium ${isPartner ? 'text-blue-800' : 'text-gray-700'}`}>
        {label}
      </label>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        placeholder="ここにコピーしたテキストを貼り付け"
        disabled={disabled}
        rows={2}
        className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:opacity-60 ${
          isPartner
            ? 'border-blue-200 bg-white focus:border-blue-400 focus:ring-blue-400'
            : 'border-gray-300 bg-white focus:border-blue-400 focus:ring-blue-400'
        }`}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={`self-end rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
          isPartner
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-800 hover:bg-gray-900'
        }`}
      >
        追加する
      </button>
    </form>
  );
}

export function RealFriendPanel({
  realFriend,
  messages,
  isLoading,
  translatingIds,
  pasteDisabled,
  deletableMessageId,
  deleteDisabled,
  onPasteMessage,
  onDeleteLastMessage,
}: RealFriendPanelProps) {
  const [partnerDraft, setPartnerDraft] = useState('');
  const [userDraft, setUserDraft] = useState('');
  const [imageExpanded, setImageExpanded] = useState(false);
  const partnerInputRef = useRef<HTMLTextAreaElement>(null);
  const userInputRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = isLoading || pasteDisabled || !realFriend;
  const inputDisabled = isBusy;

  const handlePartnerSubmit = () => {
    if (!partnerDraft.trim() || inputDisabled) return;
    onPasteMessage(partnerDraft.trim(), 'friend');
    setPartnerDraft('');
  };

  const handleUserSubmit = () => {
    if (!userDraft.trim() || inputDisabled) return;
    onPasteMessage(userDraft.trim(), 'user');
    setUserDraft('');
  };

  useEffect(() => {
    setImageExpanded(false);
  }, [realFriend?.id]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-gray-200">
      {realFriend ? (
        <header className="shrink-0 border-b border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-3">
            {realFriend.avatarUrl ? (
              <button
                type="button"
                onClick={() => setImageExpanded(true)}
                className="shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label={`${realFriend.label}の画像を拡大表示`}
              >
                <RealFriendAvatar
                  label={realFriend.label}
                  avatarUrl={realFriend.avatarUrl}
                  size="md"
                />
              </button>
            ) : (
              <RealFriendAvatar
                label={realFriend.label}
                avatarUrl={realFriend.avatarUrl}
                size="md"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-blue-900">{realFriend.label}</h2>
              <p className="text-xs text-blue-700">{realFriend.subtitle}</p>
            </div>
          </div>
          <RealFriendImageLightbox
            open={imageExpanded}
            label={realFriend.label}
            avatarUrl={realFriend.avatarUrl}
            onClose={() => setImageExpanded(false)}
          />
        </header>
      ) : (
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-6 text-center">
          <p className="text-sm text-gray-500">左の一覧からリアルフレンドを選ぶか、新規登録してください</p>
        </header>
      )}

      <RealFriendMessageList
        messages={messages}
        assistantLabel={realFriend?.label ?? '相手'}
        isLoading={isLoading}
        translatingIds={translatingIds}
        deletableMessageId={deletableMessageId}
        onDeleteLastMessage={onDeleteLastMessage}
        deleteDisabled={deleteDisabled}
        emptyMessage={
          realFriend
            ? 'Tinder などからメッセージを貼り付けて会話を記録しましょう'
            : 'リアルフレンドが選択されていません'
        }
      />

      <div className="shrink-0 border-t border-gray-200 bg-white">
        <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
          Tinder などからコピーしたテキストを貼り付けてください
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <PasteInput
            label={realFriend ? `${realFriend.label} のメッセージ` : '相手のメッセージ'}
            value={partnerDraft}
            onChange={setPartnerDraft}
            onSubmit={handlePartnerSubmit}
            disabled={inputDisabled}
            variant="partner"
            inputRef={partnerInputRef}
            peerInputRef={userInputRef}
          />
          <PasteInput
            label="自分のメッセージ"
            value={userDraft}
            onChange={setUserDraft}
            onSubmit={handleUserSubmit}
            disabled={inputDisabled}
            variant="user"
            inputRef={userInputRef}
            peerInputRef={partnerInputRef}
          />
        </div>
        {pasteDisabled && realFriend && (
          <p className="border-t border-gray-100 px-4 py-2 text-xs text-amber-700">
            バディを選択するとメッセージを追加できます
          </p>
        )}
      </div>
    </section>
  );
}
