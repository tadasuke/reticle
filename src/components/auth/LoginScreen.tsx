import { useState } from 'react';
import { ErrorBanner } from '../common/ErrorBanner';
import { LoadingIndicator } from '../common/LoadingIndicator';

type LoginScreenProps = {
  onLogin: (userId: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  onDismissError?: () => void;
};

export function LoginScreen({ onLogin, loading = false, error, onDismissError }: LoginScreenProps) {
  const [userId, setUserId] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">バディートーク</h1>
        <p className="mt-2 text-sm text-gray-600">
          管理画面で登録されたユーザー ID のみログインできます。
        </p>

        {error ? (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={onDismissError} />
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = userId.trim();
            if (!trimmed || loading) return;
            void onLogin(trimmed);
          }}
        >
          <div>
            <label htmlFor="userId" className="mb-1 block text-sm font-medium text-gray-700">
              ユーザー ID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              disabled={loading}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="例: tanaka"
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">3〜32文字。英数字、_、- のみ使用できます。</p>
          </div>

          <button
            type="submit"
            disabled={loading || !userId.trim()}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? <LoadingIndicator label="ログイン中..." /> : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
