import React from 'react'
import Dropzone from 'react-dropzone'
import Modal from 'react-modal'
import { HotKeys } from 'react-hotkeys'
import querystring from 'querystring'

import Header from 'components/Header'
import Canvas from 'components/Canvas'
import Toolbar from 'components/Toolbar'
import ToolmodeSelector from 'components/ToolmodeSelector'
import Drawtools from 'components/Drawtools'
import ImageProcess from 'components/ImageProcess'
import AutoMode from 'components/AutoMode'

import ErrorComponent from './Error'
import LoadingComponent from './Loading'

import WithContract from 'WithContract'

import {
  collectChangedPixelBoundaries,
} from './utils'

import {
  range,
  mod,
} from '~utils'

import {
  getMinGasCost,
  getMaxGasCost,
} from '~utils/gascost'

import {
  getBlockGasLimit
} from 'api/contracts'

import {
  composeChunkData,
  watchChunkUpdates,
  watchChunkCreations,
  renderPixelBoundary,
} from 'api/placeeth'

const minCommitCost = getMaxGasCost('PlaceETH', 'commit')
const maxCommitCost = getMaxGasCost('PlaceETH', 'commit') + getMaxGasCost('PlaceETH', 'createChunk')

Modal.setAppElement('#root')

class PlaceETH extends React.Component {
  constructor(props) {
    super(props)

    const urlSearchParam = location.search.substr(1)
    const urlParams = querystring.parse(urlSearchParam)

    this.state = {
      chunksLoaded: [],
      selectedChunk: undefined,
      hoveringChunk: undefined,
      mouseBoundary: { x: 0, y: 0 },
      toolMode: urlParams.toolMode ? urlParams.toolMode : 'move',
      drawOptions: {
        colorIndex: 0,
      },
      changedPixelCount: 0,
      costs: {
        gasCostEstimation: 0,
        changeCostEstimation: 0,
        status: 'display'
      },
      droppedImage: undefined,
      placingImage: undefined,
      commitStatus: undefined,
      commitProgress: 0,
      commitErrors: 0,
      eventLog: [],
      gasPrice: 2,
    }

    this.watchers = []
    this.chunks = {}

    this.handleSelectChunk = this.handleSelectChunk.bind(this)
    this.handleHoverChunk = this.handleHoverChunk.bind(this)
    this.handleHoverBoundary = this.handleHoverBoundary.bind(this)
    this.handleSetToolmode = this.handleSetToolmode.bind(this)

    this.handleSelectColor = this.handleSelectColor.bind(this)
    this.handleUpdateCounts = this.handleUpdateCounts.bind(this)

    this.handleCommitChanges = this.handleCommitChanges.bind(this)
    this.handleRevertChanges = this.handleRevertChanges.bind(this)

    this.handleDropFile = this.handleDropFile.bind(this)
    this.handleCloseModal = this.handleCloseModal.bind(this)

    this.handlePlaceImage = this.handlePlaceImage.bind(this)
    this.handlePlaceOnCanvas = this.handlePlaceOnCanvas.bind(this)

    this.handleChunkUpdate = this.handleChunkUpdate.bind(this)
    this.handleChunkCreation = this.handleChunkCreation.bind(this)

    this.handleGasPriceChange = this.handleGasPriceChange.bind(this)
  }

  componentDidMount() {
    this.startChunkLoader()
    this.startEventWatcher()
  }

  componentWillUnmount() {
    console.log('removing watchers')
    this.watchers.forEach((watcher) => watcher.stopWatching())
  }

  handleGasPriceChange(e) {
    const value = e.target.value

    this.setState({ gasPrice: value })
  }

  async startChunkLoader() {
    const { deployed: { PlaceETH }, contracts: { Chunk } } = this.props
    const chunkCount = (await PlaceETH.getChunkCount()).toNumber()
    range(chunkCount).forEach(async (chunkIndex) => {
      const chunkAddress = await PlaceETH.chunks(chunkIndex)
      console.log(chunkAddress)
      const {
        chunkKey,
        ...chunk
      } = await composeChunkData(chunkAddress, Chunk)
      console.log({ chunkKey, chunk })

      this.chunks[chunkKey] = chunk
      this.canvasRef.renderOnCanvas()
    })
  }

  async startEventWatcher() {
    const { deployed: { PlaceETH }, contracts: { Chunk } } = this.props

    this.watchers.push(watchChunkUpdates(PlaceETH, this.handleChunkUpdate, Chunk))
    this.watchers.push(watchChunkCreations(PlaceETH, this.handleChunkCreation, Chunk))
  }

