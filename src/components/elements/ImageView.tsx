import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { ImageElement } from '@/types/doc';

export function ImageView({ el }: { el: ImageElement }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === el.src) {
    return (
      <div
        role="img"
        aria-label={el.alt || 'Image could not be shown'}
        className="flex h-full w-full items-center justify-center bg-cream-100 text-muted-foreground"
        style={{ borderRadius: el.radius }}
      >
        <ImageOff size={24} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={el.src}
      alt={el.alt}
      draggable={false}
      onError={() => setFailedSrc(el.src)}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: el.fit,
        borderRadius: Math.min(el.radius, Math.min(el.width, el.height) / 2),
        opacity: el.opacity,
      }}
    />
  );
}
