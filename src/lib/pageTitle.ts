const DEFAULT_TITLE = 'バディトーク';

export function setPageTitle(pageName?: string): void {
  document.title = pageName ? `${pageName}｜${DEFAULT_TITLE}` : DEFAULT_TITLE;
}

export function resolveAppPageTitle(pathname: string): string | undefined {
  if (pathname === '/' || pathname === '' || pathname.startsWith('/ai')) {
    return 'AIトップ画面';
  }
  if (pathname.startsWith('/real')) {
    return 'リアルモード';
  }
  return undefined;
}

export function resolveAdminPageTitle(pathname: string): string | undefined {
  if (pathname.startsWith('/admin/buddy-characters')) {
    return 'バディー作成';
  }
  if (pathname.startsWith('/admin/character-images')) {
    return 'キャラクター画像作成';
  }
  if (pathname.startsWith('/admin/friend-characters')) {
    return 'フレンド作成';
  }
  return undefined;
}
