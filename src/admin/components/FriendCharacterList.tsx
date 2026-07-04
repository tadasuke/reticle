import type { FriendCharacterListItem } from '../../types/friendCharacter';

type FriendCharacterListProps = {
  friendTypes: FriendCharacterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export function FriendCharacterList({
  friendTypes,
  selectedId,
  onSelect,
  onCreate,
}: FriendCharacterListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">フレンド一覧</h2>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            新規作成
          </button>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto p-2">
        {friendTypes.map((friend) => (
          <li key={friend.id}>
            <button
              type="button"
              onClick={() => onSelect(friend.id)}
              className={`mb-1 w-full rounded-lg border px-3 py-2 text-left transition ${
                selectedId === friend.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{friend.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{friend.subtitle}</p>
              {!friend.enabled && (
                <p className="mt-1 text-xs text-amber-600">非表示</p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
