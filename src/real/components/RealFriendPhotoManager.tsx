import { useRef, type ChangeEvent } from 'react';
import { getMediaUrl } from '../../lib/apiClient';
import type { RealFriendPhoto } from '../../types/realFriend';

type RealFriendPhotoManagerProps = {
  friendId: string | null;
  editing: boolean;
  photos: RealFriendPhoto[];
  loading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onSetDefault: (photoId: string) => void;
  onDelete: (photoId: string) => void;
  onDismissError?: () => void;
};

export function RealFriendPhotoManager({
  friendId,
  editing,
  photos,
  loading,
  error,
  onUpload,
  onSetDefault,
  onDelete,
  onDismissError,
}: RealFriendPhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!editing || !friendId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
        登録後に画像を追加できます
      </div>
    );
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">プロフィール画像</p>
          <p className="text-xs text-gray-500">JPEG / PNG / WebP（最大 5MB）</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          画像を追加
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-start justify-between gap-3">
            <p>{error}</p>
            {onDismissError && (
              <button type="button" onClick={onDismissError} className="shrink-0 text-xs underline">
                閉じる
              </button>
            )}
          </div>
        </div>
      )}

      {loading && photos.length === 0 ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-gray-400">画像が登録されていません</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={getMediaUrl(photo.url)}
                  alt={`${friendId} ${photo.id}`}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="space-y-2 p-2">
                {photo.isDefault ? (
                  <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    デフォルト
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onSetDefault(photo.id)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    デフォルトにする
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onDelete(photo.id)}
                  className="w-full rounded border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
