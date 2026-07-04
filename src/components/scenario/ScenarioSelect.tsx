import { useEffect, useState } from 'react';
import { BUDDY_SUPPORT_TYPES, DEFAULT_BUDDY_SUPPORT_TYPE, getBuddySupportTypeOption } from '../../data/buddySupportTypes';
import { DEFAULT_SCENARIO_ID } from '../../data/scenarios';
import { fetchBuddyTypes, fetchFriendTypes, getMediaUrl } from '../../lib/apiClient';
import type { StartScenarioOptions } from '../../hooks/useConversation';
import type { BuddySupportType, BuddyType, BuddyTypeId, FriendType, FriendTypeId } from '../../types/conversation';
import { ErrorBanner } from '../common/ErrorBanner';
import { LoadingIndicator } from '../common/LoadingIndicator';

type ScenarioSelectProps = {
  onSelect: (options: StartScenarioOptions) => void;
  onBack?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onDismissError?: () => void;
};

type TypeCardProps = {
  title: string;
  subtitle: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

type FriendTypeCardProps = TypeCardProps & {
  referenceUrl?: string | null;
};

function TypeCard({ title, subtitle, description, selected, disabled, onClick }: TypeCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </button>
  );
}

function FriendTypeCard({
  title,
  subtitle,
  description,
  referenceUrl,
  selected,
  disabled,
  onClick,
}: FriendTypeCardProps) {
  const imageUrl = referenceUrl ? getMediaUrl(referenceUrl) : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="aspect-[4/3] w-full bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            画像未設定
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}

export function ScenarioSelect({
  onSelect,
  onBack,
  isLoading = false,
  error = null,
  onDismissError,
}: ScenarioSelectProps) {
  const [friendTypes, setFriendTypes] = useState<FriendType[]>([]);
  const [buddyTypes, setBuddyTypes] = useState<BuddyType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [friendTypeId, setFriendTypeId] = useState<FriendTypeId>('');
  const [buddyTypeId, setBuddyTypeId] = useState<BuddyTypeId>('');
  const [supportType, setSupportType] = useState<BuddySupportType>(DEFAULT_BUDDY_SUPPORT_TYPE);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFriendTypes(), fetchBuddyTypes()])
      .then(([friends, buddies]) => {
        if (cancelled) return;
        setFriendTypes(friends);
        setBuddyTypes(buddies);
        setFriendTypeId(friends[0]?.id ?? '');
        setBuddyTypeId(buddies[0]?.id ?? '');
      })
      .catch((e) => {
        if (!cancelled) {
          setTypesError(e instanceof Error ? e.message : 'キャラクター一覧の取得に失敗しました。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTypes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFriendType = friendTypes.find((type) => type.id === friendTypeId) ?? friendTypes[0];
  const selectedBuddyType =
    buddyTypes.find((type) => type.id === buddyTypeId) ?? buddyTypes[0];
  const selectedSupportOption = getBuddySupportTypeOption(supportType);
  const hasFriends = friendTypes.length > 0;
  const hasBuddies = buddyTypes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-10 text-center">
          {onBack ? (
            <div className="mb-4 flex justify-start">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                一覧に戻る
              </button>
            </div>
          ) : null}
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">AIモード</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">AIトップ画面</h1>
          <p className="mt-3 text-gray-600">
            AIフレンドとバディを選び、SNSで知り合った人との初めての会話を始めましょう
          </p>
        </header>

        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onDismiss={onDismissError} />
          </div>
        )}

        {typesError && (
          <div className="mb-6">
            <ErrorBanner message={typesError} />
          </div>
        )}

        {(isLoading || loadingTypes) && (
          <div className="mb-6 flex justify-center">
            <LoadingIndicator
              label={loadingTypes ? 'キャラクター一覧を読み込んでいます...' : '会話を開始しています...'}
            />
          </div>
        )}

        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">AIフレンド</h2>
          <p className="mb-4 text-sm text-gray-600">英語で話す AI フレンドを選んでください</p>
          {!loadingTypes && !hasFriends ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm text-gray-600">登録済みのフレンドがありません。</p>
              <a
                href="/admin/friend-characters"
                className="mt-3 inline-block text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
              >
                フレンドを作成する（管理者）
              </a>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {friendTypes.map((type) => (
                <FriendTypeCard
                  key={type.id}
                  title={type.label}
                  subtitle={type.subtitle}
                  description={type.description}
                  referenceUrl={type.referenceUrl}
                  selected={friendTypeId === type.id}
                  disabled={isLoading || loadingTypes}
                  onClick={() => setFriendTypeId(type.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">相談相手</h2>
          <p className="mb-4 text-sm text-gray-600">困ったときに相談するバディを選んでください</p>
          {!loadingTypes && !hasBuddies ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              登録済みのバディがありません。
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buddyTypes.map((type) => (
                <TypeCard
                  key={type.id}
                  title={type.label}
                  subtitle={type.subtitle}
                  description={type.description}
                  selected={buddyTypeId === type.id}
                  disabled={isLoading || loadingTypes}
                  onClick={() => setBuddyTypeId(type.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">サポートタイプ</h2>
          <p className="mb-4 text-sm text-gray-600">バディの自動支援レベルを選んでください（会話中も変更できます）</p>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              {BUDDY_SUPPORT_TYPES.map((option) => {
                const selected = supportType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isLoading || loadingTypes}
                    onClick={() => setSupportType(option.id)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-gray-600">{selectedSupportOption.description}</p>
          </div>
        </section>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            type="button"
            disabled={isLoading || loadingTypes || !selectedFriendType || !selectedBuddyType}
            onClick={() => {
              if (!selectedFriendType || !selectedBuddyType) return;
              onSelect({
                scenarioId: DEFAULT_SCENARIO_ID,
                friendType: selectedFriendType,
                friendTypeId: selectedFriendType.id,
                buddyType: selectedBuddyType,
                buddyTypeId: selectedBuddyType.id,
                supportType,
              });
            }}
            className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            会話を始める
          </button>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <a
              href="/admin/friend-characters"
              className="underline-offset-2 hover:text-gray-700 hover:underline"
            >
              フレンド作成（管理者）
            </a>
            <a
              href="/admin/character-images"
              className="underline-offset-2 hover:text-gray-700 hover:underline"
            >
              キャラ画像作成（管理者）
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
