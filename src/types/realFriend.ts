export type RealFriendPhoto = {
  id: string;
  url: string;
  createdAt: string;
  isDefault: boolean;
};

export type RealFriendListItem = {
  id: string;
  label: string;
  subtitle: string;
  age: number;
  nationality: string;
  gender: string;
  sourceApp: string;
  bio: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string;
  lastMessagePreview: string | null;
  lastMessageSpeaker: 'user' | 'friend' | null;
  messageCount: number;
  avatarUrl: string | null;
};

export type RealFriendDetail = RealFriendListItem & {
  photos: RealFriendPhoto[];
};

export type RealFriendInput = {
  id?: string;
  label: string;
  age: number;
  nationality: string;
  gender: string;
  sourceApp: string;
  bio: string;
  notes: string;
};

export type RealFriendLoadingState = {
  list: boolean;
  detail: boolean;
  save: boolean;
  delete: boolean;
  messages: boolean;
  photos: boolean;
};
