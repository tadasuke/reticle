export function ModeSelect() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <header className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-600">Buddy Talk</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">バディトーク</h1>
          <p className="mt-3 text-gray-600">練習モードを選んでください</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/ai"
            className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <p className="text-sm font-medium text-blue-600">AIモード</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">AIフレンドと英会話</h2>
            <p className="mt-3 text-sm text-gray-600">
              AIキャラクターと英語で会話しながら、バディが添削や相談に乗ります。
            </p>
          </a>

          <a
            href="/real"
            className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <p className="text-sm font-medium text-emerald-600">リアルモード</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">実際のSNS会話をサポート</h2>
            <p className="mt-3 text-sm text-gray-600">
              Tinder などのやり取りをコピペして記録し、バディが返信のヒントを出します。
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
