import { ErrorBanner } from '../components/common/ErrorBanner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { FriendCharacterForm } from './components/FriendCharacterForm';
import { FriendCharacterList } from './components/FriendCharacterList';
import { useFriendCharacterAdmin } from '../hooks/useFriendCharacterAdmin';
import { useState } from 'react';

export function FriendCharacterAdmin() {
  const admin = useFriendCharacterAdmin();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showDetail = Boolean(admin.detail || admin.isCreating);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
            <h1 className="text-xl font-bold text-gray-900">フレンドキャラクター作成</h1>
            <p className="mt-1 text-sm text-gray-600">
              名前・年齢・ペルソナを登録します。画像はフォルダへ手動配置
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href="/admin/character-images"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              画像作成
            </a>
            <a
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              トップへ戻る
            </a>
          </div>
        </div>
      </header>

      {admin.error && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <ErrorBanner message={admin.error} onDismiss={admin.clearError} />
        </div>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="h-[420px] w-full shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white lg:h-auto lg:w-[280px]">
          <FriendCharacterList
            friendTypes={admin.friendTypes}
            selectedId={admin.selectedId}
            onSelect={admin.selectFriend}
            onCreate={admin.startCreate}
          />
        </section>

        <section className="min-h-[480px] flex-1 rounded-xl border border-gray-200 bg-white p-4 lg:min-h-0">
          {showDetail ? (
            <div className="grid h-full gap-6 lg:grid-cols-[1fr_240px]">
              <FriendCharacterForm
                form={admin.form}
                loading={admin.loading}
                isCreating={admin.isCreating}
                imageFolderPath={
                  admin.detail?.imageFolderPath ??
                  (admin.isCreating
                    ? admin.form.id?.trim()
                      ? `assets/friends/${admin.form.id.trim()}`
                      : 'assets/friends/friend-XXXX（ID 自動採番）'
                    : null)
                }
                onChange={admin.updateFormField}
                onSave={admin.save}
                onCancel={admin.cancelCreate}
                onDelete={() => setShowDeleteConfirm(true)}
              />

              <aside className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">参照画像</p>
                {admin.referenceImageUrl ? (
                  <img
                    src={admin.referenceImageUrl}
                    alt={admin.detail?.label ?? '参照画像'}
                    className="aspect-square w-full max-w-[200px] rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-xl bg-white text-center text-xs text-gray-500">
                    画像未配置
                    <br />
                    reference.png を
                    <br />
                    フォルダに置く
                  </div>
                )}
                {admin.detail?.id && (
                  <p className="text-center text-xs text-gray-500">ID: {admin.detail.id}</p>
                )}
              </aside>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-500">
              一覧からフレンドを選ぶか、新規作成してください。
            </div>
          )}
        </section>
      </main>

      {showDeleteConfirm && admin.detail && (
        <ConfirmDialog
          open
          title="フレンドを削除"
          message={`「${admin.detail.label}」を削除しますか？persona.yaml のみ削除され、画像ファイルは残ります。`}
          confirmLabel="削除"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            void admin.remove();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
