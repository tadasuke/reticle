import { ControlPanel } from './components/ControlPanel';
import { ImageGallery } from './components/ImageGallery';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { useCharacterImageStudio } from '../hooks/useCharacterImageStudio';

export function CharacterImageStudio() {
  const studio = useCharacterImageStudio();
  const showGallery = Boolean(studio.characterId) && !studio.showCreateForm;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
            <h1 className="text-xl font-bold text-gray-900">キャラクター画像作成</h1>
            <p className="mt-1 text-sm text-gray-600">
              プロンプトから参照画像を生成・修正・採用します（ID は自動採番）
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            会話画面へ戻る
          </a>
        </div>
      </header>

      {studio.error && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <ErrorBanner message={studio.error} onDismiss={studio.clearError} />
        </div>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="w-full shrink-0 rounded-xl border border-gray-200 bg-white lg:w-[380px] lg:max-w-[380px]">
          <ControlPanel
            characterId={studio.characterId}
            characters={studio.characters}
            reference={studio.detail?.reference ?? null}
            visualAnchor={studio.visualAnchor}
            mustAvoid={studio.mustAvoid}
            negativePrompt={studio.negativePrompt}
            seed={studio.seed}
            generateCount={studio.generateCount}
            editInstruction={studio.editInstruction}
            selectedImageId={studio.selectedImageId}
            showCreateForm={studio.showCreateForm || !studio.characterId}
            loading={studio.loading}
            isBusy={studio.isBusy}
            onSelectCharacter={studio.selectCharacter}
            onShowCreateForm={studio.startCreate}
            onCancelCreate={() => studio.setShowCreateForm(false)}
            onVisualAnchorChange={studio.setVisualAnchor}
            onMustAvoidChange={studio.setMustAvoid}
            onNegativePromptChange={studio.setNegativePrompt}
            onSeedChange={studio.setSeed}
            onGenerateCountChange={studio.setGenerateCount}
            onEditInstructionChange={studio.setEditInstruction}
            onCreate={studio.create}
            onSaveSpec={studio.saveSpec}
            onGenerate={studio.generate}
            onEdit={studio.edit}
            onStressTest={studio.stressTest}
            onAdopt={studio.adopt}
          />
        </section>

        <section className="min-h-[480px] flex-1 rounded-xl border border-gray-200 bg-white p-4 lg:min-h-0">
          {showGallery ? (
            <ImageGallery
              gallery={studio.detail?.gallery ?? []}
              reference={studio.detail?.reference ?? null}
              selectedImageId={studio.selectedImageId}
              onSelect={studio.setSelectedImageId}
              selectedImage={studio.selectedImage}
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              プロンプトから新規作成するか、一覧から画像セットを選択するとギャラリーが表示されます。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
