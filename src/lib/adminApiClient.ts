import type {
  CharacterCreateInput,
  CharacterDetail,
  CharacterListItem,
  CharacterSpec,
  GalleryImage,
} from '../types/characterImageStudio';
import type {
  FriendCharacterDetail,
  FriendCharacterInput,
  FriendCharacterListItem,
} from '../types/friendCharacter';
import type { AdminUserCreateInput, AdminUserDetail, AdminUserListItem, AdminTokenGrantInput } from '../types/adminUser';

const REQUEST_TIMEOUT_MS = 120_000;

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL が設定されていません。.env ファイルを確認してください。');
  }
  return baseUrl.replace(/\/$/, '');
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = (await response.json()) as T & { detail?: string; error?: string };

    if (!response.ok) {
      throw new Error(data.detail ?? data.error ?? 'API リクエストに失敗しました。');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。画像生成には時間がかかることがあります。');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getImageUrl(urlPath: string): string {
  if (urlPath.startsWith('http')) {
    return urlPath;
  }
  return `${getApiBaseUrl()}${urlPath}`;
}

export async function fetchCharacters(): Promise<CharacterListItem[]> {
  const data = await adminFetch<{ characters: CharacterListItem[] }>('/admin/characters');
  return data.characters;
}

export async function createCharacter(input: CharacterCreateInput): Promise<CharacterDetail> {
  return adminFetch<CharacterDetail>('/admin/characters', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchCharacterDetail(characterId: string): Promise<CharacterDetail> {
  return adminFetch<CharacterDetail>(`/admin/characters/${characterId}`);
}

export async function updateCharacterSpec(
  characterId: string,
  spec: CharacterSpec,
): Promise<CharacterSpec> {
  return adminFetch<CharacterSpec>(`/admin/characters/${characterId}/spec`, {
    method: 'PUT',
    body: JSON.stringify(spec),
  });
}

export async function generateCharacterImages(
  characterId: string,
  count: number,
  seed?: number,
): Promise<GalleryImage[]> {
  const data = await adminFetch<{ images: GalleryImage[] }>(
    `/admin/characters/${characterId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify({ count, seed: seed ?? null }),
    },
  );
  return data.images;
}

export async function editCharacterImage(
  characterId: string,
  sourceImageId: string,
  instruction: string,
  seed?: number,
): Promise<GalleryImage> {
  const data = await adminFetch<{ image: GalleryImage }>(`/admin/characters/${characterId}/edit`, {
    method: 'POST',
    body: JSON.stringify({ sourceImageId, instruction, seed: seed ?? null }),
  });
  return data.image;
}

export async function runStressTest(
  characterId: string,
  sourceImageId: string,
  seed?: number,
): Promise<GalleryImage[]> {
  const data = await adminFetch<{ images: GalleryImage[] }>(
    `/admin/characters/${characterId}/stress-test`,
    {
      method: 'POST',
      body: JSON.stringify({ sourceImageId, seed: seed ?? null }),
    },
  );
  return data.images;
}

export async function adoptReferenceImage(
  characterId: string,
  sourceImageId: string,
): Promise<GalleryImage> {
  const data = await adminFetch<{ reference: GalleryImage }>(
    `/admin/characters/${characterId}/adopt`,
    {
      method: 'POST',
      body: JSON.stringify({ sourceImageId }),
    },
  );
  return data.reference;
}

export async function fetchFriendCharacters(): Promise<FriendCharacterListItem[]> {
  const data = await adminFetch<{ friendTypes: FriendCharacterListItem[] }>('/admin/friend-types');
  return data.friendTypes;
}

export async function fetchFriendCharacterDetail(friendId: string): Promise<FriendCharacterDetail> {
  return adminFetch<FriendCharacterDetail>(`/admin/friend-types/${friendId}`);
}

export async function createFriendCharacter(
  input: FriendCharacterInput,
): Promise<FriendCharacterDetail> {
  return adminFetch<FriendCharacterDetail>('/admin/friend-types', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateFriendCharacter(
  friendId: string,
  input: Omit<FriendCharacterInput, 'id'>,
): Promise<FriendCharacterDetail> {
  return adminFetch<FriendCharacterDetail>(`/admin/friend-types/${friendId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteFriendCharacter(friendId: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(`/admin/friend-types/${friendId}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const data = await adminFetch<{ users: AdminUserListItem[] }>('/admin/users');
  return data.users;
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const data = await adminFetch<{ user: AdminUserDetail }>(`/admin/users/${encodeURIComponent(userId)}`);
  return data.user;
}

export async function createAdminUser(input: AdminUserCreateInput): Promise<AdminUserDetail> {
  const data = await adminFetch<{ user: AdminUserDetail }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function grantAdminUserTokens(
  userId: string,
  input: AdminTokenGrantInput,
): Promise<AdminUserDetail> {
  const data = await adminFetch<{ user: AdminUserDetail }>(
    `/admin/users/${encodeURIComponent(userId)}/token-grants`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.user;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
