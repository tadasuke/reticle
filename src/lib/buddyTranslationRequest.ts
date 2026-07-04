import type { Message } from '../types/conversation';

const TRANSLATION_REQUEST_PATTERNS = [
  /翻訳/,
  /訳して/,
  /日本語訳/,
  /日本語にして/,
  /どういう意味/,
  /何て言っ/,
  /何を言っ/,
  /意味を?(教え|説明)/,
  /日本語で?(教え|言って)/,
];

export function isBuddyTranslationRequest(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return TRANSLATION_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getLastAiFriendMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.channel === 'friend' && message.speaker === 'friend') {
      return message;
    }
  }
  return null;
}
