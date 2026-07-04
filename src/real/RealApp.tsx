import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBuddyTypes } from '../lib/apiClient';
import { getStoredBuddyId, getStoredFriendId, setStoredBuddyId, setStoredFriendId, clearStoredFriendId } from '../lib/realModeStorage';
import { useRealConversation } from '../hooks/useRealConversation';
import { useRealFriendPhotos } from '../hooks/useRealFriendPhotos';
import { useRealFriends } from '../hooks/useRealFriends';
import { RealConversationLayout } from './RealConversationLayout';
import { RealFriendFormModal } from './RealFriendFormModal';
import type { BuddyType } from '../types/conversation';

// #region agent log
function dbg(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch('http://127.0.0.1:7250/ingest/989a1cc2-ba98-4ec6-9f19-23ab7217ba35', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '85014f' },
    body: JSON.stringify({ sessionId: '85014f', location, message, data, hypothesisId, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

export function RealApp() {
  const {
    realFriends,
    editingId,
    form,
    setForm,
    loading,
    error: friendsError,
    openNewForm,
    openEditForm,
    closeForm,
    saveFriend,
    removeFriend,
    loadList,
    clearError: clearFriendsError,
  } = useRealFriends();

  const realFriendsRef = useRef(realFriends);
  realFriendsRef.current = realFriends;

  const loadListRef = useRef(loadList);
  loadListRef.current = loadList;
  const loadListTimerRef = useRef<number | undefined>(undefined);
  const onMessagesPersisted = useCallback(() => {
    window.clearTimeout(loadListTimerRef.current);
    loadListTimerRef.current = window.setTimeout(() => {
      void loadListRef.current();
    }, 400);
  }, []);

  const {
    realFriend,
    buddyTypeId,
    setBuddyTypeId,
    messages,
    loading: conversationLoading,
    translatingIds,
    error: conversationError,
    switchConversation,
    pasteFriendMessage,
    sendToBuddy,
    deleteLastPastedMessage,
    deletableMessageId,
    clearConversation,
    clearError: clearConversationError,
    refreshRealFriendProfile,
  } = useRealConversation({
    onMessagesPersisted,
  });

  const switchConversationRef = useRef(switchConversation);
  switchConversationRef.current = switchConversation;

  const lastAppliedSelectionRef = useRef<{ friendId: string; buddyTypeId: string } | null>(null);

  const [buddyTypes, setBuddyTypes] = useState<BuddyType[]>([]);
  const [loadingBuddies, setLoadingBuddies] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(() => getStoredFriendId());
  const hasInitializedSelectionRef = useRef(selectedFriendId !== null);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  const handlePhotosChanged = useCallback(async () => {
    const items = await loadList();
    if (!selectedFriendId) return;
    const updated = items.find((item) => item.id === selectedFriendId);
    if (updated) {
      refreshRealFriendProfile(updated);
    }
  }, [loadList, selectedFriendId, refreshRealFriendProfile]);

  const {
    photos,
    loading: photoLoading,
    error: photoError,
    uploadPhoto,
    setDefaultPhoto,
    deletePhoto,
    clearError: clearPhotoError,
  } = useRealFriendPhotos({
    friendId: editingId || null,
    enabled: formOpen && !!editingId,
    onChanged: () => {
      void handlePhotosChanged();
    },
  });

  useEffect(() => {
    if (!loading.list && !friendsLoaded) {
      setFriendsLoaded(true);
    }
  }, [loading.list, friendsLoaded]);

  useEffect(() => {
    // #region agent log
    dbg('RealApp.tsx:mount', 'component mounted', { selectedFriendId, storedFriendId: getStoredFriendId() }, 'C');
    return () => {
      dbg('RealApp.tsx:unmount', 'component unmounted', {}, 'C');
    };
    // #endregion
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBuddyTypes()
      .then((buddies) => {
        if (cancelled) return;
        setBuddyTypes(buddies);
        const stored = getStoredBuddyId();
        const initial = buddies.find((buddy) => buddy.id === stored)?.id ?? buddies[0]?.id ?? '';
        setBuddyTypeId(initial);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBuddies(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setBuddyTypeId]);

  useEffect(() => {
    if (hasInitializedSelectionRef.current || loading.list || loadingBuddies || !buddyTypeId) return;
    if (realFriends.length === 0) return;

    const stored = getStoredFriendId();
    const storedFriend = stored ? realFriends.find((f) => f.id === stored) : undefined;
    const targetId = storedFriend?.id ?? realFriends[0].id;
    const targetLabel = storedFriend?.label ?? realFriends[0].label;

    hasInitializedSelectionRef.current = true;
    // #region agent log
    dbg('RealApp.tsx:autoInit', 'auto-select friend', { targetId, targetLabel, fromStorage: !!storedFriend }, 'C');
    // #endregion
    setStoredFriendId(targetId);
    setSelectedFriendId(targetId);
  }, [loading.list, loadingBuddies, buddyTypeId, realFriends]);

  useEffect(() => {
    if (!selectedFriendId || !buddyTypeId || !friendsLoaded) return;
    if (
      lastAppliedSelectionRef.current?.friendId === selectedFriendId &&
      lastAppliedSelectionRef.current?.buddyTypeId === buddyTypeId
    ) {
      // #region agent log
      dbg('RealApp.tsx:switchEffect', 'skip redundant switch', {
        selectedFriendId,
        buddyTypeId,
      }, 'A');
      // #endregion
      return;
    }
    const friend = realFriendsRef.current.find((item) => item.id === selectedFriendId);
    if (!friend) {
      // #region agent log
      dbg('RealApp.tsx:switchEffect', 'friend not in list yet', { selectedFriendId }, 'C');
      // #endregion
      return;
    }
    lastAppliedSelectionRef.current = { friendId: selectedFriendId, buddyTypeId };
    // #region agent log
    dbg('RealApp.tsx:switchEffect', 'effect calls switchConversation', {
      selectedFriendId,
      friendLabel: friend.label,
      buddyTypeId,
      realFriendId: realFriend?.id ?? null,
    }, 'A');
    // #endregion
    void switchConversationRef.current(friend, buddyTypeId);
  }, [selectedFriendId, buddyTypeId, friendsLoaded]);

  const handleSelectFriend = useCallback((friendId: string) => {
    if (!buddyTypeId) return;
    if (friendId === selectedFriendId) return;
    const friend = realFriends.find((f) => f.id === friendId);
    // #region agent log
    dbg('RealApp.tsx:handleSelectFriend', 'user clicked friend', {
      friendId,
      friendLabel: friend?.label ?? '?',
      prevSelected: selectedFriendId,
      currentRealFriendId: realFriend?.id ?? null,
    }, 'C');
    // #endregion
    lastAppliedSelectionRef.current = null;
    setStoredFriendId(friendId);
    setSelectedFriendId(friendId);
  }, [buddyTypeId, realFriends, selectedFriendId, realFriend]);

  const handleBuddyChange = useCallback(
    (buddyId: string) => {
      setBuddyTypeId(buddyId);
      if (buddyId) {
        setStoredBuddyId(buddyId);
      }
    },
    [setBuddyTypeId],
  );

  const handleOpenCreate = useCallback(() => {
    openNewForm();
    setFormOpen(true);
    clearFriendsError();
  }, [openNewForm, clearFriendsError]);

  const handleOpenEdit = useCallback(() => {
    if (!realFriend) return;
    openEditForm(realFriend);
    setFormOpen(true);
    clearFriendsError();
  }, [realFriend, openEditForm, clearFriendsError]);

  const handleCloseForm = useCallback(() => {
    closeForm();
    setFormOpen(false);
    clearFriendsError();
    clearPhotoError();
  }, [closeForm, clearFriendsError, clearPhotoError]);

  const handleSaveFriend = useCallback(async () => {
    const saved = await saveFriend();
    if (!saved) return;

    setFormOpen(false);
    closeForm();
    if (buddyTypeId) {
      lastAppliedSelectionRef.current = null;
      setStoredFriendId(saved.id);
      setSelectedFriendId(saved.id);
    }
  }, [saveFriend, closeForm, buddyTypeId]);

  const handleDeleteFriend = useCallback(async () => {
    const deletedId = editingId || realFriend?.id;
    const remaining = await removeFriend();
    setFormOpen(false);

    if (deletedId && realFriend?.id === deletedId) {
      lastAppliedSelectionRef.current = null;
      if (remaining[0]) {
        setStoredFriendId(remaining[0].id);
        setSelectedFriendId(remaining[0].id);
      } else {
        clearStoredFriendId();
        hasInitializedSelectionRef.current = false;
        setSelectedFriendId(null);
        clearConversation();
      }
    }
  }, [editingId, realFriend, removeFriend, clearConversation]);

  const deleteDisabled = conversationLoading.friend && messages.length === 0;

  return (
    <>
      <RealConversationLayout
        realFriends={realFriends}
        realFriend={realFriend}
        activeFriendId={selectedFriendId}
        buddyTypes={buddyTypes}
        buddyTypeId={buddyTypeId}
        onBuddyTypeChange={handleBuddyChange}
        sidebarLoading={loading.list}
        messages={messages}
        loading={conversationLoading}
        translatingIds={translatingIds}
        error={friendsError ?? conversationError}
        onSelectFriend={handleSelectFriend}
        onCreateFriend={handleOpenCreate}
        onEditFriend={handleOpenEdit}
        onPasteFriendMessage={pasteFriendMessage}
        onDeleteLastMessage={() => void deleteLastPastedMessage()}
        deletableMessageId={deletableMessageId}
        deleteDisabled={deleteDisabled}
        onSendToBuddy={sendToBuddy}
        onDismissError={() => {
          clearFriendsError();
          clearConversationError();
        }}
      />

      <RealFriendFormModal
        open={formOpen}
        editing={!!editingId}
        friendId={editingId || null}
        form={form}
        photos={photos}
        loadingSave={loading.save}
        loadingDelete={loading.delete}
        loadingPhotos={photoLoading}
        error={friendsError}
        photoError={photoError}
        onFormChange={setForm}
        onSave={() => void handleSaveFriend()}
        onDelete={() => void handleDeleteFriend()}
        onClose={handleCloseForm}
        onDismissError={clearFriendsError}
        onUploadPhoto={(file) => {
          void uploadPhoto(file);
        }}
        onSetDefaultPhoto={(photoId) => {
          void setDefaultPhoto(photoId);
        }}
        onDeletePhoto={(photoId) => {
          void deletePhoto(photoId);
        }}
        onDismissPhotoError={clearPhotoError}
      />
    </>
  );
}
