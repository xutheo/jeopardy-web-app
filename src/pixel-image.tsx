import React, { useEffect, useRef, useState } from 'react';

// Downsample first, then enlarge without smoothing: genuine square pixels,
// rather than a blur that can leave identifying details visible.
export function PixelImage({ src, elapsedMs, revealed }: { src: string; elapsedMs: number; revealed: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const stage = revealed ? 6 : Math.min(6, Math.floor(elapsedMs / 5000));
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvas.current) return;
      const target = canvas.current;
      target.width = image.naturalWidth;
      target.height = image.naturalHeight;
      const ctx = target.getContext('2d');
      if (!ctx) { setFailed(true); return; }
      ctx.clearRect(0, 0, target.width, target.height);
      if (stage === 6) { ctx.drawImage(image, 0, 0); return; }
      const small = document.createElement('canvas');
      const scale = Math.min(1, [8, 12, 18, 27, 40, 60][stage] / Math.max(target.width, target.height));
      small.width = Math.max(1, Math.round(target.width * scale));
      small.height = Math.max(1, Math.round(target.height * scale));
      const buffer = small.getContext('2d');
      if (!buffer) { setFailed(true); return; }
      buffer.drawImage(image, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, target.width, target.height);
    };
    image.onerror = () => { if (!cancelled) setFailed(true); };
    image.src = src;
    return () => { cancelled = true; };
  }, [src, stage]);
  return failed ? <p role="alert">Unable to display the Pixel Perfect image.</p> : <canvas ref={canvas} className="clue-image pixel-image" role="img" aria-label={stage === 6 ? 'Pixel Perfect image fully revealed' : 'Pixel Perfect image — identify the pixelated picture'} data-pixel-stage={stage}/>;
}
