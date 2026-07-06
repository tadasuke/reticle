import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUserDetail,
  fetchAdminUsers,
  grantAdminUserTokens,
} from '../lib/adminApiClient';
import type { AdminUserDetail, AdminUserListItem } from '../types/adminUser';

export function useUserAdmin() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [createUserId, setCreateUserId] = useState('');
  const [createInitialTokens, setCreateInitialTokens] = useState('1000000');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  const loadList = useCallback(async () => {
    const list = await fetchAdminUsers();
    setUsers(list);
    return list;
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    const data = await fetchAdminUserDetail(userId);
    if (selectedUserIdRef.current !== userId) {
      return data;
    }
    setDetail(data);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    setLoadingList(true);
    try {
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザ一覧の取得に失敗しました');
    } finally {
      setLoadingList(false);
    }
  }, [loadList]);

  const selectUser = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setDetail(null);
      setError(null);
      setLoadingDetail(true);
      try {
        await loadDetail(userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ユーザ詳細の取得に失敗しました');
      } finally {
        setLoadingDetail(false);
      }
    },
    [loadDetail],
  );

  const createUser = useCallback(async () => {
    const userId = createUserId.trim();
    const initialTokens = Number(createInitialTokens);
    if (!userId) return;

    setError(null);
    setLoadingAction(true);
    try {
      const created = await createAdminUser({ userId, initialTokens });
      setCreateUserId('');
      await loadList();
      await selectUser(created.userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザ登録に失敗しました');
    } finally {
      setLoadingAction(false);
    }
  }, [createInitialTokens, createUserId, loadList, selectUser]);

  const grantTokens = useCallback(
    async (tokens: number) => {
      if (!selectedUserId) return;

      setError(null);
      setLoadingAction(true);
      try {
        const updated = await grantAdminUserTokens(selectedUserId, { tokens });
        setDetail(updated);
        await loadList();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'トークン付与に失敗しました');
      } finally {
        setLoadingAction(false);
      }
    },
    [loadList, selectedUserId],
  );

  const deleteUser = useCallback(async () => {
    if (!selectedUserId) return;

    setError(null);
    setLoadingAction(true);
    try {
      await deleteAdminUser(selectedUserId);
      setSelectedUserId(null);
      setDetail(null);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザ削除に失敗しました');
    } finally {
      setLoadingAction(false);
    }
  }, [loadList, selectedUserId]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    users,
    selectedUserId,
    detail,
    createUserId,
    createInitialTokens,
    loadingList,
    loadingDetail,
    loadingAction,
    error,
    refresh,
    selectUser,
    setCreateUserId,
    setCreateInitialTokens,
    createUser,
    grantTokens,
    deleteUser,
    clearError,
  };
}
