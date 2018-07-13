const ChunkManager = artifacts.require('ChunkManager')
const Chunk = artifacts.require('Chunk')

const BigNumber = require('bignumber.js')
const leftPad = require('left-pad')

const { waitForEvent } = require('./utils')

contract('Chunk Manager', (accounts) => {
  it('is able to create new chunks', async () => {
    const chunkManager = await ChunkManager.deployed()
    await chunkManager.createChunk(-1, 0, { from: accounts[0] })
    const { args: { chunk: chunkAddress } } = await waitForEvent(chunkManager, 'ChunkCreated')
    assert.isDefined(chunkAddress)
    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
    const isCreated = await chunk.created()
    assert(isCreated, 'chunk needs to be "created"')
    const chunkCount = await chunkManager.getChunkCount()
    assert.equal(chunkCount.toNumber(), 1)
  })

  it('reverts when trying to create the same chunk again', async () => {
    const chunkManager = await ChunkManager.deployed()
    
    try {
      const tx = await chunkManager.createChunk(-1, 0, { from: accounts[0] })
      assert.fail('expected to throw')
    } catch (err) {
      const revert = err.message.search(/revert/)
      assert.isDefined(revert)
    }
  })

  it('is able to create a new chunk at a different position', async () => {
    const chunkManager = await ChunkManager.deployed()
    await chunkManager.createChunk(0, -1, { from: accounts[0] })
    const { args: { chunk: chunkAddress } } = await waitForEvent(chunkManager, 'ChunkCreated')
    assert.isDefined(chunkAddress)
    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
  })
})

contract('Chunk', (accounts) => {
  let chunkAddress
  it('is able to access a created chunk', async () => {
    const chunkManager = await ChunkManager.deployed()
    const estimatedCost = await chunkManager.createChunk.estimateGas(0, 0, { from: accounts[0] })
    console.log(`    [GAS ESTIMATION]: 'chunkManager.createChunk' ${estimatedCost} GAS`)
    await chunkManager.createChunk(0, 0, { from: accounts[0] })
    const { args: { chunk: createdChunkAddress } } = await waitForEvent(chunkManager, 'ChunkCreated')
    chunkAddress = createdChunkAddress

    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
  })

  it('is able to set a pixel', async () => {
    const chunk = await Chunk.at(chunkAddress)
    const desiredX = 100
    const desiredY = 100
    const desiredC = 11

    const estimatedCost = await chunk.setPixel.estimateGas(desiredX, desiredY, desiredC, { from: accounts[0] })
    console.log(`    [GAS ESTIMATION]: 'chunk.setPixel' ${estimatedCost} GAS`)
    await chunk.setPixel(desiredX, desiredY, desiredC, { from: accounts[0] })
    const readPixelColor = (await chunk.getPixel.call(desiredX, desiredY)).toNumber()
    assert.strictEqual(readPixelColor, desiredC)
  })

  it('is unable to set a pixel out of bounds', async () => {
    const desiredX = 300
    const desiredY = 300
    const desiredC = 11
    
    try {
      await chunk.setPixel(desiredX, desiredY, desiredC, { from: accounts[0] })
      assert.fail('expected to throw')
    } catch (err) {
      const revert = err.message.search(/revert/)
      assert.isDefined(revert)
    }
  })

  it('is able to set a pixelboundary', async () => {
    const chunk = await Chunk.at(chunkAddress)
    
    const boundaryIndex = 18 // boundary at 2, 1

    // all color indexes from our palette right now
    const colors = Object.keys(Array(16).fill())
    // 64 pixels = 256bit => one full pixel boundary
    const pixelColors = [...colors, ...colors, ...colors, ...colors]
    
    // this block is responsible for building a "pixel boundary" of rotating colors from the 16 colors available
    // in the current palette. it starts by taking each index (0 - 15) and converting the number to binary, left padding
    // the value to be a 4-bit value (important when concatinating). lastly it flips the whole array
    // to make the "start" be at the top left position inside the boundary
    const pixelsInHex = pixelColors.map(
      (h) => parseInt(leftPad(parseInt(h, 10).toString('2'), 4, '0'), 2).toString('16')
    ).reverse().join('') // right aligned in binary

    const estimatedCost = await chunk.setPixelBoundary.estimateGas(boundaryIndex, `0x${pixelsInHex}`)
    console.log(`    [GAS ESTIMATION]: 'chunk.setPixelBoundary' ${estimatedCost} GAS`)
    await chunk.setPixelBoundary(boundaryIndex, `0x${pixelsInHex}`)
    byte = await chunk.pixels(boundaryIndex)

    const pixelData = await chunk.getPixelData()
    const pixelBoundary = pixelData[boundaryIndex].toString(16)

    assert.strictEqual(pixelsInHex, pixelBoundary, `colors at boundary index x: 2, y: 1 doesn't match`)  
  })
})