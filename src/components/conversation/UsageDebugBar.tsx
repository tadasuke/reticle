import type { ApiUsage } from '../../types/conversation';

type UsageDebugBarProps = {
  usage: ApiUsage;
};

function formatUsage(usage: ApiUsage): string {
  const parts = [`in: ${usage.input_tokens}`, `out: ${usage.output_tokens}`];

  if (usage.cache_creation_input_tokens != null) {
    parts.push(`cache_create: ${usage.cache_creation_input_tokens}`);
  }
  if (usage.cache_read_input_tokens != null) {
    parts.push(`cache_read: ${usage.cache_read_input_tokens}`);
  }

  return parts.join(' / ');
}

export function UsageDebugBar({ usage }: UsageDebugBarProps) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <p className="font-mono text-[10px] leading-tight text-gray-400">
      <span className="font-semibold text-gray-500">usage</span> {formatUsage(usage)}
    </p>
  );
}
