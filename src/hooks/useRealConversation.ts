import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_AI_MODEL } from '../data/aiModels';
import {
  fetchRealFriendMessages,
  saveRealFriendMessages,
  sendRealBuddySupport,
  sendRealCoachFeedback,
  sendRealConsult,
  sendRealTranslation,
} from '../lib/realApiClient';
import type { BuddyTypeId, ConversationResponse, Message, MessageChannel } from '../types/conversation';
import type { RealFriendListItem } from '../types/realFriend';

function createMessage(
  speaker: Message['speaker'],
  channel: MessageChannel,
  content: string,
  usage?: Message['usage'],
  translationJa?: string,
  recommendedReply?: Pick<Message, 'recommendedReplyEn' | 'recommendedReplyJa'>,
): Message {
  return {
    id: crypto.randomUUID(),
    speaker,
    channel,
    content,
    timestamp: Date.now(),
    ...(translationJa ? { translationJa } : {}),
    ...(recommendedReply?.recommendedReplyEn ? { recommendedReplyEn: recommendedReply.recommendedReplyEn } : {}),
    ...(recommendedReply?.recommendedReplyJa ? { recommendedReplyJa: recommendedReply.recommendedReplyJa } : {}),
    ...(usage ? { usage } : {}),
  };
}

function createBuddyReplyMessage(reply: ConversationResponse): Message {
  return createMessage('buddy', 'buddy', reply.text, reply.usage, undefined, {
    recommendedReplyEn: reply.recommendedReplyEn,
    recommendedReplyJa: reply.recommendedReplyJa,
  });
}

function getLastFriendMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].channel === 'friend') {
      return messages[i];
    }
  }
  return null;
}

function buildMessagesAfterDelete(messages: Message[]): Message[] {
  const lastFriend = getLastFriendMessage(messages);
  if (!lastFriend) return messages;
  return messages.filter((message) => message.id !== lastFriend.id);
}

type UseRealConversationOptions = {
  onMessagesPersisted?: () => void;
};

