import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_AI_MODEL } from '../data/aiModels';
import { DEFAULT_BUDDY_SUPPORT_TYPE } from '../data/buddySupportTypes';
import { getScenarioById } from '../data/scenarios';
import { generateFriendOpening, sendAiBuddyTranslation, sendBuddySupport, sendCoachFeedback, sendMessage } from '../lib/apiClient';
import { getLastAiFriendMessage, isBuddyTranslationRequest } from '../lib/buddyTranslationRequest';
import { calculateTypingDelay } from '../lib/typingDelay';
import type {
  ApiUsage,
  BuddySupportType,
  BuddyType,
  BuddyTypeId,
  FriendType,
  FriendTypeId,
  Message,
  MessageChannel,
  ScenarioId,
} from '../types/conversation';

function createMessage(
  speaker: Message['speaker'],
  channel: MessageChannel,
  content: string,
  usage?: ApiUsage,
): Message {
  return {
    id: crypto.randomUUID(),
    speaker,
    channel,
    content,
    timestamp: Date.now(),
    ...(usage ? { usage } : {}),
  };
}

export type StartScenarioOptions = {
  scenarioId: ScenarioId;
  friendType: FriendType;
  friendTypeId: FriendTypeId;
  buddyType: BuddyType;
  buddyTypeId: BuddyTypeId;
  supportType?: BuddySupportType;
};

function includesMiddleFeedback(supportType: BuddySupportType): boolean {
  return supportType === 'middle' || supportType === 'high';
}

