type TotalUsageBadgeProps = {
  totalTokens: number;
};

export function TotalUsageBadge({ totalTokens }: TotalUsageBadgeProps) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <p className="font-mono text-xs text-gray-500">
      <span className="font-semibold text-gray-600">usage total</span>{' '}
      {totalTokens.toLocaleString()}
    </p>
  );
}
