import { getImageUrl } from '../../lib/adminApiClient';
import type { GalleryImage } from '../../types/characterImageStudio';

type ReferencePreviewProps = {
  reference: GalleryImage | null;
};

export function ReferencePreview({ reference }: ReferencePreviewProps) {
  if (!reference) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
        採用済み reference（採用画像）はまだありません
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        採用済み reference（採用画像）
      </p>
      <img
        src={getImageUrl(reference.url)}
        alt="Adopted reference"
        className="mx-auto max-h-48 w-full rounded-lg object-cover"
      />
      {reference.adopted_at && (
        <p className="mt-2 text-xs text-emerald-700">
          採用日時: {new Date(reference.adopted_at).toLocaleString('ja-JP')}
        </p>
      )}
    </div>
  );
}
