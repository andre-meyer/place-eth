import React from 'react'
import Dropzone from 'react-dropzone'
import Modal from 'react-modal'

import Canvas from 'components/Canvas'
import Toolbar from 'components/Toolbar'
import ToolmodeSelector from 'components/ToolmodeSelector'
import Drawtools from 'components/Drawtools'
import ImageProcess from 'components/ImageProcess'

import WithContract from 'WithContract'

import {
  collectTransactionChanges,
} from './utils'

import {
  resolveChunksAndPixels,
} from 'api/placeeth'

Modal.setAppElement('#root')

class PlaceETH extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedChunk: undefined,
      hoveringChunk: undefined,
      mouseBoundary: { x: 0, y: 0 },
      toolMode: 'move',
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
    }

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
  }

  handlePlaceOnCanvas() {
    this.canvasRef.paintPlacingImage()
    this.setState({
      toolMode: 'draw',
      placingImage: undefined,
    })
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

  async handleCommitChanges() {
    const changes = collectTransactionChanges(this.canvasRef.drawSpace, this.canvasRef.state.boundariesChanged)
    console.log(changes.length)
    const txQueue = []

    let boundariesX = []
    let boundariesY = []
    let boundaryValues = []

    let consecutiveGas = 0

    changes.forEach((change) => {
      boundariesX.push(change.x)
      boundariesY.push(change.y)
      boundaryValues.push(change.boundaryValue)

      if (boundariesX.length > 100) {
        txQueue.push(this.props.deployed.PlaceETH.commit(boundariesX, boundariesY, boundaryValues, { from: this.props.account, gas: 0xfffff }))
        boundariesX = []
        boundariesY = []
        boundaryValues = []
      }
    })

    if (boundariesX.length > 0) {
      txQueue.push(this.props.deployed.PlaceETH.commit(boundariesX, boundariesY, boundaryValues, { from: this.props.account, gas: 0xfffff }))
    }

    const tx = await Promise.all(txQueue)

    consecutiveGas = tx.reduce((acc, txEntry) => acc + txEntry.receipt.gasUsed, 0)
    console.log({ consecutiveGas })

    this.canvasRef.clearDrawSpace()
  }

  handleRevertChanges() {
    this.canvasRef.clearDrawSpace()
  }

  render() {
    return (
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
          chunks={this.props.chunks}
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
        />
        <ToolmodeSelector
          onSelectToolmode={this.handleSetToolmode}
        />
        <Drawtools open={this.state.toolMode === 'draw'} onSelectColor={this.handleSelectColor} />
      </Dropzone>
    )
  }
}

export default WithContract(['PlaceETH', 'Chunk'], {
  mapContractInstancesToProps: async (contractName, instance, props) => {

    if (contractName === 'PlaceETH') {
      return {
        chunks: await resolveChunksAndPixels(instance, props.contracts)
      }
    }
  }
})(PlaceETH)