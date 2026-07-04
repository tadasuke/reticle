import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFriendCharacter,
  deleteFriendCharacter,
  fetchFriendCharacterDetail,
  fetchFriendCharacters,
  getImageUrl,
  updateFriendCharacter,
} from '../lib/adminApiClient';
import type {
  FriendCharacterDetail,
  FriendCharacterInput,
  FriendCharacterListItem,
  FriendCharacterLoadingState,
} from '../types/friendCharacter';

const emptyForm: FriendCharacterInput = {
  id: '',
  label: '',
  age: 25,
  nationality: '',
  gender: 'female',
  subtitle: '',
  description: '',
  persona: '',
  enabled: true,
};

const initialLoading: FriendCharacterLoadingState = {
  list: false,
  detail: false,
  save: false,
  delete: false,
};

export function useFriendCharacterAdmin() {
  const [friendTypes, setFriendTypes] = useState<FriendCharacterListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FriendCharacterDetail | null>(null);
  const [form, setForm] = useState<FriendCharacterInput>(emptyForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState<FriendCharacterLoadingState>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const isBusy = Object.values(loading).some(Boolean);
  const isCreating = showCreateForm;

  const loadList = useCallback(async () => {
    const list = await fetchFriendCharacters();
    setFriendTypes(list);
    return list;
  }, []);

  const loadDetail = useCallback(async (friendId: string) => {
    const data = await fetchFriendCharacterDetail(friendId);
    if (selectedIdRef.current !== friendId) {
      return data;
    }
    setDetail(data);
    setForm({
      id: data.id,
      label: data.label,
      age: data.age,
      nationality: data.nationality,
      gender: data.gender,
      subtitle: data.subtitle,
      description: data.description,
      persona: data.persona,
      enabled: data.enabled,
    });
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading((prev) => ({ ...prev, list: true }));
    try {
      const list = await loadList();
      if (selectedId) {
        setLoading((prev) => ({ ...prev, detail: true }));
        await loadDetail(selectedId);
      } else if (list.length > 0 && !showCreateForm) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, list: false, detail: false }));
    }
  }, [loadDetail, loadList, selectedId, showCreateForm]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedId || showCreateForm) {
      return;
    }
    setLoading((prev) => ({ ...prev, detail: true }));
    loadDetail(selectedId)
      .catch((e) => {
        setError(e instanceof Error ? e.message : '詳細の読み込みに失敗しました。');
      })
      .finally(() => {
        setLoading((prev) => ({ ...prev, detail: false }));
      });
  }, [loadDetail, selectedId, showCreateForm]);

  const selectFriend = useCallback((friendId: string) => {
    setShowCreateForm(false);
    setSelectedId(friendId);
  }, []);

  const startCreate = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setForm({ ...emptyForm, id: '' });
    setShowCreateForm(true);
  }, []);

  const cancelCreate = useCallback(() => {
    setShowCreateForm(false);
    if (friendTypes.length > 0) {
      setSelectedId(friendTypes[0].id);
    }
  }, [friendTypes]);

  const updateFormField = useCallback(
    <K extends keyof FriendCharacterInput>(key: K, value: FriendCharacterInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const save = useCallback(async () => {
    setError(null);
    setLoading((prev) => ({ ...prev, save: true }));
    try {
      if (isCreating) {
        const created = await createFriendCharacter({
          id: form.id?.trim() || undefined,
          label: form.label,
          age: form.age,
          nationality: form.nationality,
          gender: form.gender,
          subtitle: form.subtitle,
          description: form.description,
          persona: form.persona,
          enabled: form.enabled,
        });
        setShowCreateForm(false);
        setSelectedId(created.id);
        await loadList();
        await loadDetail(created.id);
      } else if (selectedId) {
        const updated = await updateFriendCharacter(selectedId, {
          label: form.label,
          age: form.age,
          nationality: form.nationality,
          gender: form.gender,
          subtitle: form.subtitle,
          description: form.description,
          persona: form.persona,
          enabled: form.enabled,
        });
        await loadList();
        setDetail(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, save: false }));
    }
  }, [form, isCreating, loadDetail, loadList, selectedId]);

  const remove = useCallback(async () => {
    if (!selectedId || !detail) {
      return;
    }
    setError(null);
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      await deleteFriendCharacter(selectedId);
      setSelectedId(null);
      setDetail(null);
      setShowCreateForm(false);
      const list = await loadList();
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  }, [detail, loadList, selectedId]);

  const referenceImageUrl =
    detail?.referenceUrl != null ? getImageUrl(detail.referenceUrl) : null;

  return {
    friendTypes,
    selectedId,
    detail,
    form,
    showCreateForm,
    loading,
    error,
    isBusy,
    isCreating,
    referenceImageUrl,
    selectFriend,
    startCreate,
    cancelCreate,
    updateFormField,
    save,
    remove,
    refresh,
    clearError: () => setError(null),
  };
}
