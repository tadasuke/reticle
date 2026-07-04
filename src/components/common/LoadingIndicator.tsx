type LoadingIndicatorProps = {
  label?: string;
};

export function LoadingIndicator({ label = '考え中...' }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      <span>{label}</span>
    </div>
  );
}
