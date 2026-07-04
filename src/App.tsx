import { useCallback } from 'react';
import { AiConversationHome } from './components/conversation/AiConversationHome';
import { ConversationLayout } from './components/conversation/ConversationLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { useAiConversations } from './hooks/useAiConversations';
import { useAuth } from './hooks/useAuth';
import { useConversation } from './hooks/useConversation';

export default function App() {
  const { user, isLoggedIn, loading: authLoading, error: authError, login, logout, clearError: clearAuthError } =
    useAuth();
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    refreshConversations,
    clearError: clearConversationsError,
  } = useAiConversations(user?.userId ?? null);

  const handleMessagesPersisted = useCallback(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const {
    scenario,
    friendType,
    buddyType,
    buddyTypes,
    supportType,
    setSupportType,
    setBuddyType,
    messages,
    loading,
    friendTyping,
    isStartingScenario,
    resuming,
    error,
    startScenario,
    resumeConversation,
    sendToFriend,
    sendToBuddy,
    resetScenario,
    rewindFriendTo,
    clearError,
  } = useConversation({
    userId: user?.userId ?? null,
    onMessagesPersisted: handleMessagesPersisted,
  });

  const handleLogin = useCallback(
    async (userId: string) => {
      await login(userId);
    },
    [login],
  );

  const handleLogout = useCallback(() => {
    resetScenario();
    logout();
  }, [logout, resetScenario]);

  if (!isLoggedIn || !user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={authLoading}
        error={authError}
        onDismissError={clearAuthError}
      />
    );
  }

  if (!scenario) {
    return (
      <AiConversationHome
        userId={user.userId}
        conversations={conversations}
        loadingConversations={conversationsLoading || resuming}
        conversationsError={conversationsError}
        onRefreshConversations={refreshConversations}
        onDismissConversationsError={clearConversationsError}
        onSelectConversation={(conversationId) => {
          void resumeConversation(conversationId);
        }}
        onStartScenario={(options) => {
          void startScenario(options);
        }}
        isStartingScenario={isStartingScenario}
        startError={error}
        onDismissStartError={clearError}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <ConversationLayout
      scenario={scenario}
      friendType={friendType}
      buddyType={buddyType}
      buddyTypes={buddyTypes}
      onBuddyTypeChange={setBuddyType}
      buddyTypeChangeDisabled={loading.friend || loading.buddy || friendTyping}
      supportType={supportType}
      onSupportTypeChange={setSupportType}
      messages={messages}
      loading={loading}
      friendTyping={friendTyping}
      error={error}
      onSendToFriend={sendToFriend}
      onSendToBuddy={sendToBuddy}
      onRewindFriendTo={rewindFriendTo}
      onBack={resetScenario}
      onDismissError={clearError}
    />
  );
}
