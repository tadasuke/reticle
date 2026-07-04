export type FriendCharacterListItem = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  age: number;
  enabled: boolean;
  hasReference: boolean;
};

export type FriendCharacterDetail = FriendCharacterListItem & {
  nationality: string;
  gender: string;
  persona: string;
  referenceUrl: string | null;
  imageFolderPath: string | null;
};

export type FriendCharacterInput = {
  id?: string;
  label: string;
  age: number;
  nationality: string;
  gender: string;
  subtitle: string;
  description: string;
  persona: string;
  enabled: boolean;
};

export type FriendCharacterLoadingState = {
  list: boolean;
  detail: boolean;
  save: boolean;
  delete: boolean;
};
