import { useState } from 'react';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingIndicator } from '../components/common/LoadingIndicator';
import { AdminNav } from './components/AdminNav';
import { UserCreateForm } from './components/UserCreateForm';
import { UserDetailPanel } from './components/UserDetailPanel';
import { UserListTable } from './components/UserListTable';
import { useUserAdmin } from '../hooks/useUserAdmin';

export function UserAdmin() {
  const admin = useUserAdmin();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isBusy = admin.loadingList || admin.loadingDetail || admin.loadingAction;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
            <h1 className="text-xl font-bold text-gray-900">ユーザ管理</h1>
            <p className="mt-1 text-sm text-gray-600">ユーザの登録・トークン付与・削除を行います</p>
          </div>
          <AdminNav current="users" />
        </div>
      </header>

      {admin.error && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <ErrorBanner message={admin.error} onDismiss={admin.clearError} />
        </div>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 p-4">
        <UserCreateForm
          userId={admin.createUserId}
          initialTokens={admin.createInitialTokens}
          loading={admin.loadingAction}
          onUserIdChange={admin.setCreateUserId}
          onInitialTokensChange={admin.setCreateInitialTokens}
          onSubmit={() => {
            void admin.createUser();
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <section className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white lg:min-h-0">
            {admin.loadingList && admin.users.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8">
                <LoadingIndicator label="ユーザ一覧を読み込み中..." />
              </div>
            ) : (
              <UserListTable
                users={admin.users}
                selectedUserId={admin.selectedUserId}
                onSelectUser={(userId) => {
                  void admin.selectUser(userId);
                }}
                disabled={isBusy}
              />
            )}
          </section>

          <section className="w-full shrink-0 lg:w-[360px]">
            <UserDetailPanel
              detail={admin.detail}
              loading={admin.loadingDetail}
              selectedUserId={admin.selectedUserId}
              actionLoading={admin.loadingAction}
              onGrantTokens={(tokens) => {
                void admin.grantTokens(tokens);
              }}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </section>
        </div>
      </main>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="ユーザを削除しますか？"
        message="PROFILE・会話履歴・トークン台帳をすべて削除します。この操作は取り消せません。"
        confirmLabel="削除する"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          void admin.deleteUser();
        }}
      />
    </div>
  );
}
