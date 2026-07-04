import { useCallback, useState } from 'react';
import { loginUser } from '../lib/userApiClient';
import type { User } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(userId);
      setUser(result.user);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'ログインに失敗しました。';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  return {
    user,
    isLoggedIn: user !== null,
    loading,
    error,
    login,
    logout,
    clearError: () => setError(null),
  };
}