  async handleChunkUpdate(chunkKey, chunk, boundaryIndex, boundaryValue, event) {
    this.handleChunkCreation(chunkKey, chunk)

    if (this.chunks[chunkKey]) {
      // copy as canvas
      renderPixelBoundary(this.chunks[chunkKey].image, boundaryIndex.toNumber(), boundaryValue)

      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.putImageData(this.chunks[chunkKey].image, 0, 0, 0, 0, 128, 128)

      this.chunks[chunkKey].canvas = canvas
      this.chunks[chunkKey].changes[boundaryIndex.toNumber()]++

      if (this.state.toolMode === 'auto') {
        const boundaryX = mod(boundaryIndex, 16)
        const boundaryY = Math.floor(boundaryIndex / 16)
        this.canvasRef.panTo({ x: this.chunks[chunkKey].x, y: this.chunks[chunkKey].y }, { x: boundaryX, y: boundaryY })
      }
      
      this.canvasRef.renderOnCanvas()


      this.setState({
        eventLog: [...this.state.eventLog.reverse().slice(0, 10).reverse(), event]
      })
    }
  }

  async handleChunkCreation(chunkKey, chunk) {
    if (!this.chunks[chunkKey]) {
      this.chunks[chunkKey] = chunk

      this.setState({ chunksLoaded: [...this.state.chunksLoaded, chunkKey ]})
    }
  }

  handleDropFile(acceptedFiles) {
    const file = acceptedFiles[0]

    this.setState({
      droppedImage: file,
    })
  }

  handlePlaceImage(placingImage) {
    this.setState({
      placingImage,
      toolMode: 'place',
    })

    this.canvasRef.placePosition = { x: -this.canvasRef.canvasOffset.x, y: -this.canvasRef.canvasOffset.y }
  }

  handlePlaceOnCanvas() {
    this.canvasRef.paintPlacingImage(this.state.placingImage)

    this.setState({
      toolMode: 'draw',
      placingImage: undefined,
    })

    this.forceUpdate()
    this.canvasRef.forceUpdate()

    this.canvasRef.renderOnCanvas()
  }

  handleCloseModal() {
    this.setState({ droppedImage: undefined })
  }

  handleSelectChunk(chunk) {
    this.setState({ selectedChunk: chunk })
  }

  handleHoverChunk(chunk) {
    this.setState({ hoveringChunk: chunk })
  }

  handleHoverBoundary(x, y) {
    this.setState({ mouseBoundary: { x, y }})
  }

  handleSetToolmode(toolMode) {
    this.setState({
      toolMode,
      placingImage: undefined // resets placing mode
    })
  }

  handleSelectColor(color) {
    this.setState({
      drawOptions: {
        colorIndex: color,
      },
    })
  }

  async handleUpdateCounts(pixelCount) {
    this.setState({
      changedPixelCount: pixelCount,
      costs: {
        status: 'loading'
      }
    })
    let changes = []
    try {
      changes = collectChangedPixelBoundaries(Object.assign({}, this.canvasRef.drawSpace), this.canvasRef.changedBoundaries, this.chunks)
    } catch (error) {
      console.warn('Could not finish updateCounts, collection of changes failed')
      console.error(error)
      return
    }
    
    const changePrice = changes.reduce((acc, change) => acc + change.boundaryCost, 0)

    let gasSum = 0
    let createdChunks = []
    let changeIndex = 0

    const blockGasLimit = await getBlockGasLimit()

    while(changes.length > 0) {
      let commitGas = 0
      let boundariesX = []
      let boundariesY = []
      let boundaryValues = []
      
      do {
        const change = changes.pop()
  
        boundariesX.push(change.x)
        boundariesY.push(change.y)
        boundaryValues.push(change.boundaryValue)
        const chunkX = Math.floor(change.x / 16)
        const chunkY = Math.floor(change.y / 16)
        const chunkKey = `${chunkX},${chunkY}`

        let gasCost = createdChunks.includes(chunkKey) ? Math.round(minCommitCost) : Math.round(maxCommitCost)

        if (gasCost + commitGas > blockGasLimit) {
          // don't force a change in if it clearly goes over block gas limit.
          changes.push(change)
          break;
        }
        try {
          createdChunks.push(chunkKey)
        } catch (e) {
          commitErrors++
          console.error(e)
        }
  
        commitGas += gasCost
      } while (commitGas < blockGasLimit && changes.length > 0)
      console.log(`batched ${boundariesX.length} changes with ${commitGas} gas`)
      gasSum += commitGas
    }

    this.setState({
      costs: {
        gasCostEstimation: gasSum,
        changeCostEstimation: changePrice,
        status: 'display',
      },
    })
  }

  async handleRevertChanges() {
    await this.canvasRef.clearDrawSpace()
    await this.canvasRef.updateCounts()

    await this.setState({
      commitStatus: undefined,
      commitProgress: 0,
      placingImage: undefined,
      changedPixelCount: 0,
      costs: {
        status: 'display',
      }
    })
  }

