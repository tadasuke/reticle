const REAL_MODE_BUDDY_ID_KEY = 'realModeBuddyId';
const REAL_MODE_FRIEND_ID_KEY = 'realModeSelectedFriendId';

export function getStoredBuddyId(): string | null {
  try {
    return localStorage.getItem(REAL_MODE_BUDDY_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredBuddyId(buddyId: string): void {
  try {
    localStorage.setItem(REAL_MODE_BUDDY_ID_KEY, buddyId);
  } catch {
    // ignore storage errors
  }
}

export function getStoredFriendId(): string | null {
  try {
    return localStorage.getItem(REAL_MODE_FRIEND_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredFriendId(friendId: string): void {
  try {
    localStorage.setItem(REAL_MODE_FRIEND_ID_KEY, friendId);
  } catch {
    // ignore storage errors
  }
}

export function clearStoredFriendId(): void {
  try {
    localStorage.removeItem(REAL_MODE_FRIEND_ID_KEY);
  } catch {
    // ignore storage errors
  }
}
