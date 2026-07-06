type UserCreateFormProps = {
  userId: string;
  initialTokens: string;
  loading: boolean;
  onUserIdChange: (value: string) => void;
  onInitialTokensChange: (value: string) => void;
  onSubmit: () => void;
};

export function UserCreateForm({
  userId,
  initialTokens,
  loading,
  onUserIdChange,
  onInitialTokensChange,
  onSubmit,
}: UserCreateFormProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">ユーザ登録</h2>
      <p className="mt-1 text-sm text-gray-600">管理画面で登録した ID のみ AI モードにログインできます</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <label htmlFor="admin-user-id" className="mb-1 block text-sm font-medium text-gray-700">
            ユーザー ID
          </label>
          <input
            id="admin-user-id"
            type="text"
            value={userId}
            disabled={loading}
            onChange={(event) => onUserIdChange(event.target.value)}
            placeholder="例: tanaka"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="admin-initial-tokens" className="mb-1 block text-sm font-medium text-gray-700">
            初期AIトークン
          </label>
          <input
            id="admin-initial-tokens"
            type="number"
            min={0}
            value={initialTokens}
            disabled={loading}
            onChange={(event) => onInitialTokensChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
        <button
          type="button"
          disabled={loading || !userId.trim()}
          onClick={onSubmit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          登録
        </button>
      </div>
    </section>
  );
}
