import { ConversationLayout } from './components/conversation/ConversationLayout';
import { ScenarioSelect } from './components/scenario/ScenarioSelect';
import { useConversation } from './hooks/useConversation';

export default function App() {
  const {
    scenario,
    friendType,
    buddyType,
    supportType,
    setSupportType,
    messages,
    loading,
    friendTyping,
    isStartingScenario,
    error,
    startScenario,
    sendToFriend,
    sendToBuddy,
    resetScenario,
    rewindFriendTo,
    clearError,
  } = useConversation();

  if (!scenario) {
    return (
      <ScenarioSelect
        onSelect={startScenario}
        isLoading={isStartingScenario}
        error={error}
        onDismissError={clearError}
      />
    );
  }

  return (
    <ConversationLayout
      scenario={scenario}
      friendType={friendType}
      buddyType={buddyType}
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
