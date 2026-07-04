import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
};

type MessageContentProps = {
  content: string;
  isUser: boolean;
};

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <>{content}</>;
  }

  return <Markdown components={markdownComponents}>{content}</Markdown>;
}
