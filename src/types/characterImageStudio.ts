export type ImageKind = 'candidate' | 'stress-test' | 'reference';

export type GalleryImage = {
  id: string;
  kind: ImageKind;
  filename: string;
  url: string;
  model: string;
  prompt: string;
  created_at: string;
  seed?: number;
  parent_id?: string;
  scene_id?: string;
  scene_label?: string;
  instruction?: string;
  adopted_at?: string;
};

export type CharacterSpec = {
  visual_anchor: string;
  must_avoid: string;
  negative_prompt: string;
};

export type CharacterListItem = {
  characterId: string;
  hasReference: boolean;
  candidateCount: number;
};

export type CharacterDetail = {
  characterId: string;
  spec: CharacterSpec;
  reference: GalleryImage | null;
  gallery: GalleryImage[];
};

export type CharacterCreateInput = {
  visual_anchor: string;
  must_avoid: string;
  negative_prompt: string;
};

export type StudioLoadingState = {
  create: boolean;
  spec: boolean;
  generate: boolean;
  edit: boolean;
  stressTest: boolean;
  adopt: boolean;
};
