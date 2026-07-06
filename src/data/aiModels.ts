import type { AiModelId } from '../types/conversation';

export type AiModel = {
  id: AiModelId;
  label: string;
  description: string;
};

export const aiModels: AiModel[] = [
  {
    id: 'qwen',
    label: 'Qwen',
    description: 'Alibaba Cloud の Qwen（qwen3.7-plus）',
  },
  {
    id: 'claude',
    label: 'Claude',
    description: 'Anthropic の Claude Sonnet',
  },
];

export const DEFAULT_AI_MODEL: AiModelId = 'qwen';
