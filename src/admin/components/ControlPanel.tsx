import type { CharacterListItem, StudioLoadingState } from '../../types/characterImageStudio';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { ReferencePreview } from './ReferencePreview';
import type { GalleryImage } from '../../types/characterImageStudio';

type ControlPanelProps = {
  characterId: string | null;
  characters: CharacterListItem[];
  reference: GalleryImage | null;
  visualAnchor: string;
  mustAvoid: string;
  negativePrompt: string;
  seed: string;
  generateCount: number;
  editInstruction: string;
  selectedImageId: string | null;
  showCreateForm: boolean;
  loading: StudioLoadingState;
  isBusy: boolean;
  onSelectCharacter: (id: string) => void;
  onShowCreateForm: () => void;
  onCancelCreate: () => void;
  onVisualAnchorChange: (value: string) => void;
  onMustAvoidChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
  onSeedChange: (value: string) => void;
  onGenerateCountChange: (value: number) => void;
  onEditInstructionChange: (value: string) => void;
  onCreate: () => void;
  onSaveSpec: () => void;
  onGenerate: () => void;
  onEdit: () => void;
  onStressTest: () => void;
  onAdopt: () => void;
};

export function ControlPanel({
  characterId,
  characters,
  reference,
  visualAnchor,
  mustAvoid,
  negativePrompt,
  seed,
  generateCount,
  editInstruction,
  selectedImageId,
  showCreateForm,
  loading,
  isBusy,
  onSelectCharacter,
  onShowCreateForm,
  onCancelCreate,
  onVisualAnchorChange,
  onMustAvoidChange,
  onNegativePromptChange,
  onSeedChange,
  onGenerateCountChange,
  onEditInstructionChange,
  onCreate,
  onSaveSpec,
  onGenerate,
  onEdit,
  onStressTest,
  onAdopt,
}: ControlPanelProps) {
  const isCreating = showCreateForm || !characterId;
  const canGenerate = Boolean(characterId) && visualAnchor.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            画像セット
          </p>
          <button
            type="button"
            disabled={isBusy}
            onClick={onShowCreateForm}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            + 新規作成
          </button>
        </div>

        {characters.length === 0 && !showCreateForm ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
            画像セットがまだありません。プロンプトから新規作成してください。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {characters.map((character) => (
              <button
                key={character.characterId}
                type="button"
                disabled={isBusy}
                onClick={() => onSelectCharacter(character.characterId)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                  characterId === character.characterId && !showCreateForm
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="font-medium">{character.characterId}</span>
                <span className="mt-1 block text-xs text-gray-500">
                  {character.hasReference ? 'reference（採用画像）あり' : '未採用'} / 候補{' '}
                  {character.candidateCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isCreating ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
          <h2 className="mb-3 text-sm font-semibold text-blue-900">新規作成</h2>
          <div className="space-y-3">
            <PromptFields
              visualAnchor={visualAnchor}
              mustAvoid={mustAvoid}
              negativePrompt={negativePrompt}
              disabled={isBusy}
              onVisualAnchorChange={onVisualAnchorChange}
              onMustAvoidChange={onMustAvoidChange}
              onNegativePromptChange={onNegativePromptChange}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCreate}
                disabled={isBusy || loading.create || !visualAnchor.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading.create ? '作成中...' : '画像セットを作成'}
              </button>
              {characterId && (
                <button
                  type="button"
                  onClick={onCancelCreate}
                  disabled={isBusy}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <ReferencePreview reference={reference} />

          <PromptFields
            visualAnchor={visualAnchor}
            mustAvoid={mustAvoid}
            negativePrompt={negativePrompt}
            disabled={isBusy}
            onVisualAnchorChange={onVisualAnchorChange}
            onMustAvoidChange={onMustAvoidChange}
            onNegativePromptChange={onNegativePromptChange}
          />

          <button
            type="button"
            onClick={onSaveSpec}
            disabled={isBusy || loading.spec || !canGenerate}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading.spec ? '保存中...' : 'プロンプトを保存'}
          </button>

          <hr className="border-gray-200" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="seed">
                seed
              </label>
              <input
                id="seed"
                type="number"
                value={seed}
                onChange={(e) => onSeedChange(e.target.value)}
                disabled={isBusy}
                placeholder="ランダム"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="generate-count">
                生成枚数
              </label>
              <select
                id="generate-count"
                value={generateCount}
                onChange={(e) => onGenerateCountChange(Number(e.target.value))}
                disabled={isBusy}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} 枚
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={isBusy || loading.generate || !canGenerate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading.generate ? '候補を生成中...' : '候補を生成'}
          </button>

          {loading.generate && (
            <LoadingIndicator label="画像を生成しています（数十秒かかることがあります）..." />
          )}

          <hr className="border-gray-200" />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="edit-instruction">
              修正指示（選択中の画像への変更内容）
            </label>
            <textarea
              id="edit-instruction"
              value={editInstruction}
              onChange={(e) => onEditInstructionChange(e.target.value)}
              rows={3}
              disabled={isBusy || !selectedImageId}
              placeholder="例: smile をもう少し自然に、背景をもっとシンプルに"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>

          <button
            type="button"
            onClick={onEdit}
            disabled={isBusy || loading.edit || !selectedImageId || !editInstruction.trim()}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
          >
            {loading.edit ? '修正生成中...' : '修正して再生成'}
          </button>

          <button
            type="button"
            onClick={onStressTest}
            disabled={isBusy || loading.stressTest || !selectedImageId}
            className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
          >
            {loading.stressTest ? 'ストレステスト中...' : 'ストレステスト（3 シーン・同一人物の確認）'}
          </button>

          {loading.stressTest && (
            <LoadingIndicator label="3 枚生成中...（30〜90 秒かかることがあります）" />
          )}

          <button
            type="button"
            onClick={onAdopt}
            disabled={isBusy || loading.adopt || !selectedImageId}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading.adopt ? '採用中...' : 'この画像を reference（採用画像）にする'}
          </button>

          <p className="text-xs text-gray-500">
            1 回の生成で API コストが発生します。stress-test（同一人物チェック）は 3 枚固定です。
          </p>
        </>
      )}
    </div>
  );
}

type PromptFieldsProps = {
  visualAnchor: string;
  mustAvoid: string;
  negativePrompt: string;
  disabled: boolean;
  onVisualAnchorChange: (value: string) => void;
  onMustAvoidChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
};

function PromptFields({
  visualAnchor,
  mustAvoid,
  negativePrompt,
  disabled,
  onVisualAnchorChange,
  onMustAvoidChange,
  onNegativePromptChange,
}: PromptFieldsProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="visual-anchor">
          visual_anchor（キャラの見た目の説明）
        </label>
        <textarea
          id="visual-anchor"
          value={visualAnchor}
          onChange={(e) => onVisualAnchorChange(e.target.value)}
          rows={5}
          disabled={disabled}
          placeholder="例: 27-year-old Indonesian woman, warm friendly smile, shoulder-length dark brown wavy hair..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="must-avoid">
          must_avoid（生成時に避けたい見た目・任意）
        </label>
        <textarea
          id="must-avoid"
          value={mustAvoid}
          onChange={(e) => onMustAvoidChange(e.target.value)}
          rows={2}
          disabled={disabled}
          placeholder="例: celebrity likeness, multiple people, sunglasses covering face"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="negative-prompt">
          negative_prompt（避けたい表現・画質）
        </label>
        <textarea
          id="negative-prompt"
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          rows={3}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>
    </>
  );
}
