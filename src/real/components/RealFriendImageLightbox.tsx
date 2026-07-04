import { useEffect } from 'react';
import { getMediaUrl } from '../../lib/apiClient';

type RealFriendImageLightboxProps = {
  open: boolean;
  label: string;
  avatarUrl: string | null;
  onClose: () => void;
};

export function RealFriendImageLightbox({
  open,
  label,
  avatarUrl,
  onClose,
}: RealFriendImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !avatarUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="拡大表示を閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label}のプロフィール画像`}
        className="relative max-h-[90vh] max-w-lg"
      >
        <img
          src={getMediaUrl(avatarUrl)}
          alt={label}
          className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow hover:bg-gray-50"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
