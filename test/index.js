const PlaceETH = artifacts.require('PlaceETH')
const Chunk = artifacts.require('Chunk')

const leftPad = require('left-pad')
const BigNumber = require('bignumber.js')

const { waitForEvent, generateTestPixelBoundary, increaseTime, logGasUsage } = require('./utils')


const parseTimeBetweenPlacements = (timeBetweenPlacements) => {
  const binaryTimes = timeBetweenPlacements.toString(2)
  const binaryTimesPadded = leftPad(binaryTimes, Math.ceil(binaryTimes.length / 16) * 16, '0')

  const numTimes = binaryTimesPadded.length / 16
  const times = []

  for(let timeIndex = 0; timeIndex < numTimes; timeIndex++) {
    const time = leftPad(binaryTimesPadded.substr(timeIndex * 16, 16), 16, '0')
    times.push((new BigNumber(time, 2)).toString(10))
  }
  return times
}

contract('PlaceETH', (accounts) => {
  it('is able to create new chunks', async () => {
    const placeETH = await PlaceETH.deployed()
    await placeETH.createChunk(0, 0, { from: accounts[0] })
    const { args: { chunk: chunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')
    assert.isDefined(chunkAddress)
    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
    const isCreated = await chunk.created()
    assert(isCreated, 'chunk needs to be "created"')
    const chunkCount = await placeETH.getChunkCount()
    assert.equal(chunkCount.toNumber(), 1)
  })

  it('reverts when trying to create the same chunk again', async () => {
    const placeETH = await PlaceETH.deployed()
    
    try {
      const tx = await placeETH.createChunk(0, 0, { from: accounts[0] })
      assert.fail('expected to throw')
    } catch (err) {
      const revert = err.message.search(/revert/)
      assert.isDefined(revert)
    }
  })

  it('is able to create a new chunk at a different position', async () => {
    const placeETH = await PlaceETH.deployed()
    const { receipt: { gasUsed } } = await placeETH.createChunk(0, -1, { from: accounts[0] })
    logGasUsage(gasUsed, 'PlaceETH', 'createChunk')
    const { args: { chunk: chunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')

    assert.isDefined(chunkAddress)
    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
    await increaseTime(1000 * 60 * 5)
  })

  it('is able to commit a change, with an existing chunk', async () => {
    const placeETH = await PlaceETH.deployed()

    const testPixelHex = generateTestPixelBoundary()
    // chunk 0, 0
    const { receipt: { gasUsed } } = await placeETH.commit([2], [2], [testPixelHex])
    logGasUsage(gasUsed, 'PlaceETH', 'commit')
    const { args: { chunk: chunkAddress, boundaryIndex, boundaryValue, boundaryChanges } } = await waitForEvent(placeETH, 'ChunkUpdated')

    const chunk = await Chunk.at(chunkAddress)
    const position = await chunk.position()
    const [ x, y ] = position.map(bn => bn.toNumber())
    assert.equal(x, 0)
    assert.equal(y, 0)
    assert.equal(boundaryChanges.toNumber(), 1)
    assert.equal(boundaryIndex.toNumber(), 34) // 2, 2 in 1d is index 34
    assert.equal(boundaryValue.toString(16), testPixelHex.toString(16))

    const timeBetweenChanges = await placeETH.timeBetweenPlacements()
    //console.log(parseTimeBetweenPlacements(timeBetweenChanges))

    await increaseTime(1000 * 60 * 5)
  })

  it('is able to commit a change, with a new chunk', async () => {
    const placeETH = await PlaceETH.deployed()

    const testPixelHex = generateTestPixelBoundary()
    // chunk -1, -1
    const { receipt: { gasUsed } } = await placeETH.commit([-20], [-20], [testPixelHex])
    logGasUsage(gasUsed, 'PlaceETH', 'commit')
    const { args: { chunk: createdChunkAddress, boundaryIndex, boundaryValue } } = await waitForEvent(placeETH, 'ChunkUpdated')

    const chunk = await Chunk.at(createdChunkAddress)
    const position = await chunk.position()
    const [ x, y ] = position.map(bn => bn.toNumber())
    assert.strictEqual(x, -2)
    assert.strictEqual(y, -2)
    assert.strictEqual(boundaryIndex.toNumber(), 204) // -20, -20 mod 16 = -12, -12 in 1d is index 204
    assert.strictEqual(boundaryValue.toString(16), testPixelHex.toString(16))

    const timeBetweenChanges = await placeETH.timeBetweenPlacements()
    //console.log(parseTimeBetweenPlacements(timeBetweenChanges))


    await increaseTime(1000 * 60 * 50)
  })

  it('is able to commit a lot of changes, in one chunk', async () => {
    const placeETH = await PlaceETH.deployed()

    const changes = Object.keys(Array(12).fill()).reduce((changeList, boundaryIndex) => {
      const x = boundaryIndex % 16
      const y = Math.floor(boundaryIndex / 16)
      changeList.boundaryX.push(x)
      changeList.boundaryY.push(y)
      changeList.boundaryValues.push(generateTestPixelBoundary())

      return changeList
    }, { boundaryX: [], boundaryY: [], boundaryValues: [] })
    console.log(changes.boundaryX.length)
    await placeETH.commit(changes.boundaryX, changes.boundaryY, changes.boundaryValues, { gas: 0xfffff })
  })

  it('is able to commit a lot of changes, in 4 chunks', async () => {
    const placeETH = await PlaceETH.deployed()

    const txQueue = []

    let amountOfChanges = 0
    let currentGasSum = 0
    while(amountOfChanges < 40) {
      const changes = Object.keys(Array(amountOfChanges++).fill()).reduce((changeList, boundaryIndex) => {
        const x = (((boundaryIndex % 16) + 16) % 16)
        const y = Math.floor(boundaryIndex / 16)
        changeList.boundaryX.push(x)
        changeList.boundaryY.push(y)
        changeList.boundaryValues.push(generateTestPixelBoundary())
  
        return changeList
      }, { boundaryX: [], boundaryY: [], boundaryValues: [] })

      const estimate = await placeETH.commit.estimateGas(changes.boundaryX, changes.boundaryY, changes.boundaryValues, { gas: 0xfffff })

      currentGasSum += estimate

      if (currentGasSum > 1e6) {
        txQueue.push(await placeETH.commit(changes.boundaryX, changes.boundaryY, changes.boundaryValues, { gas: 0xfffff }))
      }
    }
  })

  it('is able to get the pixelcost', async () => {
    const placeETH = await PlaceETH.deployed()
    const averagedGasPrice = (await placeETH.getPixelCost.call()).toNumber()
    // 5 because previous were 5. averaged = 5
    assert.equal(averagedGasPrice, 5);
  })

  it('is able to commit multiple changes to existing chunks', async () => {
    const placeETH = await PlaceETH.deployed()

    const firstPixelSample = generateTestPixelBoundary()
    const secondPixelSample = generateTestPixelBoundary()
    // chunk -1, 0 and 1, 1
    const { receipt: { gasUsed }, logs } = await placeETH.commit([-3, 2], [3, 2], [firstPixelSample, secondPixelSample])
    logGasUsage(gasUsed, 'PlaceETH', 'commit')

    const [ firstChunkUpdate, secondChunkUpdate ] = logs.filter((log) => log.event === 'ChunkUpdated')
    
    assert.isDefined(firstChunkUpdate)
    const firstUpdatedChunk = await Chunk.at(firstChunkUpdate.args.chunk)
    const [ firstX, firstY ] = (await firstUpdatedChunk.position()).map(bn => bn.toNumber())
    const firstBoundaryChanges = await firstUpdatedChunk.changes(firstChunkUpdate.args.boundaryIndex)
    assert.equal(firstChunkUpdate.event, 'ChunkUpdated')
    assert.equal(firstChunkUpdate.args.boundaryValue.toString(16), firstPixelSample.toString(16))
    assert.equal(firstBoundaryChanges.toNumber(), 1)
    assert.equal(firstX, -1)
    assert.equal(firstY, 0)

    assert.isDefined(secondChunkUpdate)
    const secondUpdatedChunk = await Chunk.at(secondChunkUpdate.args.chunk)
    const [ secondX, secondY ] = (await secondUpdatedChunk.position()).map(bn => bn.toNumber())
    const secondBoundaryChanges = await secondUpdatedChunk.changes(secondChunkUpdate.args.boundaryIndex)
    assert.equal(secondChunkUpdate.event, 'ChunkUpdated')
    assert.equal(secondChunkUpdate.args.boundaryValue.toString(16), secondPixelSample.toString(16))
    assert.equal(secondBoundaryChanges.toNumber(), 2)
    assert.equal(secondX, 0)
    assert.equal(secondY, 0)

    const averagedGasPrice = (await placeETH.getPixelCost.call()).toNumber()
    // 20 because previous were 5, 5, 50. averaged = 20
    assert.equal(averagedGasPrice, 20);
  })
})

contract('Chunk', (accounts) => {
  let chunkAddress
  it('is able to access a created chunk', async () => {
    const placeETH = await PlaceETH.deployed()
    const { receipt: { gasUsed } } = await placeETH.createChunk(0, 0, { from: accounts[0] })
    logGasUsage(gasUsed, 'PlaceETH', 'createChunk')
    const { args: { chunk: createdChunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')
    chunkAddress = createdChunkAddress

    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
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
    const testPixelHex = generateTestPixelBoundary()

    const { receipt: { gasUsed } } = await chunk.setPixelBoundary(boundaryIndex, testPixelHex)
    logGasUsage(gasUsed, 'chunk', 'setPixelBoundary')
    byte = await chunk.pixels(boundaryIndex)

    const pixelData = await chunk.getPixelData()
    const pixelBoundary = pixelData[boundaryIndex].toString(16)

    assert.strictEqual(testPixelHex.toString(16), pixelBoundary, `colors at boundary index x: 2, y: 1 doesn't match`)  
  })
})