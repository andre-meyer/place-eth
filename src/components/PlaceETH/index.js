import React from 'react'
import Dropzone from 'react-dropzone'
import Modal from 'react-modal'
import { HotKeys } from 'react-hotkeys'
import querystring from 'querystring'

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
  collectTransactionChanges,
} from './utils'

import {
  range,
  mod,
} from 'utils'

import {
  composeChunkData,
  watchChunkUpdates,
  watchChunkCreations,
  renderPixelBoundary,
} from 'api/placeeth'


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
      changeListCounts: {
        chunkCreations: 0,
        chunkUpdates: 0,
        boundaryChanges: 0,
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

  handleGasPriceChange(e) {
    const value = e.target.value

    this.setState({ gasPrice: value })
  }

  async startChunkLoader() {
    const { deployed: { PlaceETH }, contracts: { Chunk } } = this.props
    const chunkCount = (await PlaceETH.getChunkCount()).toNumber()

    range(chunkCount).forEach(async (chunkIndex) => {
      const chunkAddress = await PlaceETH.chunks(chunkIndex)
      const {
        chunkKey,
        ...chunk
      } = await composeChunkData(chunkAddress, Chunk)

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

  handleUpdateCounts(chunkUpdates, boundaryChanges, chunkCreations) {
    this.setState({
      changeListCounts: {
        chunkCreations,
        chunkUpdates,
        boundaryChanges,
      }
    })
  }

  handleRevertChanges() {
    this.canvasRef.clearDrawSpace()

    this.setState({
      commitStatus: undefined,
      commitProgress: 0,
      placingImage: undefined,
    })
  }

  async handleCommitChanges() {
    const changes = collectTransactionChanges(this.canvasRef.drawSpace, this.canvasRef.touchedPixelBoundaries)
    const changesTotal = changes.length

    await this.setState({ commitStatus: 'running', commitProgress: 0 })
    const txOptions = {
      from: this.props.account,
      gas: 7500000,
      gasPrice: this.state.gasPrice * 1e9,
    }

    const txQueue = []

    let gasSum = 0
    let commitErrors = 0
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
  
        let gasCost = 0
        try {
          gasCost = await this.props.deployed.PlaceETH.commit.estimateGas(boundariesX, boundariesY, boundaryValues, txOptions)
        } catch (e) {
          console.error(e)
        }
  
        commitGas += gasCost
      } while (commitGas < 6e6 && changes.length > 0)
      console.log(`batched ${boundariesX.length} changes with ${commitGas} gas`)
      gasSum += commitGas

      try {
        await this.props.deployed.PlaceETH.commit.call(boundariesX, boundariesY, boundaryValues, { ...txOptions, gas: commitGas })
        txQueue.push(this.props.deployed.PlaceETH.commit(boundariesX, boundariesY, boundaryValues, { ...txOptions, gas: commitGas }))
      } catch (e) {
        await this.setState({ commitStatus: 'running', commitProgress: 1 - (changes.length / changesTotal), commitErrors: ++commitErrors })
        console.error(e)
      }

      await this.setState({ commitStatus: 'running', commitProgress: 1 - (changes.length / changesTotal) })
    }
    console.log({ gasSum })

    await this.setState({ commitStatus: 'waiting', commitProgress: 1 - (changes.length / changesTotal) })

    await Promise.all(txQueue)

    await this.setState({ commitStatus: undefined, commitProgress: 1 - (changes.length / changesTotal) })

    this.canvasRef.clearDrawSpace()
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
            changeListCounts={this.state.changeListCounts}
            onCommitChanges={this.handleCommitChanges}
            onRevertChanges={this.handleRevertChanges}
            onPlace={this.handlePlaceOnCanvas}
            commitStatus={this.state.commitStatus}
            commitProgress={this.state.commitProgress}
            commitErrors={this.state.commitErrors}
            gasPrice={this.state.gasPrice}
            onChangeGasPrice={this.handleGasPriceChange}
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