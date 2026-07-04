import { getMediaUrl } from '../../lib/apiClient';

type RealFriendAvatarProps = {
  label: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md';
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs ring-1',
  md: 'h-12 w-12 text-sm ring-2',
} as const;

export function RealFriendAvatar({ label, avatarUrl, size = 'md' }: RealFriendAvatarProps) {
  const imageUrl = avatarUrl ? getMediaUrl(avatarUrl) : null;
  const initial = label.slice(0, 1).toUpperCase() || '?';

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-blue-100 ring-blue-200 ${sizeClasses[size]}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="h-full w-full object-cover object-top" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold text-blue-700">
          {initial}
        </div>
      )}
    </div>
  );
}
