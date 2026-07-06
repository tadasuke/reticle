type AdminNavProps = {
  current?: 'home' | 'users' | 'friends' | 'images';
};

const links = [
  { id: 'home' as const, href: '/admin', label: '管理ホーム' },
  { id: 'users' as const, href: '/admin/users', label: 'ユーザ管理' },
  { id: 'friends' as const, href: '/admin/friend-characters', label: 'フレンド作成' },
  { id: 'images' as const, href: '/admin/character-images', label: 'キャラ画像作成' },
];

export function AdminNav({ current }: AdminNavProps) {
  return (
    <nav className="flex shrink-0 flex-wrap justify-end gap-2">
      {links.map((link) => {
        const isCurrent = current === link.id;
        return (
          <a
            key={link.id}
            href={link.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              isCurrent
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
