import { useMemo, useState } from 'react';
import type { RealFriendListItem } from '../types/realFriend';
import { RealFriendAvatar } from './components/RealFriendAvatar';

type RealFriendSidebarProps = {
  realFriends: RealFriendListItem[];
  activeFriendId: string | null;
  loading: boolean;
  onSelectFriend: (friendId: string) => void;
  onCreateFriend: () => void;
  onEditFriend: () => void;
};

function formatLastInteraction(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RealFriendSidebar({
  realFriends,
  activeFriendId,
  loading,
  onSelectFriend,
  onCreateFriend,
  onEditFriend,
}: RealFriendSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return realFriends;
    return realFriends.filter((friend) => friend.label.toLowerCase().includes(q));
  }, [realFriends, searchQuery]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="shrink-0 border-b border-gray-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-900">リアルフレンド</h2>
        <p className="mt-1 text-xs text-gray-500">最終やり取り順</p>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="名前で検索"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="名前で検索"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && realFriends.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">読み込み中...</p>
        ) : realFriends.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">登録がありません</p>
        ) : filteredFriends.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">該当するフレンドがありません</p>
        ) : (
          filteredFriends.map((friend) => {
            const selected = friend.id === activeFriendId;
            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => onSelectFriend(friend.id)}
                className={`w-full border-b border-gray-100 px-3 py-3 text-left transition ${
                  selected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <RealFriendAvatar label={friend.label} avatarUrl={friend.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900">{friend.label}</p>
                      {friend.sourceApp && (
                        <span className="shrink-0 text-[10px] text-gray-400">{friend.sourceApp}</span>
                      )}
                    </div>
                    {friend.lastMessagePreview ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                        {friend.lastMessageSpeaker && (
                          <span className="font-medium text-gray-500">
                            {friend.lastMessageSpeaker === 'user' ? 'あなた' : friend.label}:{' '}
                          </span>
                        )}
                        {friend.lastMessagePreview}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">会話履歴なし</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {formatLastInteraction(friend.lastInteractionAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={onCreateFriend}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 新規リアルフレンド
        </button>
        {activeFriendId && (
          <button
            type="button"
            onClick={onEditFriend}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            選択中を編集
          </button>
        )}
      </div>
    </aside>
  );
}
