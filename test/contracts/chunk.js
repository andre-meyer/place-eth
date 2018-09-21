/* globals web3 */
const PlaceETH = artifacts.require('PlaceETH')
const Chunk = artifacts.require('Chunk')

const priceLogger = require('../utils/logger')

const { assertRevert } = require('openzeppelin-solidity/test/helpers/assertRevert')


const waitForEvent = require('../../utils/truffle/waitForEvent')
const { generateTestPixelBoundary } = require('../../utils/imagery')

contract('Chunk', ([owner, anyone]) => {
  let chunkAddress
  it('is able to access a created chunk', async () => {
    const placeETH = await PlaceETH.deployed()
    const { receipt: { gasUsed } } = await placeETH.createChunk(0, 0, { from: owner })
    priceLogger.addEntry('PlaceETH', 'createChunk', gasUsed)
    const { args: { chunk: createdChunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')
    chunkAddress = createdChunkAddress

    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)
  })

  it('allows only the owner to change pixels', async () => {
    const placeETH = await PlaceETH.deployed()
    await placeETH.createChunk(1, 0, { from: owner })
    const { args: { chunk: createdChunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')
    chunkAddress = createdChunkAddress

    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)

    await assertRevert(chunk.setPixelBoundary(0, generateTestPixelBoundary(), { from: anyone }))
  })

  it('allows only to be created once, by the manager', async () => {
    const placeETH = await PlaceETH.deployed()
    await placeETH.createChunk(-1, 0, { from: owner })
    const { args: { chunk: createdChunkAddress } } = await waitForEvent(placeETH, 'ChunkCreated')
    chunkAddress = createdChunkAddress

    const chunk = await Chunk.at(chunkAddress)
    assert.isDefined(chunk)

    // only the "manager contract" can spawn
    await assertRevert(chunk.spawn(0, 0, anyone, { from: anyone }))

    // only once it can be spawned
    await assertRevert(chunk.spawn(0, 0, placeETH.address, { from: owner }))
  })
})
