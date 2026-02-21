import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getPublicUrl } from '../../api/mediaApi';

export interface MediaItem {
  fileKey: string;
  fileName: string;
  fileType: string;
}

interface MediaGalleryProps {
  media: Array<MediaItem>;
  showLightbox?: boolean;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  media,
  showLightbox = true,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    if (showLightbox) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % media.length);
    }
  };

  const goToPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
    }
  };

  const renderMedia = (item: MediaItem, index: number, className: string) => {
    const isImage = item.fileType.startsWith('image/');
    const isVideo = item.fileType.startsWith('video/');
    const fileUrl = getPublicUrl(item.fileKey);

    if (isImage) {
      return (
        <img
          src={fileUrl}
          alt={item.fileName}
          className={className}
          onClick={() => openLightbox(index)}
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={fileUrl}
          controls
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return null;
  };

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={`grid gap-2 ${
          media.length === 1
            ? 'grid-cols-1'
            : media.length === 2
            ? 'grid-cols-2'
            : media.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        {media.map((item, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square"
          >
            {renderMedia(
              item,
              index,
              'w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity'
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {showLightbox && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>

          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-4 text-white hover:text-gray-300 text-4xl"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 text-white hover:text-gray-300 text-4xl"
              >
                ›
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            {renderMedia(
              media[lightboxIndex],
              lightboxIndex,
              'max-w-full max-h-[90vh] object-contain'
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  );
};
