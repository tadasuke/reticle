import { useCallback, useEffect, useState } from 'react';
import {
  deleteRealFriendPhoto,
  fetchRealFriendPhotos,
  setRealFriendDefaultPhoto,
  uploadRealFriendPhoto,
} from '../lib/realApiClient';
import type { RealFriendPhoto } from '../types/realFriend';

type UseRealFriendPhotosOptions = {
  friendId: string | null;
  enabled: boolean;
  onChanged?: () => void;
};

export function useRealFriendPhotos({ friendId, enabled, onChanged }: UseRealFriendPhotosOptions) {
  const [photos, setPhotos] = useState<RealFriendPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!friendId) {
      setPhotos([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await fetchRealFriendPhotos(friendId);
      setPhotos(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像一覧の取得に失敗しました。');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    if (!enabled || !friendId) {
      setPhotos([]);
      setError(null);
      return;
    }
    void loadPhotos();
  }, [enabled, friendId, loadPhotos]);

  const uploadPhoto = useCallback(
    async (file: File) => {
      if (!friendId) return null;

      setLoading(true);
      setError(null);
      try {
        const items = await uploadRealFriendPhoto(friendId, file);
        setPhotos(items);
        onChanged?.();
        return items;
      } catch (e) {
        setError(e instanceof Error ? e.message : '画像のアップロードに失敗しました。');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [friendId, onChanged],
  );

  const setDefaultPhoto = useCallback(
    async (photoId: string) => {
      if (!friendId) return null;

      setLoading(true);
      setError(null);
      try {
        const items = await setRealFriendDefaultPhoto(friendId, photoId);
        setPhotos(items);
        onChanged?.();
        return items;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'デフォルト画像の設定に失敗しました。');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [friendId, onChanged],
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      if (!friendId) return null;

      setLoading(true);
      setError(null);
      try {
        const items = await deleteRealFriendPhoto(friendId, photoId);
        setPhotos(items);
        onChanged?.();
        return items;
      } catch (e) {
        setError(e instanceof Error ? e.message : '画像の削除に失敗しました。');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [friendId, onChanged],
  );

  return {
    photos,
    loading,
    error,
    loadPhotos,
    uploadPhoto,
    setDefaultPhoto,
    deletePhoto,
    clearError: () => setError(null),
  };
}
