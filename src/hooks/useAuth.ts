import { useCallback, useState } from 'react';
import { fetchUserProfile, loginUser } from '../lib/userApiClient';
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
      // #region agent log
      fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe457c'},body:JSON.stringify({sessionId:'fe457c',location:'useAuth.ts:login:catch',message:'login error surfaced to UI',data:{message,errorName:e instanceof Error?e.name:'unknown'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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

  const updateAiTokenBalance = useCallback((aiTokenBalance: number, tokensConsumed?: number) => {
    setUser((current) => {
      if (!current) return current;
      return {
        ...current,
        aiTokenBalance,
        ...(typeof tokensConsumed === 'number'
          ? { aiTokensUsed: current.aiTokensUsed + tokensConsumed }
          : {}),
      };
    });
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const currentUserId = user?.userId;
    if (!currentUserId) return;
    const profile = await fetchUserProfile(currentUserId);
    setUser(profile);
  }, [user?.userId]);

  return {
    user,
    isLoggedIn: user !== null,
    loading,
    error,
    login,
    logout,
    updateAiTokenBalance,
    refreshUserProfile,
    clearError: () => setError(null),
  };
}
