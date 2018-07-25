import { range } from 'utils'
import { findColorInPalette } from 'utils/colors'
import leftPad from 'left-pad'
import BigNumber from 'bignumber.js'

export const collectTransactionChanges = (drawSpace, changeLogKeyBoundaries) => {
  const changes = changeLogKeyBoundaries.map((boundaryKey) => {
    const [ chunkX, chunkY, boundaryX, boundaryY ] = boundaryKey.split(',').map((s) => parseInt(s, 10))
    const chunkKey = `${chunkX},${chunkY}`

    const absBoundaryPos = {
      x: chunkX * 16 + boundaryX,
      y: chunkY * 16 + boundaryY
    }

    const boundaryInChunk = {
      x: boundaryX % 16,
      y: boundaryY % 16,
    }
    const boundaryIndex = boundaryInChunk.x + 16 * boundaryInChunk.y
    
    const boundaryPixels = range(8**2).reduce((boundaryData, pixelIndexString) => {
      const pixelIndex = parseInt(pixelIndexString, 10)
      const inBoundaryX = pixelIndex % 8
      const inBoundaryY = Math.floor(pixelIndex / 8) % 8

      const absPixelPosition = {
        x: (boundaryInChunk.x * 8) + inBoundaryX,
        y: (boundaryInChunk.y * 8) + inBoundaryY,
      }

      const pixelIndexInChunk = absPixelPosition.x + 128 * absPixelPosition.y
      const pixelIndexBitInChunk = pixelIndexInChunk * 4

      const r = drawSpace[chunkKey].image.data[pixelIndexBitInChunk]
      const g = drawSpace[chunkKey].image.data[pixelIndexBitInChunk + 1]
      const b = drawSpace[chunkKey].image.data[pixelIndexBitInChunk + 2]

      boundaryData[pixelIndex] = findColorInPalette(r, g, b)

      return boundaryData
    }, [])

    const boundaryValue = boundaryPixels.map(
      (h) => parseInt(leftPad(parseInt(h, 10).toString('2'), 4, '0'), 2).toString('16')
    ).reverse().join('') // right aligned in binary

    return {
      ...absBoundaryPos,
      boundaryIndex,
      boundaryValue: new BigNumber(boundaryValue, 16),
    }
  });
  
  return changes
}