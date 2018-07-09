import { range } from 'utils'
import { getColorComponentsForIndex } from 'utils/colors'
import leftPad from 'left-pad'

export const getPixelsForChunk = async (chunk) => {
  // get all pixels
  //const bytes = await Promise.all(range(256).map(async (byteIndex) => await chunk.pixels.call(byteIndex)))
  const bytes = await chunk.getPixelData.call()

  const chunkPixelBoundaries = []
  bytes.forEach((bigNum) => {
    const longByteString = leftPad(bigNum.toString(2), 255, '0').split('').reverse().join('')
    chunkPixelBoundaries.push(range(64).map(n => {
      const bytePart = longByteString.substring(n * 4, n * 4 + 4).split('').reverse().join('')
      return parseInt(bytePart, 2)
    }))
  })
  
  const image = new ImageData(128, 128)
  let imagePointer = 0

  chunkPixelBoundaries.forEach((boundary, boundaryIndex) => {
    const boundaryPos = {
      x: boundaryIndex % 16,
      y: Math.floor(boundaryIndex / 16),
    }

    const pixelPos = {
      x: boundaryPos.x * 8,
      y: boundaryPos.y * 8,
    }
    
    boundary.forEach((pixel, pixelIndex) => {
      const pixelPosInBounds = {
        x: pixelIndex % 8,
        y: Math.floor(pixelIndex / 8)
      }
      const pixelPosAbs = {
        x: pixelPosInBounds.x + pixelPos.x,
        y: pixelPosInBounds.y + pixelPos.y,
      }
      
      const posIndex = ((pixelPosAbs.x) + 128 * pixelPosAbs.y) * 4
      
      const [r, g, b] = getColorComponentsForIndex(pixel)
      image.data[posIndex] = r
      image.data[posIndex+1] = g
      image.data[posIndex+2] = g
      image.data[posIndex+3] = 255
    })
  })

  return image
}

export const resolveChunksAndPixels = async (instance, contracts) => {
  const chunkCount = (await instance.getChunkCount()).toNumber()
  const chunks = await Promise.all(
    range(chunkCount).map(async (chunkIndex) => {
      const chunkAddress = await instance.chunks(chunkIndex)
      const chunk = await contracts.Chunk.at(chunkAddress)
      const [ x, y ] = (await chunk.position()).map(bigNum => bigNum.toNumber())
      const image = await getPixelsForChunk(chunk)
      const creator = await chunk.creator()

      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.putImageData(image, 0, 0, 0, 0, 128, 128)
    
      return { canvas, chunk, x, y, creator }
    })
  )

  return chunks
}