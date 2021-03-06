export const disablePixelSmoothing = (canvas) => {
  const ctx = canvas.getContext('2d')
  ctx['imageSmoothingEnabled'] = false;       /* standard */
  ctx['mozImageSmoothingEnabled'] = false;    /* Firefox */
  ctx['oImageSmoothingEnabled'] = false;      /* Opera */
  ctx['webkitImageSmoothingEnabled'] = false; /* Safari */
  ctx['msImageSmoothingEnabled'] = false;     /* IE */
}

export const createEmptyChunk = () => new Uint8ClampedArray(128 * 128 * 4).fill(255)
