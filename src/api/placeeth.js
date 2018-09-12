import { range } from '~utils'
import { getColorComponentsForIndex } from '~utils/colors'
import leftPad from 'left-pad'

export const renderPixelBoundary = (chunkCanvas, boundaryIndex, bnBoundaryValue) => {
  const longByteString = leftPad(bnBoundaryValue.toString(2), 255, '0').split('').reverse().join('')
  const boundaryValues = range(64).map(n => {
    const bytePart = longByteString.substring(n * 4, n * 4 + 4).split('').reverse().join('')
    return parseInt(bytePart, 2)
  })

  const boundaryPos = {
    x: boundaryIndex % 16,
    y: Math.floor(boundaryIndex / 16),
  }

  const pixelPos = {
    x: boundaryPos.x * 8,
    y: boundaryPos.y * 8,
  }
  
  boundaryValues.forEach((pixel, pixelIndex) => {
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
    chunkCanvas.data[posIndex] = r
    chunkCanvas.data[posIndex+1] = g
    chunkCanvas.data[posIndex+2] = b
    chunkCanvas.data[posIndex+3] = 255
  })
}

export const renderPixelsForChunk = async (chunk) => {
  const boundaryValues = await chunk.getPixelData.call()

  const image = new ImageData(128, 128)
  boundaryValues.forEach((boundaryValue, boundaryIndex) => renderPixelBoundary(image, boundaryIndex, boundaryValue))

  return image
}

export const composeChunkData = async (chunkAddress, Chunk) => {
  const chunk = await Chunk.at(chunkAddress)
  const [ x, y ] = (await chunk.position()).map(bigNum => bigNum.toNumber())
  const chunkKey = `${x},${y}`
  
  const image = await renderPixelsForChunk(chunk)
  const creator = await chunk.creator()
  const changes = (await chunk.getPixelChanges()).map(bn => bn.toNumber())

  // copy as canvas
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.putImageData(image, 0, 0, 0, 0, 128, 128)

  return { image, canvas, chunk, x, y, creator, changes, chunkKey }
}

export const resolveChunksAndPixels = async (instance, Chunk) => {
  const chunkCount = (await instance.getChunkCount()).toNumber()
  const chunks = {}

  await Promise.all(
    range(chunkCount).map(async (chunkIndex) => {
      const chunkAddress = await instance.chunks(chunkIndex)

      const {
        chunkKey,
        ...chunk
      } = await composeChunkData(chunkAddress, Chunk)
      chunks[chunkKey] = chunk
    })
  )

  return chunks
}

export const watchChunkUpdates = (instance, onChunkUpdate, Chunk) => {
  const watcher = instance.ChunkUpdated('pending')

  return watcher.watch(async (err, res) => {
    if (err) {
      console.warn('ChunkUpdate Event:', err.toString())
      return
    }

    const {
      chunk: chunkAddress,
      boundaryIndex,
      boundaryValue,
    } = res.args
    
    const {
      chunkKey,
      ...chunk
    } = await composeChunkData(chunkAddress, Chunk)
    
    onChunkUpdate(chunkKey, chunk, boundaryIndex, boundaryValue, res)
  })

}

export const watchChunkCreations = (instance, onChunkCreation, Chunk) => {
  const watcher = instance.ChunkCreated('pending')

  return watcher.watch(async (err, res) => {
    if (err) {
      console.warn('ChunkUpdate Event:', err.toString())
      return
    }

    const {
      chunk: chunkAddress
    } = res.args
    
    const {
      chunkKey,
      ...chunk
    } = await composeChunkData(chunkAddress, Chunk)
    
    onChunkCreation(chunkKey, chunk)
  })
}