/* globals web3 */
const PlaceETH = artifacts.require('PlaceETH')
const Chunk = artifacts.require('Chunk')

const BigNumber = require('bignumber.js')

const priceLogger = require('../utils/logger')

const { assertRevert } = require('openzeppelin-solidity/test/helpers/assertRevert')

const waitForEvent = require('../../utils/truffle/waitForEvent')
const { generateTestPixelBoundary } = require('../../utils/imagery')

contract('PlaceETH', ([owner, anyone]) => {
  it('has the correct owner', async () => {
    const placeETH = await PlaceETH.deployed()
    const contractOwner = await placeETH.owner.call()

    assert.strictEqual(contractOwner, owner, "owner must match")
  })
  it('is able to create new chunks', async () => {
    const placeETH = await PlaceETH.deployed()
    await placeETH.createChunk(0, 0, { from: owner })
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
    
    await assertRevert(placeETH.createChunk(0, 0, { from: owner }))
  })

  it('is able to create a new chunk at a different position', async () => {
    const placeETH = await PlaceETH.deployed()
    const tx = await placeETH.createChunk(0, -1, { from: owner })
    const { receipt: { gasUsed } } = tx
    priceLogger.addEntry('PlaceETH', 'createChunk', gasUsed)
    
    const { args: { chunk: chunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')

    assert.isDefined(chunkAddress)
    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
  })

  it('is able to commit a change, with an existing chunk', async () => {
    const placeETH = await PlaceETH.deployed()

    const testPixelHex = generateTestPixelBoundary()
    // chunk 0, 0
    const { receipt: { gasUsed } } = await placeETH.commit([2], [2], [testPixelHex], { value: 1e18 })
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)

    const { args: { chunk: chunkAddress, boundaryIndex, boundaryValue, boundaryChanges } } = await waitForEvent(placeETH, 'ChunkUpdated')

    const chunk = await Chunk.at(chunkAddress)
    const position = await chunk.position()
    const [ x, y ] = position.map(bn => bn.toNumber())
    assert.equal(x, 0)
    assert.equal(y, 0)
    assert.equal(boundaryChanges.toNumber(), 1)
    assert.equal(boundaryIndex.toNumber(), 34) // 2, 2 in 1d is index 34
    assert.equal(boundaryValue.toString(16), testPixelHex.toString(16))
  })

  it('is able to commit a change, with a new chunk', async () => {
    const placeETH = await PlaceETH.deployed()

    const testPixelHex = generateTestPixelBoundary()
    // chunk -1, -1
    const { receipt: { gasUsed } } = await placeETH.commit([-20], [-20], [testPixelHex], { value: 1e18 })
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)
    const { args: { chunk: createdChunkAddress, boundaryIndex, boundaryValue } } = await waitForEvent(placeETH, 'ChunkUpdated')

    const chunk = await Chunk.at(createdChunkAddress)
    const position = await chunk.position()
    const [ x, y ] = position.map(bn => bn.toNumber())
    assert.strictEqual(x, -2)
    assert.strictEqual(y, -2)
    assert.strictEqual(boundaryIndex.toNumber(), 204) // -20, -20 mod 16 = -12, -12 in 1d is index 204
    assert.strictEqual(boundaryValue.toString(16), testPixelHex.toString(16))
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
    
    await placeETH.commit(changes.boundaryX, changes.boundaryY, changes.boundaryValues, { gas: 7e6, value: 1e18 })
  })
  
  it('is able to commit multiple changes to existing chunks', async () => {
    const placeETH = await PlaceETH.deployed()

    const firstPixelSample = generateTestPixelBoundary()
    const secondPixelSample = generateTestPixelBoundary()

    // chunk -1, 0 and 1, 1
    const tx = await placeETH.commit([-3, 2], [3, 2], [firstPixelSample, secondPixelSample], { value: 1e18 })
    const { receipt: { gasUsed }, logs } = tx
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)
    
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
  })

  it('pays the charity and the owner according to factors', async () => {
    const placeETH = await PlaceETH.deployed()
    const charity = (await placeETH.charity.call())

    // filled with color "f"
    const fullPixelBoundary = (new BigNumber(2)).pow(255).sub(1)
    const fullPixelCostOnFirstChange = 64 * 5e12
    const prevBalanceOwner = (await web3.eth.getBalance(owner)).toNumber()
    const prevBalanceCharity = (await web3.eth.getBalance(charity)).toNumber()

    const changeCost = fullPixelCostOnFirstChange * 2
    
    const tx = await placeETH.commit([3, -2], [4, -2], [fullPixelBoundary, fullPixelBoundary], { gasPrice: 0, value: changeCost, from: anyone })
    const { receipt: { gasUsed } } = tx
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)
    const newBalanceOwner = (await web3.eth.getBalance(owner)).toNumber()
    const newBalanceCharity = (await web3.eth.getBalance(charity)).toNumber()

    
    const profitOwner = newBalanceOwner - prevBalanceOwner
    const profitCharity = newBalanceCharity - prevBalanceCharity
    const factorCharity = (await placeETH.factorCharity()).toNumber()
    const factorOwner = (await placeETH.factorOwner()).toNumber()
    
    // should've gotten balance on `owner` and to `charity`
    assert.equal(profitOwner, changeCost * factorOwner / 100, 'doesn\'t pay the right amount for owner')
    assert.equal(profitCharity, changeCost * factorCharity / 100, 'doesn\'t pay the right amount for charity')
  })

  it('requires eth depending on amount of changed pixels', async () => {
    const placeETH = await PlaceETH.deployed()

    // filled with color "f"
    const pixelsChanged = 13
    const fullPixel = generateTestPixelBoundary(13)
    const fullPixelCostOnFirstChange = pixelsChanged * 5e12

    const tx = await placeETH.commit([-3], [-2], [fullPixel], { gasPrice: 0, value: fullPixelCostOnFirstChange, from: anyone })
    const { receipt: { gasUsed } } = tx
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)

    assert.isDefined(tx)
  })

  it('reverts when too little eth is paid to change pixels', async () => {
    const placeETH = await PlaceETH.deployed()

    // filled with color "f"
    const pixelsChanged = 13
    const fullPixel = generateTestPixelBoundary(13)
    const fullPixelCostOnFirstChange = pixelsChanged * 5e12 // 5e12 is base price for unchanged chunks

    const wrongChangePrice = fullPixelCostOnFirstChange - 1 // deduct 1 wei and it should fail

    await assertRevert(placeETH.commit([-4], [-7], [fullPixel], { gasPrice: 0, value: wrongChangePrice, from: anyone }))

    const fixedPrice = wrongChangePrice + 1

    await placeETH.commit([-5], [-7], [fullPixel], { gasPrice: 0, value: fixedPrice, from: owner })
  })

  it('returns overpaid ether', async() => {
    const placeETH = await PlaceETH.deployed()

    // filled with color "f"
    const pixelsChanged = 10
    const fullPixel = generateTestPixelBoundary(pixelsChanged)
    const fullPixelCostOnFirstChange = pixelsChanged * 5e12 // 5e12 is base price for unchanged chunks

    // if this amount is not *actually* deducted from our balance, it must work
    const extraWei = 1e12

    const prevBalanceOwner = await web3.eth.getBalance(anyone)
    const tx = await placeETH.commit([-4], [-6], [fullPixel], { gasPrice: 0, value: fullPixelCostOnFirstChange + extraWei, from: anyone })
    const { receipt: { gasUsed } } = tx
    
    priceLogger.addEntry('PlaceETH', 'commit', gasUsed)
    const newBalanceOwner = await web3.eth.getBalance(anyone)

    const actualCost = prevBalanceOwner.sub(newBalanceOwner)
    assert.equal(actualCost, fullPixelCostOnFirstChange)
  })
})
