import type { RealFriendInput, RealFriendPhoto } from '../types/realFriend';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { RealFriendPhotoManager } from './components/RealFriendPhotoManager';

type RealFriendFormModalProps = {
  open: boolean;
  editing: boolean;
  friendId: string | null;
  form: RealFriendInput;
  photos: RealFriendPhoto[];
  loadingSave: boolean;
  loadingDelete: boolean;
  loadingPhotos: boolean;
  error: string | null;
  photoError: string | null;
  onFormChange: (form: RealFriendInput) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onDismissError?: () => void;
  onUploadPhoto: (file: File) => void;
  onSetDefaultPhoto: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
  onDismissPhotoError?: () => void;
};

export function RealFriendFormModal({
  open,
  editing,
  friendId,
  form,
  photos,
  loadingSave,
  loadingDelete,
  loadingPhotos,
  error,
  photoError,
  onFormChange,
  onSave,
  onDelete,
  onClose,
  onDismissError,
  onUploadPhoto,
  onSetDefaultPhoto,
  onDeletePhoto,
  onDismissPhotoError,
}: RealFriendFormModalProps) {
  if (!open) return null;

  const isBusy = loadingSave || loadingDelete;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editing ? 'リアルフレンドを編集' : '新しいリアルフレンド'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">相手のプロフィール情報を保存できます</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={onDismissError} />
          </div>
        )}

        <div className="mb-4">
          <RealFriendPhotoManager
            friendId={friendId}
            editing={editing}
            photos={photos}
            loading={loadingPhotos}
            error={photoError}
            onUpload={onUploadPhoto}
            onSetDefault={onSetDefaultPhoto}
            onDelete={onDeletePhoto}
            onDismissError={onDismissPhotoError}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">表示名</span>
            <input
              type="text"
              value={form.label}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, label: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例: Emma"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">年齢</span>
            <input
              type="number"
              min={1}
              max={120}
              value={form.age}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, age: Number(e.target.value) || 1 })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">出会ったアプリ</span>
            <input
              type="text"
              value={form.sourceApp}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, sourceApp: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="例: Tinder"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">国籍</span>
            <input
              type="text"
              value={form.nationality}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, nationality: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">性別</span>
            <select
              value={form.gender}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, gender: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">未設定</option>
              <option value="female">女性</option>
              <option value="male">男性</option>
              <option value="non-binary">ノンバイナリー</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">プロフィール</span>
            <textarea
              value={form.bio}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, bio: e.target.value })}
              className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="相手のプロフィール文など"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">メモ</span>
            <textarea
              value={form.notes}
              disabled={isBusy}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="自分用メモ"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isBusy || !form.label.trim()}
            onClick={onSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-gray-300"
          >
            {loadingSave ? '保存中...' : editing ? '更新する' : '登録する'}
          </button>
          {editing && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onDelete}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {loadingDelete ? '削除中...' : '削除する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