export function useConversation() {
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>(null);
  const [friendTypeId, setFriendTypeId] = useState<FriendTypeId>('');
  const [selectedFriendType, setSelectedFriendType] = useState<FriendType | undefined>(undefined);
  const [buddyTypeId, setBuddyTypeId] = useState<BuddyTypeId>('');
  const [selectedBuddyType, setSelectedBuddyType] = useState<BuddyType | undefined>(undefined);
  const [supportType, setSupportType] = useState<BuddySupportType>(DEFAULT_BUDDY_SUPPORT_TYPE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState({ friend: false, buddy: false });
  const [friendTyping, setFriendTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportTypeRef = useRef(supportType);
  const messagesRef = useRef<Message[]>([]);
  const lastHighSupportFriendIdRef = useRef<string | null>(null);

  useEffect(() => {
    supportTypeRef.current = supportType;
  }, [supportType]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearFriendTypingTimeout = useCallback(() => {
    if (friendTypingTimeoutRef.current) {
      clearTimeout(friendTypingTimeoutRef.current);
      friendTypingTimeoutRef.current = null;
    }
  }, []);

  const triggerHighSupport = useCallback(
    async (messagesWithFriend: Message[], friendMessageId: string) => {
      if (!scenarioId || supportTypeRef.current !== 'high') return;
      if (lastHighSupportFriendIdRef.current === friendMessageId) return;

      lastHighSupportFriendIdRef.current = friendMessageId;
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        const support = await sendBuddySupport(
          scenarioId,
          messagesWithFriend,
          friendTypeId,
          buddyTypeId,
          DEFAULT_AI_MODEL,
        );
        setMessages((prev) => [
          ...prev,
          createMessage('buddy', 'buddy', support.text, support.usage),
        ]);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'バディのサポート取得に失敗しました。',
        );
      } finally {
        setLoading((prev) => ({ ...prev, buddy: false }));
      }
    },
    [scenarioId, friendTypeId, buddyTypeId],
  );

  const revealFriendReply = useCallback(
    (reply: string, usage?: ApiUsage) => {
      clearFriendTypingTimeout();
      setFriendTyping(true);

      friendTypingTimeoutRef.current = setTimeout(() => {
        const friendMessage = createMessage('friend', 'friend', reply, usage);
        const nextMessages = [...messagesRef.current, friendMessage];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        setFriendTyping(false);
        friendTypingTimeoutRef.current = null;

        if (supportTypeRef.current === 'high') {
          void triggerHighSupport(nextMessages, friendMessage.id);
        }
      }, calculateTypingDelay(reply));
    },
    [clearFriendTypingTimeout, triggerHighSupport],
  );

  useEffect(() => () => clearFriendTypingTimeout(), [clearFriendTypingTimeout]);

  const scenario = scenarioId ? getScenarioById(scenarioId) : undefined;
  const friendType = selectedFriendType;
  const buddyType = selectedBuddyType;
  const isStartingScenario = loading.friend && !scenarioId;

  const startScenario = useCallback(async (options: StartScenarioOptions) => {
    const selected = getScenarioById(options.scenarioId);
    if (!selected) return;

    const initialSupportType = options.supportType ?? DEFAULT_BUDDY_SUPPORT_TYPE;

    setMessages([]);
    setSupportType(initialSupportType);
    supportTypeRef.current = initialSupportType;
    lastHighSupportFriendIdRef.current = null;
    messagesRef.current = [];
    setError(null);
    setLoading({ friend: true, buddy: false });

    try {
      const opening = await generateFriendOpening(
        options.scenarioId,
        options.friendTypeId,
        options.buddyTypeId,
        DEFAULT_AI_MODEL,
      );
      setScenarioId(options.scenarioId);
      setFriendTypeId(options.friendTypeId);
      setSelectedFriendType(options.friendType);
      setBuddyTypeId(options.buddyTypeId);
      setSelectedBuddyType(options.buddyType);
      revealFriendReply(opening.text, opening.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : '会話の開始に失敗しました。');
    } finally {
      setLoading({ friend: false, buddy: false });
    }
  }, [revealFriendReply]);

  const sendToFriend = useCallback(
    async (content: string) => {
      if (!scenario || !scenarioId || !content.trim() || loading.friend || friendTyping) return;

      const userMessage = createMessage('user', 'friend', content.trim());
      const nextMessages = [...messages, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(null);

      const withMiddleFeedback = includesMiddleFeedback(supportType);
      setLoading((prev) => ({ ...prev, friend: true, buddy: withMiddleFeedback }));

      try {
        if (withMiddleFeedback) {
          const [friendResult, feedbackResult] = await Promise.allSettled([
            sendMessage('friend', scenarioId, nextMessages, friendTypeId, buddyTypeId, DEFAULT_AI_MODEL),
            sendCoachFeedback(scenarioId, nextMessages, friendTypeId, buddyTypeId, DEFAULT_AI_MODEL),
          ]);

          if (feedbackResult.status === 'fulfilled') {
            setMessages((prev) => {
              const updated = [
                ...prev,
                createMessage('buddy', 'buddy', feedbackResult.value.text, feedbackResult.value.usage),
              ];
              messagesRef.current = updated;
              return updated;
            });
          }

          if (friendResult.status === 'fulfilled') {
            revealFriendReply(friendResult.value.text, friendResult.value.usage);
          }

          const errors: string[] = [];
          if (friendResult.status === 'rejected') {
            errors.push(
              friendResult.reason instanceof Error
                ? friendResult.reason.message
                : 'フレンドへの送信に失敗しました。',
            );
          }
          if (feedbackResult.status === 'rejected') {
            errors.push(
              feedbackResult.reason instanceof Error
                ? feedbackResult.reason.message
                : 'バディのフィードバック取得に失敗しました。',
            );
          }
          if (errors.length > 0) {
            setError(errors.join(' '));
          }
        } else {
          const friendResult = await sendMessage(
            'friend',
            scenarioId,
            nextMessages,
            friendTypeId,
            buddyTypeId,
            DEFAULT_AI_MODEL,
          );
          revealFriendReply(friendResult.text, friendResult.usage);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'フレンドへの送信に失敗しました。');
      } finally {
        setLoading((prev) => ({
          ...prev,
          friend: false,
          buddy: withMiddleFeedback ? false : prev.buddy,
        }));
      }
    },
    [scenario, scenarioId, messages, loading.friend, friendTyping, friendTypeId, buddyTypeId, supportType, revealFriendReply],
  );

  const sendToBuddy = useCallback(
    async (content: string) => {
      if (!scenario || !scenarioId || !content.trim() || loading.buddy) return;

      const isTranslationRequest = isBuddyTranslationRequest(content);
      const lastAiFriendMessage = isTranslationRequest ? getLastAiFriendMessage(messages) : null;

      const userMessage = createMessage('user', 'buddy', content.trim());
      const nextMessages = [...messages, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(null);
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        if (isTranslationRequest) {
          if (!lastAiFriendMessage) {
            setMessages((prev) => {
              const updated = [
                ...prev,
                createMessage(
                  'buddy',
                  'buddy',
                  'まだ AI フレンドのメッセージがないので、翻訳できないよ。',
                ),
              ];
              messagesRef.current = updated;
              return updated;
            });
            return;
          }

          const reply = await sendAiBuddyTranslation(
            scenarioId,
            friendTypeId,
            buddyTypeId,
            lastAiFriendMessage.content,
            DEFAULT_AI_MODEL,
          );
          setMessages((prev) => {
            const updated = [
              ...prev,
              createMessage('buddy', 'buddy', reply.text, reply.usage),
            ];
            messagesRef.current = updated;
            return updated;
          });
          return;
        }

        const reply = await sendMessage(
          'buddy',
          scenarioId,
          nextMessages,
          friendTypeId,
          buddyTypeId,
          DEFAULT_AI_MODEL,
        );
        setMessages((prev) => {
          const updated = [
            ...prev,
            createMessage('buddy', 'buddy', reply.text, reply.usage),
          ];
          messagesRef.current = updated;
          return updated;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'バディへの送信に失敗しました。');
      } finally {
        setLoading((prev) => ({ ...prev, buddy: false }));
      }
    },
    [scenario, scenarioId, messages, loading.buddy, friendTypeId, buddyTypeId],
  );

  const resetScenario = useCallback(() => {
    clearFriendTypingTimeout();
    setScenarioId(null);
    setMessages([]);
    messagesRef.current = [];
    lastHighSupportFriendIdRef.current = null;
    setSupportType(DEFAULT_BUDDY_SUPPORT_TYPE);
    setError(null);
    setLoading({ friend: false, buddy: false });
    setFriendTyping(false);
  }, [clearFriendTypingTimeout]);

  const rewindFriendTo = useCallback(
    (messageId: string) => {
      if (loading.friend || friendTyping) return;

      const friendMessages = messages.filter((m) => m.channel === 'friend');
      const targetIndex = friendMessages.findIndex((m) => m.id === messageId);
      if (targetIndex === -1 || targetIndex >= friendMessages.length - 1) return;

      const target = friendMessages[targetIndex];
      if (target.speaker !== 'friend') return;

      const keepIds = new Set(friendMessages.slice(0, targetIndex + 1).map((m) => m.id));
      clearFriendTypingTimeout();
      setFriendTyping(false);
      setError(null);
      const updated = messages.filter((m) => m.channel !== 'friend' || keepIds.has(m.id));
      messagesRef.current = updated;
      lastHighSupportFriendIdRef.current = null;
      setMessages(updated);
    },
    [messages, loading.friend, friendTyping, clearFriendTypingTimeout],
  );

  return {
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
    clearError: () => setError(null),
  };
}
