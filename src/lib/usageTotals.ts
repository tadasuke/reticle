import type { ApiUsage, Message } from '../types/conversation';

export function totalTokensFromUsage(usage: ApiUsage): number {
  return (
    usage.input_tokens +
    usage.output_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

export function sumUsageFromMessages(messages: Message[]): number {
  return messages.reduce((sum, message) => {
    if (!message.usage) return sum;
    return sum + totalTokensFromUsage(message.usage);
  }, 0);
}
