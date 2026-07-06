import { formatDateTime } from '../../lib/formatDateTime';
import type { AdminUserListItem } from '../../types/adminUser';

type UserListTableProps = {
  users: AdminUserListItem[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  disabled?: boolean;
};

export function UserListTable({
  users,
  selectedUserId,
  onSelectUser,
  disabled = false,
}: UserListTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-gray-500">
        登録済みのユーザがありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
              ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
              最終利用日時
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
              所持AIトークン
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {users.map((user) => {
            const selected = selectedUserId === user.userId;
            return (
              <tr
                key={user.userId}
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                  if (!disabled) onSelectUser(user.userId);
                }}
                onKeyDown={(event) => {
                  if (disabled) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectUser(user.userId);
                  }
                }}
                className={`cursor-pointer transition-colors ${
                  selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{user.userId}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatDateTime(user.lastLoginAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                  {user.aiTokenBalance.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
