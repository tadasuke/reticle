import { useCallback, useEffect, useState } from 'react';
import {
  adoptReferenceImage,
  createCharacter,
  editCharacterImage,
  fetchCharacterDetail,
  fetchCharacters,
  generateCharacterImages,
  runStressTest,
  updateCharacterSpec,
} from '../lib/adminApiClient';
import type {
  CharacterDetail,
  CharacterListItem,
  GalleryImage,
  StudioLoadingState,
} from '../types/characterImageStudio';

const initialLoading: StudioLoadingState = {
  create: false,
  spec: false,
  generate: false,
  edit: false,
  stressTest: false,
  adopt: false,
};

const DEFAULT_NEGATIVE_PROMPT =
  'cartoon, anime, illustration, drawing, ' +
  'ugly, deformed, blurry, low quality, ' +
  'watermark, text, logo';

export function useCharacterImageStudio() {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [detail, setDetail] = useState<CharacterDetail | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [visualAnchor, setVisualAnchor] = useState('');
  const [mustAvoid, setMustAvoid] = useState('');
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE_PROMPT);
  const [seed, setSeed] = useState('');
  const [generateCount, setGenerateCount] = useState(2);
  const [editInstruction, setEditInstruction] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState<StudioLoadingState>(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const isBusy = Object.values(loading).some(Boolean);

  const loadCharacters = useCallback(async () => {
    const list = await fetchCharacters();
    setCharacters(list);
    return list;
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const data = await fetchCharacterDetail(id);
    setDetail(data);
    setVisualAnchor(data.spec.visual_anchor);
    setMustAvoid(data.spec.must_avoid);
    setNegativePrompt(data.spec.negative_prompt);
    setSelectedImageId((prev) => {
      if (prev && data.gallery.some((img) => img.id === prev)) {
        return prev;
      }
      if (prev && data.reference?.id === prev) {
        return prev;
      }
      return data.gallery[0]?.id ?? data.reference?.id ?? null;
    });
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await loadCharacters();
      if (characterId) {
        await loadDetail(characterId);
      } else if (list.length > 0) {
        setCharacterId(list[0].characterId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました。');
    }
  }, [characterId, loadCharacters, loadDetail]);

  useEffect(() => {
    void loadCharacters().catch((e) => {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました。');
    });
  }, [loadCharacters]);

  useEffect(() => {
    if (!characterId) {
      setDetail(null);
      return;
    }
    void loadDetail(characterId).catch((e) => {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました。');
    });
  }, [characterId, loadDetail]);

  const startCreate = useCallback(() => {
    setShowCreateForm(true);
    setVisualAnchor('');
    setMustAvoid('');
    setNegativePrompt(DEFAULT_NEGATIVE_PROMPT);
    setEditInstruction('');
    setError(null);
  }, []);

  const selectCharacter = useCallback((id: string) => {
    setCharacterId(id);
    setSelectedImageId(null);
    setEditInstruction('');
    setShowCreateForm(false);
    setError(null);
  }, []);

  const create = useCallback(async () => {
    setLoading((prev) => ({ ...prev, create: true }));
    setError(null);
    try {
      const created = await createCharacter({
        visual_anchor: visualAnchor,
        must_avoid: mustAvoid,
        negative_prompt: negativePrompt,
      });
      setShowCreateForm(false);
      await loadCharacters();
      setCharacterId(created.characterId);
      setDetail(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像セットの作成に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, create: false }));
    }
  }, [visualAnchor, mustAvoid, negativePrompt, loadCharacters]);

  const saveSpec = useCallback(async () => {
    if (!characterId) return;
    setLoading((prev) => ({ ...prev, spec: true }));
    setError(null);
    try {
      await updateCharacterSpec(characterId, {
        visual_anchor: visualAnchor,
        must_avoid: mustAvoid,
        negative_prompt: negativePrompt,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'プロンプトの保存に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, spec: false }));
    }
  }, [characterId, visualAnchor, mustAvoid, negativePrompt, refresh]);

  const generate = useCallback(async () => {
    if (!characterId) return;
    setLoading((prev) => ({ ...prev, generate: true }));
    setError(null);
    try {
      const parsedSeed = seed.trim() ? Number(seed) : undefined;
      const images = await generateCharacterImages(
        characterId,
        generateCount,
        Number.isFinite(parsedSeed) ? parsedSeed : undefined,
      );
      await refresh();
      if (images.length > 0) {
        setSelectedImageId(images[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像生成に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  }, [characterId, generateCount, seed, refresh]);

  const edit = useCallback(async () => {
    if (!characterId || !selectedImageId || !editInstruction.trim()) return;
    setLoading((prev) => ({ ...prev, edit: true }));
    setError(null);
    try {
      const parsedSeed = seed.trim() ? Number(seed) : undefined;
      const image = await editCharacterImage(
        characterId,
        selectedImageId,
        editInstruction.trim(),
        Number.isFinite(parsedSeed) ? parsedSeed : undefined,
      );
      await refresh();
      setSelectedImageId(image.id);
      setEditInstruction('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像修正に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, edit: false }));
    }
  }, [characterId, selectedImageId, editInstruction, seed, refresh]);

  const stressTest = useCallback(async () => {
    if (!characterId || !selectedImageId) return;
    setLoading((prev) => ({ ...prev, stressTest: true }));
    setError(null);
    try {
      const parsedSeed = seed.trim() ? Number(seed) : undefined;
      const images = await runStressTest(
        characterId,
        selectedImageId,
        Number.isFinite(parsedSeed) ? parsedSeed : undefined,
      );
      await refresh();
      if (images.length > 0) {
        setSelectedImageId(images[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ストレステストに失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, stressTest: false }));
    }
  }, [characterId, selectedImageId, seed, refresh]);

  const adopt = useCallback(async () => {
    if (!characterId || !selectedImageId) return;
    const confirmed = window.confirm(
      '選択中の画像を reference.png として採用します。よろしいですか？',
    );
    if (!confirmed) return;

    setLoading((prev) => ({ ...prev, adopt: true }));
    setError(null);
    try {
      await adoptReferenceImage(characterId, selectedImageId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '採用に失敗しました。');
    } finally {
      setLoading((prev) => ({ ...prev, adopt: false }));
    }
  }, [characterId, selectedImageId, refresh]);

  const selectedImage: GalleryImage | null =
    detail?.gallery.find((img) => img.id === selectedImageId) ??
    (detail?.reference?.id === selectedImageId ? detail.reference : null) ??
    null;

  return {
    characterId,
    characters,
    detail,
    selectedImageId,
    selectedImage,
    visualAnchor,
    setVisualAnchor,
    mustAvoid,
    setMustAvoid,
    negativePrompt,
    setNegativePrompt,
    seed,
    setSeed,
    generateCount,
    setGenerateCount,
    editInstruction,
    setEditInstruction,
    showCreateForm,
    setShowCreateForm,
    startCreate,
    loading,
    isBusy,
    error,
    selectCharacter,
    setSelectedImageId,
    create,
    saveSpec,
    generate,
    edit,
    stressTest,
    adopt,
    clearError: () => setError(null),
  };
}
