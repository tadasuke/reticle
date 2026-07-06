import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_AI_MODEL } from '../data/aiModels';
import { DEFAULT_BUDDY_SUPPORT_TYPE } from '../data/buddySupportTypes';
import { getScenarioById } from '../data/scenarios';
import {
  fetchBuddyTypes,
  fetchFriendTypes,
  generateFriendOpening,
  sendAiBuddyTranslation,
  sendBuddySupport,
  sendCoachFeedback,
  sendMessage,
} from '../lib/apiClient';
import { totalTokensFromUsage } from '../lib/usageTotals';
import { getLastAiFriendMessage, isBuddyTranslationRequest } from '../lib/buddyTranslationRequest';
import { calculateTypingDelay } from '../lib/typingDelay';
import {
  createAiConversation,
  fetchAiConversation,
  patchAiConversation,
  saveAiConversationMessages,
} from '../lib/userApiClient';
import type {
  ApiUsage,
  BuddySupportType,
  BuddyType,
  BuddyTypeId,
  ConversationResponse,
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

type UseConversationOptions = {
  userId: string | null;
  onMessagesPersisted?: () => void;
  onAiTokenBalanceUpdated?: (aiTokenBalance: number, tokensConsumed?: number) => void;
};

function includesMiddleFeedback(supportType: BuddySupportType): boolean {
  return supportType === 'middle' || supportType === 'high';
}

export function useConversation(options: UseConversationOptions) {
  const { userId, onMessagesPersisted, onAiTokenBalanceUpdated } = options;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>(null);
  const [friendTypeId, setFriendTypeId] = useState<FriendTypeId>('');
  const [selectedFriendType, setSelectedFriendType] = useState<FriendType | undefined>(undefined);
  const [buddyTypeId, setBuddyTypeId] = useState<BuddyTypeId>('');
  const [selectedBuddyType, setSelectedBuddyType] = useState<BuddyType | undefined>(undefined);
  const [buddyTypes, setBuddyTypes] = useState<BuddyType[]>([]);
  const [supportType, setSupportTypeState] = useState<BuddySupportType>(DEFAULT_BUDDY_SUPPORT_TYPE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadLabel, setThreadLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState({ friend: false, buddy: false });
  const [resuming, setResuming] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportTypeRef = useRef(supportType);
  const buddyTypeIdRef = useRef<BuddyTypeId>('');
  const messagesRef = useRef<Message[]>([]);
  const conversationIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(userId);
  const lastHighSupportFriendIdRef = useRef<string | null>(null);
  const onMessagesPersistedRef = useRef(onMessagesPersisted);
  const onAiTokenBalanceUpdatedRef = useRef(onAiTokenBalanceUpdated);

  useEffect(() => {
    onMessagesPersistedRef.current = onMessagesPersisted;
  }, [onMessagesPersisted]);

  useEffect(() => {
    onAiTokenBalanceUpdatedRef.current = onAiTokenBalanceUpdated;
  }, [onAiTokenBalanceUpdated]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    supportTypeRef.current = supportType;
  }, [supportType]);

  useEffect(() => {
    buddyTypeIdRef.current = buddyTypeId;
  }, [buddyTypeId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const persistMessages = useCallback(async (nextMessages: Message[], targetConversationId?: string) => {
    const activeUserId = userIdRef.current;
    const activeConversationId = targetConversationId ?? conversationIdRef.current;
    if (!activeUserId || !activeConversationId) return;

    await saveAiConversationMessages(activeUserId, activeConversationId, nextMessages);
    onMessagesPersistedRef.current?.();
  }, []);

  const applyAiTokenBalanceUpdate = useCallback((response: ConversationResponse) => {
    if (typeof response.aiTokenBalance === 'number') {
      const tokensConsumed = response.usage ? totalTokensFromUsage(response.usage) : undefined;
      onAiTokenBalanceUpdatedRef.current?.(response.aiTokenBalance, tokensConsumed);
    }
  }, []);

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
          userIdRef.current ?? undefined,
          conversationIdRef.current ?? undefined,
        );
        applyAiTokenBalanceUpdate(support);
        const updated = [
          ...messagesRef.current,
          createMessage('buddy', 'buddy', support.text, support.usage),
        ];
        messagesRef.current = updated;
        setMessages(updated);
        await persistMessages(updated);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'バディのサポート取得に失敗しました。',
        );
      } finally {
        setLoading((prev) => ({ ...prev, buddy: false }));
      }
    },
    [scenarioId, friendTypeId, buddyTypeId, persistMessages, applyAiTokenBalanceUpdate],
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
        void persistMessages(nextMessages);

        if (supportTypeRef.current === 'high') {
          void triggerHighSupport(nextMessages, friendMessage.id);
        }
      }, calculateTypingDelay(reply));
    },
    [clearFriendTypingTimeout, triggerHighSupport, persistMessages],
  );

  useEffect(() => () => clearFriendTypingTimeout(), [clearFriendTypingTimeout]);

  const scenario = scenarioId ? getScenarioById(scenarioId) : undefined;
  const friendType = selectedFriendType;
  const buddyType = selectedBuddyType;
  const isStartingScenario = loading.friend && !scenarioId && !resuming;

  const startScenario = useCallback(async (startOptions: StartScenarioOptions): Promise<boolean> => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) {
      setError('ログインが必要です。');
      return false;
    }

    const selected = getScenarioById(startOptions.scenarioId);
    if (!selected) return false;

    const initialSupportType = startOptions.supportType ?? DEFAULT_BUDDY_SUPPORT_TYPE;

    setMessages([]);
    setSupportTypeState(initialSupportType);
    supportTypeRef.current = initialSupportType;
    lastHighSupportFriendIdRef.current = null;
    messagesRef.current = [];
    setThreadLabel(null);
    setError(null);
    setLoading({ friend: true, buddy: false });

    try {
      const [created, fetchedBuddyTypes] = await Promise.all([
        createAiConversation(activeUserId, {
          scenarioId: startOptions.scenarioId,
          friendTypeId: startOptions.friendTypeId,
          buddyTypeId: startOptions.buddyTypeId,
          supportType: initialSupportType,
        }),
        fetchBuddyTypes(),
      ]);

      setBuddyTypes(fetchedBuddyTypes);
      setConversationId(created.conversationId);
      conversationIdRef.current = created.conversationId;
      setThreadLabel(created.threadLabel);
      setScenarioId(startOptions.scenarioId);
      setFriendTypeId(startOptions.friendTypeId);
      setSelectedFriendType(startOptions.friendType);
      setBuddyTypeId(startOptions.buddyTypeId);
      buddyTypeIdRef.current = startOptions.buddyTypeId;
      setSelectedBuddyType(startOptions.buddyType);

      const opening = await generateFriendOpening(
        startOptions.scenarioId,
        startOptions.friendTypeId,
        startOptions.buddyTypeId,
        DEFAULT_AI_MODEL,
        activeUserId,
        created.conversationId,
      );
      applyAiTokenBalanceUpdate(opening);
      revealFriendReply(opening.text, opening.usage);
      return true;
    } catch (e) {
      setConversationId(null);
      conversationIdRef.current = null;
      setThreadLabel(null);
      setScenarioId(null);
      setFriendTypeId('');
      setSelectedFriendType(undefined);
      setBuddyTypeId('');
      buddyTypeIdRef.current = '';
      setSelectedBuddyType(undefined);
      setMessages([]);
      messagesRef.current = [];
      setError(e instanceof Error ? e.message : '会話の開始に失敗しました。');
      return false;
    } finally {
      setLoading({ friend: false, buddy: false });
    }
  }, [revealFriendReply, applyAiTokenBalanceUpdate]);

  const resumeConversation = useCallback(async (targetConversationId: string): Promise<boolean> => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) {
      setError('ログインが必要です。');
      return false;
    }

    setResuming(true);
    setError(null);
    setLoading({ friend: true, buddy: false });

    try {
      const [detail, friendTypes, buddyTypes] = await Promise.all([
        fetchAiConversation(activeUserId, targetConversationId),
        fetchFriendTypes(),
        fetchBuddyTypes(),
      ]);

      const friendTypeMatch = friendTypes.find((type) => type.id === detail.friendTypeId);
      const buddyTypeMatch = buddyTypes.find((type) => type.id === detail.buddyTypeId);
      if (!friendTypeMatch || !buddyTypeMatch) {
        throw new Error('会話に紐づくキャラクターが見つかりません。');
      }
      if (!getScenarioById(detail.scenarioId)) {
        throw new Error('この会話のシナリオは現在サポートされていません。');
      }

      setConversationId(detail.conversationId);
      conversationIdRef.current = detail.conversationId;
      setThreadLabel(detail.threadLabel);
      setScenarioId(detail.scenarioId);
      setFriendTypeId(detail.friendTypeId);
      setSelectedFriendType(friendTypeMatch);
      setBuddyTypeId(detail.buddyTypeId);
      buddyTypeIdRef.current = detail.buddyTypeId;
      setSelectedBuddyType(buddyTypeMatch);
      setBuddyTypes(buddyTypes);
      setSupportTypeState(detail.supportType);
      supportTypeRef.current = detail.supportType;
      setMessages(detail.messages);
      messagesRef.current = detail.messages;
      lastHighSupportFriendIdRef.current = null;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '会話の再開に失敗しました。');
      return false;
    } finally {
      setResuming(false);
      setLoading({ friend: false, buddy: false });
    }
  }, []);

  const sendToFriend = useCallback(
    async (content: string) => {
      if (!scenario || !scenarioId || !content.trim() || loading.friend || friendTyping) return;

      const userMessage = createMessage('user', 'friend', content.trim());
      const nextMessages = [...messages, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(null);
      void persistMessages(nextMessages);

      const withMiddleFeedback = includesMiddleFeedback(supportType);
      setLoading((prev) => ({ ...prev, friend: true, buddy: withMiddleFeedback }));

      try {
        const activeUserId = userIdRef.current ?? undefined;
        const activeConversationId = conversationIdRef.current ?? undefined;
        if (withMiddleFeedback) {
          const [friendResult, feedbackResult] = await Promise.allSettled([
            sendMessage(
              'friend',
              scenarioId,
              nextMessages,
              friendTypeId,
              buddyTypeId,
              DEFAULT_AI_MODEL,
              activeUserId,
              activeConversationId,
            ),
            sendCoachFeedback(
              scenarioId,
              nextMessages,
              friendTypeId,
              buddyTypeId,
              DEFAULT_AI_MODEL,
              activeUserId,
              activeConversationId,
            ),
          ]);

          if (feedbackResult.status === 'fulfilled') {
            applyAiTokenBalanceUpdate(feedbackResult.value);
            const withFeedback = [
              ...messagesRef.current,
              createMessage('buddy', 'buddy', feedbackResult.value.text, feedbackResult.value.usage),
            ];
            messagesRef.current = withFeedback;
            setMessages(withFeedback);
            await persistMessages(withFeedback);
          }

          if (friendResult.status === 'fulfilled') {
            applyAiTokenBalanceUpdate(friendResult.value);
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
            activeUserId,
            activeConversationId,
          );
          applyAiTokenBalanceUpdate(friendResult);
          await persistMessages(nextMessages);
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
    [
      scenario,
      scenarioId,
      messages,
      loading.friend,
      friendTyping,
      friendTypeId,
      buddyTypeId,
      supportType,
      revealFriendReply,
      persistMessages,
      applyAiTokenBalanceUpdate,
    ],
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
      void persistMessages(nextMessages);
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        const activeUserId = userIdRef.current ?? undefined;
        const activeConversationId = conversationIdRef.current ?? undefined;
        if (isTranslationRequest) {
          if (!lastAiFriendMessage) {
            const updated = [
              ...nextMessages,
              createMessage(
                'buddy',
                'buddy',
                'まだ AI フレンドのメッセージがないので、翻訳できないよ。',
              ),
            ];
            messagesRef.current = updated;
            setMessages(updated);
            await persistMessages(updated);
            return;
          }

          const reply = await sendAiBuddyTranslation(
            scenarioId,
            friendTypeId,
            buddyTypeId,
            lastAiFriendMessage.content,
            DEFAULT_AI_MODEL,
            activeUserId,
            activeConversationId,
          );
          applyAiTokenBalanceUpdate(reply);
          const updated = [
            ...nextMessages,
            createMessage('buddy', 'buddy', reply.text, reply.usage),
          ];
          messagesRef.current = updated;
          setMessages(updated);
          await persistMessages(updated);
          return;
        }

        const reply = await sendMessage(
          'buddy',
          scenarioId,
          nextMessages,
          friendTypeId,
          buddyTypeId,
          DEFAULT_AI_MODEL,
          activeUserId,
          activeConversationId,
        );
        applyAiTokenBalanceUpdate(reply);
        const updated = [
          ...nextMessages,
          createMessage('buddy', 'buddy', reply.text, reply.usage),
        ];
        messagesRef.current = updated;
        setMessages(updated);
        await persistMessages(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'バディへの送信に失敗しました。');
      } finally {
        setLoading((prev) => ({ ...prev, buddy: false }));
      }
    },
    [scenario, scenarioId, messages, loading.buddy, friendTypeId, buddyTypeId, persistMessages, applyAiTokenBalanceUpdate],
  );

  const resetScenario = useCallback(() => {
    clearFriendTypingTimeout();
    setConversationId(null);
    conversationIdRef.current = null;
    setThreadLabel(null);
    setScenarioId(null);
    setFriendTypeId('');
    setSelectedFriendType(undefined);
    setBuddyTypeId('');
    buddyTypeIdRef.current = '';
    setSelectedBuddyType(undefined);
    setBuddyTypes([]);
    setMessages([]);
    messagesRef.current = [];
    lastHighSupportFriendIdRef.current = null;
    setSupportTypeState(DEFAULT_BUDDY_SUPPORT_TYPE);
    supportTypeRef.current = DEFAULT_BUDDY_SUPPORT_TYPE;
    setError(null);
    setLoading({ friend: false, buddy: false });
    setFriendTyping(false);
  }, [clearFriendTypingTimeout]);

  const setSupportType = useCallback(
    (nextSupportType: BuddySupportType) => {
      setSupportTypeState(nextSupportType);
      supportTypeRef.current = nextSupportType;

      const activeUserId = userIdRef.current;
      const activeConversationId = conversationIdRef.current;
      if (!activeUserId || !activeConversationId) return;

      void patchAiConversation(activeUserId, activeConversationId, {
        supportType: nextSupportType,
      }).catch((e) => {
        setError(e instanceof Error ? e.message : 'サポートタイプの更新に失敗しました。');
      });
    },
    [],
  );

  const setBuddyType = useCallback(
    (nextBuddyTypeId: BuddyTypeId) => {
      if (!nextBuddyTypeId || nextBuddyTypeId === buddyTypeIdRef.current) return;

      const nextBuddyType = buddyTypes.find((type) => type.id === nextBuddyTypeId);
      if (!nextBuddyType) return;

      setBuddyTypeId(nextBuddyTypeId);
      buddyTypeIdRef.current = nextBuddyTypeId;
      setSelectedBuddyType(nextBuddyType);

      const activeUserId = userIdRef.current;
      const activeConversationId = conversationIdRef.current;
      if (!activeUserId || !activeConversationId) return;

      void patchAiConversation(activeUserId, activeConversationId, {
        buddyTypeId: nextBuddyTypeId,
      }).catch((e) => {
        setError(e instanceof Error ? e.message : 'バディの更新に失敗しました。');
      });
    },
    [buddyTypes],
  );

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
      void persistMessages(updated);
    },
    [messages, loading.friend, friendTyping, clearFriendTypingTimeout, persistMessages],
  );

  return {
    scenario,
    friendType,
    buddyType,
    threadLabel,
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
    clearError: () => setError(null),
  };
}