// #region agent log
function dbgConv(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '30c584' },
    body: JSON.stringify({ sessionId: '30c584', location, message, data, hypothesisId, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

export function useRealConversation(options: UseRealConversationOptions = {}) {
  const [realFriend, setRealFriend] = useState<RealFriendListItem | null>(null);
  const [buddyTypeId, setBuddyTypeId] = useState<BuddyTypeId>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState({ friend: false, buddy: false });
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const realFriendRef = useRef<RealFriendListItem | null>(null);
  const buddyTypeIdRef = useRef<BuddyTypeId>('');
  const lastSupportPartnerIdRef = useRef<string | null>(null);
  const lastFeedbackUserIdRef = useRef<string | null>(null);
  const backfillRunIdRef = useRef(0);
  const buddyBusyRef = useRef(false);
  const consultInFlightRef = useRef(false);
  const onMessagesPersistedRef = useRef(options.onMessagesPersisted);

  useEffect(() => {
    onMessagesPersistedRef.current = options.onMessagesPersisted;
  }, [options.onMessagesPersisted]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    realFriendRef.current = realFriend;
  }, [realFriend]);

  useEffect(() => {
    buddyTypeIdRef.current = buddyTypeId;
  }, [buddyTypeId]);

  const persistMessages = useCallback(async (
    nextMessages: Message[],
    friendId?: string,
    options?: { notifyList?: boolean },
  ) => {
    const friend = realFriendRef.current;
    const targetId = friendId ?? friend?.id;
    if (!targetId || friend?.id !== targetId) return;
    await saveRealFriendMessages(targetId, nextMessages);
    if (options?.notifyList !== false) {
      onMessagesPersistedRef.current?.();
    }
  }, []);

  const isActiveConversation = useCallback((friendId: string, runId: number) => {
    return backfillRunIdRef.current === runId && realFriendRef.current?.id === friendId;
  }, []);

  const setBuddyTypeIdSynced = useCallback((id: BuddyTypeId) => {
    buddyTypeIdRef.current = id;
    setBuddyTypeId(id);
  }, []);

  const updateTranslatingIds = useCallback((messageId: string, adding: boolean) => {
    setTranslatingIds((prev) => {
      const next = new Set(prev);
      if (adding) {
        next.add(messageId);
      } else {
        next.delete(messageId);
      }
      return next;
    });
  }, []);

  const attachTranslation = useCallback(
    async (
      messageId: string,
      englishText: string,
      friendId: string,
      runId: number,
      options?: { notifyList?: boolean },
    ) => {
      if (!isActiveConversation(friendId, runId)) return;

      updateTranslatingIds(messageId, true);
      try {
        const result = await sendRealTranslation(friendId, englishText, DEFAULT_AI_MODEL);
        const active = isActiveConversation(friendId, runId);
        if (!active) {
          // #region agent log
          dbgConv('useRealConversation:attachTranslation:blocked', 'stale translation blocked', {
            friendId, runId, currentRunId: backfillRunIdRef.current,
            currentRealFriendId: realFriendRef.current?.id ?? null,
          }, 'B');
          // #endregion
          return;
        }

        const updated = messagesRef.current.map((message) =>
          message.id === messageId ? { ...message, translationJa: result.text.trim() } : message,
        );
        messagesRef.current = updated;
        setMessages(updated);
        // #region agent log
        dbgConv('useRealConversation:attachTranslation:apply', 'setMessages from translation', {
          friendId, runId, messageCount: updated.length,
        }, 'B');
        // #endregion
        await persistMessages(updated, friendId, options);
      } catch (e) {
        if (!isActiveConversation(friendId, runId)) return;
        setError(e instanceof Error ? e.message : '日本語訳の取得に失敗しました。');
      } finally {
        updateTranslatingIds(messageId, false);
      }
    },
    [isActiveConversation, persistMessages, updateTranslatingIds],
  );

  const resumePendingConsult = useCallback(
    async (runId: number, friendId: string) => {
      if (consultInFlightRef.current || buddyBusyRef.current) return;
      if (!isActiveConversation(friendId, runId)) return;

      const buddyId = buddyTypeIdRef.current;
      if (!buddyId) return;

      buddyBusyRef.current = true;
      consultInFlightRef.current = true;
      setLoading((prev) => ({ ...prev, buddy: true }));
      setError(null);

      try {
        while (isActiveConversation(friendId, runId)) {
          const current = messagesRef.current;
          const last = current[current.length - 1];
          if (!last || last.channel !== 'buddy' || last.speaker !== 'user') break;

          const reply = await sendRealConsult(friendId, current, buddyId, DEFAULT_AI_MODEL);
          if (!isActiveConversation(friendId, runId)) return;

          const updated = [
            ...messagesRef.current,
            createBuddyReplyMessage(reply),
          ];
          messagesRef.current = updated;
          setMessages(updated);
          await persistMessages(updated, friendId);
        }
      } catch (e) {
        if (!isActiveConversation(friendId, runId)) return;
        setError(e instanceof Error ? e.message : 'バディへの送信に失敗しました。');
      } finally {
        if (isActiveConversation(friendId, runId)) {
          buddyBusyRef.current = false;
          consultInFlightRef.current = false;
          setLoading((prev) => ({ ...prev, buddy: false }));
        }
      }
    },
    [isActiveConversation, persistMessages],
  );

  const backfillMissingTranslations = useCallback(
    async (initialMessages: Message[], runId: number, friendId: string) => {
      const targets = initialMessages.filter(
        (message) => message.channel === 'friend' && !message.translationJa?.trim(),
      );

      for (const message of targets) {
        if (!isActiveConversation(friendId, runId)) return;
        await attachTranslation(message.id, message.content, friendId, runId, { notifyList: false });
      }
      if (isActiveConversation(friendId, runId) && targets.length > 0) {
        onMessagesPersistedRef.current?.();
      }
    },
    [attachTranslation, isActiveConversation],
  );

  const switchConversation = useCallback(
    async (friend: RealFriendListItem, nextBuddyTypeId: BuddyTypeId) => {
      backfillRunIdRef.current += 1;
      const runId = backfillRunIdRef.current;
      const friendId = friend.id;

      // #region agent log
      dbgConv('useRealConversation:switchConversation:start', 'switch start', {
        friendId,
        friendLabel: friend.label,
        runId,
        prevRealFriendId: realFriendRef.current?.id ?? null,
      }, 'D');
      // #endregion

      setRealFriend(friend);
      realFriendRef.current = friend;
      setBuddyTypeIdSynced(nextBuddyTypeId);
      setError(null);
      setLoading({ friend: true, buddy: false });
      setTranslatingIds(new Set());
      lastSupportPartnerIdRef.current = null;
      lastFeedbackUserIdRef.current = null;

      try {
        const savedMessages = await fetchRealFriendMessages(friendId);
        const active = isActiveConversation(friendId, runId);
        // #region agent log
        dbgConv('useRealConversation:switchConversation:fetchDone', 'fetch completed', {
          friendId,
          friendLabel: friend.label,
          runId,
          active,
          currentRunId: backfillRunIdRef.current,
          currentRealFriendId: realFriendRef.current?.id ?? null,
          messageCount: savedMessages.length,
          willApply: active,
        }, 'D');
        // #endregion
        if (!active) return;
        messagesRef.current = savedMessages;
        setMessages(savedMessages);
        void resumePendingConsult(runId, friendId);
        void backfillMissingTranslations(savedMessages, runId, friendId);
      } catch (e) {
        if (!isActiveConversation(friendId, runId)) return;
        setError(e instanceof Error ? e.message : '会話履歴の読み込みに失敗しました。');
        setMessages([]);
        messagesRef.current = [];
      } finally {
        if (isActiveConversation(friendId, runId)) {
          setLoading((prev) => ({ ...prev, friend: false }));
        }
      }
    },
    [backfillMissingTranslations, isActiveConversation, resumePendingConsult, setBuddyTypeIdSynced],
  );

  const triggerBuddySupport = useCallback(
    async (messagesWithPartner: Message[], partnerMessageId: string, friendId: string) => {
      const buddyId = buddyTypeIdRef.current;
      if (!buddyId || lastSupportPartnerIdRef.current === partnerMessageId) return;
      if (realFriendRef.current?.id !== friendId) return;

      lastSupportPartnerIdRef.current = partnerMessageId;
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        const support = await sendRealBuddySupport(friendId, messagesWithPartner, buddyId, DEFAULT_AI_MODEL);
        if (realFriendRef.current?.id !== friendId) return;

        const updated = [
          ...messagesRef.current,
          createBuddyReplyMessage(support),
        ];
        messagesRef.current = updated;
        setMessages(updated);
        await persistMessages(updated, friendId);
      } catch (e) {
        if (realFriendRef.current?.id !== friendId) return;
        setError(e instanceof Error ? e.message : 'バディのサポート取得に失敗しました。');
      } finally {
        if (realFriendRef.current?.id === friendId) {
          setLoading((prev) => ({ ...prev, buddy: false }));
        }
      }
    },
    [persistMessages],
  );

  const triggerBuddyFeedback = useCallback(
    async (messagesWithUser: Message[], userMessageId: string, friendId: string) => {
      const buddyId = buddyTypeIdRef.current;
      if (!buddyId || lastFeedbackUserIdRef.current === userMessageId) return;
      if (realFriendRef.current?.id !== friendId) return;

      lastFeedbackUserIdRef.current = userMessageId;
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        const feedback = await sendRealCoachFeedback(friendId, messagesWithUser, buddyId, DEFAULT_AI_MODEL);
        if (realFriendRef.current?.id !== friendId) return;

        const updated = [
          ...messagesRef.current,
          createMessage('buddy', 'buddy', feedback.text, feedback.usage),
        ];
        messagesRef.current = updated;
        setMessages(updated);
        await persistMessages(updated, friendId);
      } catch (e) {
        if (realFriendRef.current?.id !== friendId) return;
        setError(e instanceof Error ? e.message : 'バディのフィードバック取得に失敗しました。');
      } finally {
        if (realFriendRef.current?.id === friendId) {
          setLoading((prev) => ({ ...prev, buddy: false }));
        }
      }
    },
    [persistMessages],
  );

  const pasteFriendMessage = useCallback(
    async (content: string, speaker: 'friend' | 'user') => {
      const friend = realFriendRef.current;
      const buddyId = buddyTypeIdRef.current;
      if (!friend || !buddyId || !content.trim() || loading.friend || loading.buddy) return;

      const friendId = friend.id;
      const message = createMessage(speaker, 'friend', content.trim());
      const nextMessages = [...messagesRef.current, message];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(null);
      setLoading((prev) => ({ ...prev, friend: true }));
      updateTranslatingIds(message.id, true);

      try {
        await persistMessages(nextMessages, friendId);

        const translationPromise = sendRealTranslation(friendId, message.content, DEFAULT_AI_MODEL)
          .then(async (result) => {
            if (realFriendRef.current?.id !== friendId) return;
            if (!messagesRef.current.some((item) => item.id === message.id)) return;

            const withTranslation = messagesRef.current.map((item) =>
              item.id === message.id ? { ...item, translationJa: result.text.trim() } : item,
            );
            messagesRef.current = withTranslation;
            setMessages(withTranslation);
            await persistMessages(withTranslation, friendId);
          })
          .finally(() => {
            updateTranslatingIds(message.id, false);
          });

        const buddyPromise =
          speaker === 'friend'
            ? triggerBuddySupport(nextMessages, message.id, friendId)
            : triggerBuddyFeedback(nextMessages, message.id, friendId);

        await Promise.allSettled([translationPromise, buddyPromise]);
      } catch (e) {
        updateTranslatingIds(message.id, false);
        if (realFriendRef.current?.id === friendId) {
          const errMsg = e instanceof Error ? e.message : 'メッセージの保存に失敗しました。';
          // #region agent log
          dbgConv('useRealConversation:pasteFriendMessage:error', 'paste failed', {
            friendId, speaker, errMsg,
          }, 'A');
          // #endregion
          setError(errMsg);
        }
      } finally {
        if (realFriendRef.current?.id === friendId) {
          setLoading((prev) => ({ ...prev, friend: false }));
        }
      }
    },
    [loading.friend, loading.buddy, persistMessages, triggerBuddyFeedback, triggerBuddySupport, updateTranslatingIds],
  );

  const sendToBuddy = useCallback(
    async (content: string) => {
      const friend = realFriendRef.current;
      const buddyId = buddyTypeIdRef.current;
      if (!friend || !buddyId || !content.trim() || buddyBusyRef.current) return;

      const friendId = friend.id;
      const userMessage = createMessage('user', 'buddy', content.trim());
      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(null);
      buddyBusyRef.current = true;
      consultInFlightRef.current = true;
      setLoading((prev) => ({ ...prev, buddy: true }));

      try {
        const reply = await sendRealConsult(friendId, nextMessages, buddyId, DEFAULT_AI_MODEL);
        if (realFriendRef.current?.id !== friendId) return;

        const updated = [
          ...messagesRef.current,
          createBuddyReplyMessage(reply),
        ];
        messagesRef.current = updated;
        setMessages(updated);
        await persistMessages(updated, friendId);
      } catch (e) {
        if (realFriendRef.current?.id !== friendId) return;
        setError(e instanceof Error ? e.message : 'バディへの送信に失敗しました。');
        await persistMessages(nextMessages, friendId);
      } finally {
        if (realFriendRef.current?.id === friendId) {
          buddyBusyRef.current = false;
          consultInFlightRef.current = false;
          setLoading((prev) => ({ ...prev, buddy: false }));
        }
      }
    },
    [persistMessages],
  );

  const clearConversation = useCallback(() => {
    backfillRunIdRef.current += 1;
    setRealFriend(null);
    setMessages([]);
    messagesRef.current = [];
    setTranslatingIds(new Set());
    lastSupportPartnerIdRef.current = null;
    lastFeedbackUserIdRef.current = null;
    setError(null);
    setLoading({ friend: false, buddy: false });
  }, []);

  const refreshRealFriendProfile = useCallback((friend: RealFriendListItem) => {
    if (realFriendRef.current?.id !== friend.id) return;
    setRealFriend(friend);
    realFriendRef.current = friend;
  }, []);

  const deleteLastPastedMessage = useCallback(async () => {
    const friend = realFriendRef.current;
    if (!friend) return;

    const friendId = friend.id;
    const updated = buildMessagesAfterDelete(messagesRef.current);
    if (updated.length === messagesRef.current.length) return;

    const deletedId = getLastFriendMessage(messagesRef.current)?.id;
    messagesRef.current = updated;
    setMessages(updated);
    setError(null);

    if (deletedId) {
      updateTranslatingIds(deletedId, false);
      if (lastSupportPartnerIdRef.current === deletedId) {
        lastSupportPartnerIdRef.current = null;
      }
      if (lastFeedbackUserIdRef.current === deletedId) {
        lastFeedbackUserIdRef.current = null;
      }
    }

    setLoading((prev) => ({ ...prev, friend: false }));

    try {
      await persistMessages(updated, friendId);
    } catch (e) {
      if (realFriendRef.current?.id !== friendId) return;
      setError(e instanceof Error ? e.message : 'メッセージの削除に失敗しました。');
    }
  }, [persistMessages, updateTranslatingIds]);

  const deletableMessageId = useMemo(
    () => getLastFriendMessage(messages)?.id ?? null,
    [messages],
  );

  return {
    realFriend,
    buddyTypeId,
    setBuddyTypeId: setBuddyTypeIdSynced,
    messages,
    loading,
    translatingIds,
    error,
    switchConversation,
    refreshRealFriendProfile,
    pasteFriendMessage,
    sendToBuddy,
    deleteLastPastedMessage,
    deletableMessageId,
    clearConversation,
    clearError: () => setError(null),
  };
}
