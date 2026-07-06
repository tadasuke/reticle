import { AdminNav } from './components/AdminNav';

const adminLinks = [
  {
    href: '/admin/users',
    title: 'ユーザ管理',
    description: 'ユーザ一覧と AI トークン残高、利用状況の確認',
  },
  {
    href: '/admin/friend-characters',
    title: 'フレンド作成',
    description: 'AI フレンドの名前・年齢・ペルソナ等を登録',
  },
  {
    href: '/admin/character-images',
    title: 'キャラ画像作成',
    description: '参照画像の生成・修正・採用',
  },
];

export function AdminHome() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
            <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
            <p className="mt-1 text-sm text-gray-600">運営者向けの管理機能へ移動します</p>
          </div>
          <AdminNav current="home" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-gray-900">{link.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{link.description}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