  async handleCommitChanges() {
    const changes = collectChangedPixelBoundaries(this.canvasRef.drawSpace, this.canvasRef.changedBoundaries, this.chunks)
    const changesTotal = changes.length

    await this.setState({ commitStatus: 'running', commitProgress: 0, commitErrors: 0 })
    const txOptions = {
      from: this.props.account,
      gas: 7500000,
      gasPrice: this.state.gasPrice * 1e9,
      value: 1e18,
    }

    const txQueue = []

    let gasSum = 0
    let commitErrors = 0
    const createdChunks = Object.keys(this.chunks)

    const blockGasLimit = await getBlockGasLimit()

    while(changes.length > 0) {
      let commitGas = 0
      let boundariesX = []
      let boundariesY = []
      let boundaryValues = []
      let changePrice = 0
      
      do {
        const change = changes.pop()
 
        boundariesX.push(change.x)
        boundariesY.push(change.y)
        boundaryValues.push(change.boundaryValue)
        changePrice += Math.round(change.boundaryCost)
        const chunkX = Math.floor(change.x / 16)
        const chunkY = Math.floor(change.y / 16)
        const chunkKey = `${chunkX},${chunkY}`

        let gasCost = createdChunks.includes(chunkKey) ? Math.round(minCommitCost * 1.5) : Math.round(maxCommitCost * 3)
        if (gasCost + commitGas > blockGasLimit) {
          // don't force a change in if it clearly goes over block gas limit.
          changes.push(change)
          break;
        }
        console.log(createdChunks.includes(chunkKey) ? "chunk was already created, using lower gasprice" : "chunk does not exist, using higher gasprice")
        commitGas += gasCost
        createdChunks.push(chunkKey)
      } while (commitGas < blockGasLimit && changes.length > 0)
      console.log(`batched ${boundariesX.length} changes with ${commitGas} gas with a boundary price of ${changePrice} wei`)
      gasSum += commitGas

      try {
        await this.props.deployed.PlaceETH.commit.call(boundariesX, boundariesY, boundaryValues, { ...txOptions, gas: commitGas, value: changePrice })
        console.log({ boundariesX, boundariesY, boundaryValues, options: { ...txOptions, gas: commitGas, value: 1e17 } })
        txQueue.push(this.props.deployed.PlaceETH.commit(boundariesX, boundariesY, boundaryValues, { ...txOptions, gas: commitGas, value: changePrice }))
      } catch (e) {
        await this.setState({ commitStatus: 'running', commitProgress: 1 - (changes.length / changesTotal), commitErrors: ++commitErrors })
        console.error(e)
      }

      await this.setState({ commitStatus: 'running', commitProgress: 1 - (changes.length / changesTotal) })
    }

    console.log({ gasSum })

    await this.setState({ commitStatus: 'waiting', commitProgress: 1 - (changes.length / changesTotal) })

    await Promise.all(txQueue)

    await this.setState({ toolMode: 'move', commitStatus: undefined, commitProgress: 1 - (changes.length / changesTotal) })

    await this.canvasRef.clearDrawSpace()
    this.canvasRef.updateCounts()
  }

  render() {
    return (
      <HotKeys keyMap={{ 'setAutoMode': 'A' }} handlers={{ setAutoMode: () => this.handleSetToolmode(this.state.toolMode === 'auto' ? 'move' : 'auto') }}>
        <Dropzone
          onDrop={this.handleDropFile}
          disableClick
          style={{position: "relative"}}
        >
          <Modal
            isOpen={!!this.state.droppedImage}
            contentLabel="Preparing your Image"
          >
          <ImageProcess
            file={this.state.droppedImage}
            onRequestClose={this.handleCloseModal}
            onComplete={this.handlePlaceImage}
          /> 
          </Modal>
          <Header
            network={'rinkeby'}
            lastEvent={this.state.eventLog[this.state.eventLog.length - 1]}
          />
          <Canvas
            onSelectChunk={this.handleSelectChunk}
            onHoverChunk={this.handleHoverChunk}
            onHoverBoundary={this.handleHoverBoundary}
            onUpdateCounts={this.handleUpdateCounts}
            hoveringChunk={this.state.hoveringChunk}
            toolMode={this.state.toolMode}
            drawOptions={this.state.drawOptions}
            chunks={this.chunks}
            placingImage={this.state.placingImage}
            badRef={c => this.canvasRef = c}
          />
          <Toolbar
            toolMode={this.state.toolMode}
            selectedChunk={this.state.selectedChunk}
            hoveringChunk={this.state.hoveringChunk}
            mouseBoundary={this.state.mouseBoundary}
            changedPixelCount={this.state.changedPixelCount}
            costs={this.state.costs}
            onCommitChanges={this.handleCommitChanges}
            onRevertChanges={this.handleRevertChanges}
            onPlace={this.handlePlaceOnCanvas}
            commitStatus={this.state.commitStatus}
            commitProgress={this.state.commitProgress}
            commitErrors={this.state.commitErrors}
            gasPrice={this.state.gasPrice}
            onChangeGasPrice={this.handleGasPriceChange}
            onSelectImage={this.handleDropFile}
            setToolmode={this.handleSetToolmode}
          />
          <ToolmodeSelector
            toolMode={this.state.toolMode}
            onSelectToolmode={this.handleSetToolmode}
          />
          <Drawtools open={this.state.toolMode === 'draw'} onSelectColor={this.handleSelectColor} />
          {this.state.toolMode === 'auto' && (
            <AutoMode
              lastEvent={this.state.eventLog[this.state.eventLog.length - 1]}
            />
          )}
        </Dropzone>
      </HotKeys>
    )
  }
}

export default WithContract(['PlaceETH', 'Chunk'], {
  ErrorComponent,
  LoadingComponent,
})(PlaceETH)