import type { FriendCharacterInput, FriendCharacterLoadingState } from '../../types/friendCharacter';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';

type FriendCharacterFormProps = {
  form: FriendCharacterInput;
  loading: FriendCharacterLoadingState;
  isCreating: boolean;
  imageFolderPath: string | null;
  onChange: <K extends keyof FriendCharacterInput>(
    key: K,
    value: FriendCharacterInput[K],
  ) => void;
  onSave: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
};

const GENDER_OPTIONS = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'non-binary', label: 'ノンバイナリー' },
];

export function FriendCharacterForm({
  form,
  loading,
  isCreating,
  imageFolderPath,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: FriendCharacterFormProps) {
  const disabled = loading.save || loading.detail;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      {isCreating && (
        <div>
          <label htmlFor="friend-id" className="mb-1 block text-sm font-medium text-gray-700">
            ID（任意）
          </label>
          <input
            id="friend-id"
            type="text"
            value={form.id ?? ''}
            onChange={(event) => onChange('id', event.target.value)}
            placeholder="未入力時は friend-0001 形式で自動採番"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">英小文字・数字・ハイフンのみ</p>
        </div>
      )}

      <div>
        <label htmlFor="friend-label" className="mb-1 block text-sm font-medium text-gray-700">
          名前
        </label>
        <input
          id="friend-label"
          type="text"
          required
          disabled={disabled}
          value={form.label}
          onChange={(event) => onChange('label', event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="friend-age" className="mb-1 block text-sm font-medium text-gray-700">
            年齢
          </label>
          <input
            id="friend-age"
            type="number"
            min={1}
            max={120}
            required
            disabled={disabled}
            value={form.age}
            onChange={(event) => onChange('age', Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="friend-gender" className="mb-1 block text-sm font-medium text-gray-700">
            性別
          </label>
          <select
            id="friend-gender"
            disabled={disabled}
            value={form.gender}
            onChange={(event) => onChange('gender', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">未設定</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="friend-nationality" className="mb-1 block text-sm font-medium text-gray-700">
          国籍・出身
        </label>
        <input
          id="friend-nationality"
          type="text"
          disabled={disabled}
          value={form.nationality}
          onChange={(event) => onChange('nationality', event.target.value)}
          placeholder="例: カナダ人"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label htmlFor="friend-subtitle" className="mb-1 block text-sm font-medium text-gray-700">
          サブタイトル（任意）
        </label>
        <input
          id="friend-subtitle"
          type="text"
          disabled={disabled}
          value={form.subtitle}
          onChange={(event) => onChange('subtitle', event.target.value)}
          placeholder="未入力時は年齢・国籍・性別から自動生成"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label htmlFor="friend-description" className="mb-1 block text-sm font-medium text-gray-700">
          説明（UI 表示用）
        </label>
        <textarea
          id="friend-description"
          rows={2}
          disabled={disabled}
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label htmlFor="friend-persona" className="mb-1 block text-sm font-medium text-gray-700">
          ペルソナ（LLM 用・英語）
        </label>
        <textarea
          id="friend-persona"
          rows={6}
          required
          disabled={disabled}
          value={form.persona}
          onChange={(event) => onChange('persona', event.target.value)}
          placeholder="You are Emma, a 25-year-old Canadian woman with native-level English..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-100"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            disabled={disabled}
            checked={form.enabled}
            onChange={(event) => onChange('enabled', event.target.checked)}
          />
          トップ画面に表示する
      </label>

      {imageFolderPath && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <p className="font-medium text-gray-700">画像の配置先</p>
          <p className="mt-1 break-all font-mono">{imageFolderPath}/reference.png</p>
          <p className="mt-1">画像は手動で配置してください（アップロード機能なし）</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={disabled}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading.save ? '保存中...' : isCreating ? '作成' : '保存'}
          </button>
          {isCreating && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading.save}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
          )}
          {!isCreating && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading.delete || loading.save}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading.delete ? '削除中...' : '削除'}
            </button>
          )}
        </div>

      {loading.detail && (
        <div className="flex justify-center py-2">
          <LoadingIndicator label="読み込み中..." />
        </div>
      )}
    </form>
  );
}
