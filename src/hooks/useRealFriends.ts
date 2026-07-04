import { useCallback, useEffect, useState } from 'react';
import {
  createRealFriend,
  deleteRealFriend,
  fetchRealFriends,
  updateRealFriend,
} from '../lib/realApiClient';
import type { RealFriendDetail, RealFriendInput, RealFriendListItem, RealFriendLoadingState } from '../types/realFriend';

const EMPTY_FORM: RealFriendInput = {
  label: '',
  age: 25,
  nationality: '',
  gender: '',
  sourceApp: 'Tinder',
  bio: '',
  notes: '',
};

export function useRealFriends() {
  const [realFriends, setRealFriends] = useState<RealFriendListItem[]>([]);
  const [editingId, setEditingId] = useState<string>('');
  const [form, setForm] = useState<RealFriendInput>(EMPTY_FORM);
  const [loading, setLoading] = useState<RealFriendLoadingState>({
    list: true,
    detail: false,
    save: false,
    delete: false,
    messages: false,
    photos: false,
  });
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async (): Promise<RealFriendListItem[]> => {
    setLoading((prev) => ({ ...prev, list: true }));
    setError(null);
    try {
      const items = await fetchRealFriends();
      setRealFriends(items);
      return items;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リアルフレンド一覧の取得に失敗しました。');
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, list: false }));
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openNewForm = useCallback(() => {
    setEditingId('');
    setForm(EMPTY_FORM);
  }, []);

  const openEditForm = useCallback((friend: RealFriendListItem) => {
    setEditingId(friend.id);
    setForm({
      label: friend.label,
      age: friend.age,
      nationality: friend.nationality,
      gender: friend.gender,
      sourceApp: friend.sourceApp,
      bio: friend.bio,
      notes: friend.notes,
    });
  }, []);

  const closeForm = useCallback(() => {
    setEditingId('');
    setForm(EMPTY_FORM);
  }, []);

  const saveFriend = useCallback(async (): Promise<RealFriendDetail | null> => {
    if (!form.label.trim()) {
      setError('表示名を入力してください。');
      return null;
    }

    setLoading((prev) => ({ ...prev, save: true }));
    setError(null);

    try {
      const payload = {
        label: form.label.trim(),
        age: form.age,
        nationality: form.nationality.trim(),
        gender: form.gender.trim(),
        sourceApp: form.sourceApp.trim(),
        bio: form.bio.trim(),
        notes: form.notes.trim(),
      };

      const saved = editingId
        ? await updateRealFriend(editingId, payload)
        : await createRealFriend(payload);

      await loadList();
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リアルフレンドの保存に失敗しました。');
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }, [form, editingId, loadList]);

  const removeFriend = useCallback(async (): Promise<RealFriendListItem[]> => {
    if (!editingId) return [];

    setLoading((prev) => ({ ...prev, delete: true }));
    setError(null);

    try {
      await deleteRealFriend(editingId);
      closeForm();
      return await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リアルフレンドの削除に失敗しました。');
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  }, [editingId, loadList, closeForm]);

  return {
    realFriends,
    editingId,
    form,
    setForm,
    loading,
    error,
    loadList,
    openNewForm,
    openEditForm,
    closeForm,
    saveFriend,
    removeFriend,
    clearError: () => setError(null),
  };
}
