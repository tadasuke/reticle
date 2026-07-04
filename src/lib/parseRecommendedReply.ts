export type ParsedRecommendedReply = {
  en: string;
  ja: string | null;
};

export function parseRecommendedReply(content: string): ParsedRecommendedReply | null {
  const match = content.match(/【おすすめ返信】\s*\n英:\s*(.+?)\s*\n日:\s*(.+?)(?:\s*\n\s*\n|\s*$)/s);
  if (!match) return null;

  const en = match[1].trim();
  if (!en) return null;

  return {
    en,
    ja: match[2].trim() || null,
  };
}

export function getRecommendedReplyEn(message: {
  content: string;
  recommendedReplyEn?: string;
}): string | null {
  if (message.recommendedReplyEn?.trim()) {
    return message.recommendedReplyEn.trim();
  }
  return parseRecommendedReply(message.content)?.en ?? null;
}
