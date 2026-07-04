import { getImageUrl } from '../../lib/adminApiClient';
import type { GalleryImage } from '../../types/characterImageStudio';

type ImageGalleryProps = {
  gallery: GalleryImage[];
  reference: GalleryImage | null;
  selectedImageId: string | null;
  onSelect: (imageId: string) => void;
  selectedImage: GalleryImage | null;
};

const kindLabels: Record<GalleryImage['kind'], string> = {
  candidate: '候補',
  'stress-test': 'Stress（同一人物チェック）',
  reference: 'Reference（採用画像）',
};

const kindStyles: Record<GalleryImage['kind'], string> = {
  candidate: 'bg-blue-100 text-blue-800',
  'stress-test': 'bg-amber-100 text-amber-800',
  reference: 'bg-emerald-100 text-emerald-800',
};

export function ImageGallery({
  gallery,
  reference,
  selectedImageId,
  onSelect,
  selectedImage,
}: ImageGalleryProps) {
  const allImages = reference ? [reference, ...gallery] : gallery;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {allImages.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            まだ画像がありません。左のパネルから候補を生成してください。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {allImages.map((image) => {
              const isSelected = image.id === selectedImageId;
              return (
                <button
                  key={`${image.kind}-${image.id}`}
                  type="button"
                  onClick={() => onSelect(image.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="relative aspect-[3/4] bg-gray-100">
                    <img
                      src={getImageUrl(image.url)}
                      alt={image.id}
                      className="h-full w-full object-cover"
                    />
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-medium ${kindStyles[image.kind]}`}
                    >
                      {kindLabels[image.kind]}
                    </span>
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="truncate text-xs font-medium text-gray-900">{image.id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(image.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">選択中の画像</h3>
          <dl className="space-y-2 text-xs text-gray-600">
            <div>
              <dt className="font-medium text-gray-500">ID</dt>
              <dd className="break-all">{selectedImage.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">種別</dt>
              <dd>{kindLabels[selectedImage.kind]}</dd>
            </div>
            {selectedImage.scene_label && (
              <div>
                <dt className="font-medium text-gray-500">シーン</dt>
                <dd>{selectedImage.scene_label}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-500">モデル（使用 AI）</dt>
              <dd>{selectedImage.model}</dd>
            </div>
            {selectedImage.seed != null && (
              <div>
                <dt className="font-medium text-gray-500">seed</dt>
                <dd>{selectedImage.seed}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-gray-500">プロンプト（生成指示文）</dt>
              <dd className="max-h-24 overflow-y-auto whitespace-pre-wrap">{selectedImage.prompt}</dd>
            </div>
            {selectedImage.instruction && (
              <div>
                <dt className="font-medium text-gray-500">修正指示</dt>
                <dd className="whitespace-pre-wrap">{selectedImage.instruction}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
