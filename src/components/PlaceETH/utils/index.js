import { range } from '~utils'
import { findColorInPalette } from '~utils/colors'
import { getPixelDifferencesCount } from '~utils/imagery'
import leftPad from 'left-pad'
import BigNumber from 'bignumber.js/bignumber'

const BASE_COST = 5e12
const PRICE_CLIMB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]

export const collectChangedPixelBoundaries = (drawSpace, changeLogKeyBoundaries, chunks) => {
  const changes = changeLogKeyBoundaries
    .filter((boundaryKey, i) => !changeLogKeyBoundaries.includes(boundaryKey, i+1))
    .map((boundaryKey) => {
      const [ chunkX, chunkY, boundaryX, boundaryY ] = boundaryKey.split(',').map((s) => parseInt(s, 10))
      const chunkKey = `${chunkX},${chunkY}`
      const chunk = chunks[chunkKey] || { changes: 0 }

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

        const chunkImage = drawSpace[chunkKey] && drawSpace[chunkKey].image
        if (!chunkImage) {
          boundaryData[pixelIndex] = 0
        } else {
          const r = chunkImage.data[pixelIndexBitInChunk]
          const g = chunkImage.data[pixelIndexBitInChunk + 1]
          const b = chunkImage.data[pixelIndexBitInChunk + 2]
  
          boundaryData[pixelIndex] = findColorInPalette(r, g, b)  
        }

        return boundaryData
      }, [])
      
      const boundaryValue = boundaryPixels.map(
        (h) => parseInt(leftPad(parseInt(h, 10).toString('2'), 4, '0'), 2).toString('16')
      ).reverse().join('') // right aligned in binary

      const changeCountBoundary = chunk.changes[boundaryIndex] || 0
      console.log({ changeCountBoundary })
      const pixelsChangedInBoundary = 64 
      const priceForBoundary = pixelsChangedInBoundary * BASE_COST * PRICE_CLIMB[changeCountBoundary]

      return {
        chunkX,
        chunkY,
        ...absBoundaryPos,
        boundaryIndex,
        boundaryValue: new BigNumber(boundaryValue, 16),
        boundaryCost: priceForBoundary
      }
    });
    
  return changes
}
