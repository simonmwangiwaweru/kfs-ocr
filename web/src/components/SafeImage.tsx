import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  src?: string;
  alt: string;
  className?: string;
  /** Height reserved for the fallback so a missing photo never collapses to a thin strip. */
  fallbackClassName?: string;
  style?: React.CSSProperties;
}

/** An image that degrades to a labelled placeholder instead of the browser's broken-image icon. */
export function SafeImage({ src, alt, className, fallbackClassName, style }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label="Photo unavailable"
        className={clsx('flex min-h-40 w-full flex-col items-center justify-center gap-2 text-slate-400', fallbackClassName)}
      >
        <ImageOff size={26} strokeWidth={1.5} />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} style={style} draggable={false} onError={() => setFailed(true)} />;
}
