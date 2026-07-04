import type { BuddySupportType } from '../types/conversation';

export type BuddySupportTypeOption = {
  id: BuddySupportType;
  label: string;
  description: string;
  emptyMessage: string;
};

export const BUDDY_SUPPORT_TYPES: BuddySupportTypeOption[] = [
  {
    id: 'high',
    label: 'High',
    description: '自分の英語を添削 + フレンドのメッセージに即サポート',
    emptyMessage: '英語を送ると添削が届き、フレンドの返答には訳と返答例も教えてくれます。困ったら日本語で相談もできます',
  },
  {
    id: 'middle',
    label: 'Middle',
    description: '自分の英語を自動添削',
    emptyMessage: '英語を送ると感想やアドバイスが届きます。困ったら日本語で相談もできます',
  },
  {
    id: 'low',
    label: 'Low',
    description: '自動サポートなし',
    emptyMessage: '困ったら日本語で相談してください',
  },
];

export const DEFAULT_BUDDY_SUPPORT_TYPE: BuddySupportType = 'middle';

export function getBuddySupportTypeOption(id: BuddySupportType): BuddySupportTypeOption {
  return BUDDY_SUPPORT_TYPES.find((option) => option.id === id) ?? BUDDY_SUPPORT_TYPES[1];
}
