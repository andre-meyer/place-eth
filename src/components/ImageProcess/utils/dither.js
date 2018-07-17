import { clamp } from 'utils'

const addPixelErrorQuant = (img, pixelIndex, [errorR, errorG, errorB], quant) => {
  const pixelIndexBit = pixelIndex * 4
  if (img[pixelIndexBit]) {
    img[pixelIndexBit] = clamp(img[pixelIndexBit] + errorR * quant, 0, 255)
    img[pixelIndexBit+1] = clamp(img[pixelIndexBit+1] + errorG * quant, 0, 255)
    img[pixelIndexBit+2] = clamp(img[pixelIndexBit+2] + errorB * quant, 0, 255) 
  }
}

// dithering algorithm according to floyd steinberg
export const runDithering = (imgPixelIndex, imageWidth, actual, target, image, strength = 1) => {
  const [targetR, targetG, targetB] = target
  const [actualR, actualG, actualB] = actual
  const error = [actualR - targetR, actualG - targetG, actualB - targetB].map((v) => clamp(v, 0, 255))

  // update adjacent pixels
  addPixelErrorQuant(image, imgPixelIndex + 1, error, (7 / 16) * strength)
  addPixelErrorQuant(image, imgPixelIndex + imageWidth - 1, error, (3 / 16) * strength)
  addPixelErrorQuant(image, imgPixelIndex + imageWidth, error, (5 / 16) * strength)
  addPixelErrorQuant(image, imgPixelIndex + imageWidth + 1, error, (1 / 16) * strength)
}