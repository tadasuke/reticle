import { useState } from 'react';
import { formatDateTime } from '../../lib/formatDateTime';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import type { AdminUserDetail } from '../../types/adminUser';

type UserDetailPanelProps = {
  detail: AdminUserDetail | null;
  loading: boolean;
  selectedUserId: string | null;
  actionLoading: boolean;
  onGrantTokens: (tokens: number) => void;
  onDelete: () => void;
};

export function UserDetailPanel({
  detail,
  loading,
  selectedUserId,
  actionLoading,
  onGrantTokens,
  onDelete,
}: UserDetailPanelProps) {
  const [grantTokens, setGrantTokens] = useState('');

  if (!selectedUserId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
        一覧からユーザを選択してください
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white p-8">
        <LoadingIndicator label="詳細を読み込み中..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
        詳細を表示できません
      </div>
    );
  }

  const rows = [
    { label: 'ID', value: detail.userId },
    { label: '登録日時', value: formatDateTime(detail.createdAt) },
    { label: '最終利用日時', value: formatDateTime(detail.lastLoginAt) },
    { label: '所持AIトークン', value: detail.aiTokenBalance.toLocaleString() },
    { label: '累計消費トークン', value: detail.aiTokensUsed.toLocaleString() },
    { label: 'AI会話数', value: detail.conversationCount.toLocaleString() },
  ];

  const disabled = actionLoading || loading;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">ユーザ詳細</h2>
      <dl className="mt-4 divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[9rem_1fr] gap-3 py-3 text-sm">
            <dt className="font-medium text-gray-600">{row.label}</dt>
            <dd className="text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
        <div>
          <label htmlFor="grant-tokens" className="mb-1 block text-sm font-medium text-gray-700">
            AIトークン追加
          </label>
          <div className="flex gap-2">
            <input
              id="grant-tokens"
              type="number"
              min={1}
              value={grantTokens}
              disabled={disabled}
              onChange={(event) => setGrantTokens(event.target.value)}
              placeholder="付与量"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            />
            <button
              type="button"
              disabled={disabled || !grantTokens.trim() || Number(grantTokens) < 1}
              onClick={() => {
                onGrantTokens(Number(grantTokens));
                setGrantTokens('');
              }}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              付与
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ユーザを削除
        </button>
      </div>
    </div>
  );
}
