const MIN_TYPING_MS = 1600;
const MAX_TYPING_MS = 10000;
const MS_PER_CHAR = 50;

/** 返答の文字数に応じた「書き込み中」表示時間（ミリ秒） */
export function calculateTypingDelay(content: string): number {
  const charCount = content.trim().length;
  const delay = 1200 + charCount * MS_PER_CHAR;
  return Math.min(Math.max(delay, MIN_TYPING_MS), MAX_TYPING_MS);
}
