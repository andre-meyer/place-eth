import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames/bind'
import normalizeWheel from 'normalize-wheel'

import { clamp } from 'utils'
import { eventToCanvasPos } from './utils/mouse'
import { disablePixelSmoothing } from './utils/canvas'
import { doesColorMatchAtIndex } from './utils/image'

import { getColorForIndex, getColorComponentsForIndex} from 'utils/colors'

import style from './index.css'
const cx = classnames.bind(style)

class Canvas extends React.Component {
  constructor(props) {
    super(props)

    if (props.badRef) {
      props.badRef(this)
    }

    this.state = {
      changeList: {
        boundariesChanged: [],
        chunksChanged: [],
        chunksCreated: [],
      }
    }

    this.canvasOffset = { x: 0, y: 0 }
    this.mousePixel = { x: 0, y: 0 }
    this.mouseChunk = { x: 0, y: 0 }
    this.zoom = 1

    this.prevMousePixel = { x: 0, y: 0 }

    this.drawSpace = {}
    this.touchedChunks = []
    this.touchedPixelBoundaries = []
    this.createdChunks = []

    this.mouseIsDown = false;
    this.mouseStartDragPos = undefined

    this.renderOnCanvas = this.renderOnCanvas.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleClickChunk = this.handleClickChunk.bind(this)
    this.handleZoom = this.handleZoom.bind(this)
    this.handleResize = this.handleResize.bind(this)

    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
  }

  handleMouseDown(evt) {
    if (this.props.toolMode === 'move') {
      this.isDragging = true
    }
    if (this.props.toolMode === 'draw') {
      this.isDrawing = true
    }
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    this.renderOnCanvas()
  }

  handleMouseUp(evt) {
    this.isDragging = false
    this.isDrawing = false
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    if (this.touchedChunks.length || this.touchedPixelBoundaries.length || this.touchedChunks.length) {
      let chunksChanged = [...this.state.changeList.chunksChanged, ...this.touchedChunks]
      let boundariesChanged = [...this.state.changeList.boundariesChanged, ...this.touchedPixelBoundaries]
      let chunksCreated = [...this.state.changeList.chunksCreated, ...this.createdChunks]
      // remove duplicates
      chunksChanged = chunksChanged.filter((chunkKey, index) => !chunksChanged.includes(chunkKey, index+1))
      boundariesChanged = boundariesChanged.filter((boundaryPos, index) => !boundariesChanged.includes(boundaryPos, index+1))
      chunksCreated = chunksCreated.filter((chunkKey, index) => !chunksCreated.includes(chunkKey, index+1))

      this.setState({
        chunksChanged,
        boundariesChanged,
        chunksCreated,
      })

      this.props.onUpdateCounts(chunksChanged.length, boundariesChanged.length, chunksCreated.length)
    }

    this.renderOnCanvas()
  }

  handleMouseMove(evt) {
    if (!this.ctx || !this.props || !this.props.onSelectChunk) {
      return false
    }

    const mousePosition = eventToCanvasPos(evt, this.ctx)
    
    // determine mouse position over chunk
    const chunkSize = 128 * this.zoom
    const chunkX = Math.floor((mousePosition.x - this.canvasOffset.x + chunkSize / 2) / chunkSize)
    const chunkY = Math.floor((mousePosition.y - this.canvasOffset.y + chunkSize / 2) / chunkSize)
    
    if (this.mouseChunk.x !== chunkX || this.mouseChunk.y !== chunkY) {
      this.mouseChunk = { x: chunkX, y: chunkY }
      let foundChunk = undefined
      Object.keys(this.props.chunks).forEach((chunkKey) => {
        const chunk = this.props.chunks[chunkKey]
        if (chunk.x === chunkX && chunk.y === chunkY) {
          foundChunk = chunk
          return false
        }
      })
      //console.log(foundChunk)
      this.mouseChunk = { x: chunkX, y: chunkY, ...(foundChunk || {}) }

      this.props.onHoverChunk(foundChunk)
    }

    // determine mouse pixel
    const mousePixelX = Math.round((mousePosition.x - this.canvasOffset.x) / this.zoom) + 64
    const mousePixelY = Math.round((mousePosition.y - this.canvasOffset.y) / this.zoom) + 64

    const mousePixel = {
      x: mousePixelX,
      y: mousePixelY,
    }

    this.mousePixel = mousePixel

    // determine dragging offset
    if (this.isDragging && this.mouseStartDragPos) {
      const mouseMovePos = {
        x: this.mouseStartDragPos.x - mousePosition.x,
        y: this.mouseStartDragPos.y - mousePosition.y,
      }

      this.canvasOffset = {
        x: this.canvasOffset.x - Math.floor(mouseMovePos.x),
        y: this.canvasOffset.y - Math.floor(mouseMovePos.y)
      }
      
      this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }
    }

    // determine where it's drawing
    if (this.isDrawing && ((this.mousePixel.x !== this.prevMousePixel.x) || (this.mousePixel.y !== this.prevMousePixel.y))) {
      const chunkKey = `${chunkX},${chunkY}`
      const isExistingChunk = !!this.mouseChunk.image

      if (!this.drawSpace[chunkKey]) {
        const source = isExistingChunk ? this.mouseChunk.image.data : (new Uint8ClampedArray(128 * 128 * 4).fill(255))
        this.drawSpace[chunkKey] = {
          image: new ImageData(source, 128, 128),
          original: new ImageData(source, 128, 128),
          changeLog: source,
        }
      }
      const mousePixelInChunk = {
        x: mousePixel.x % 128,
        y: mousePixel.y % 128,
      }
      
      const mousePixelIndexInChunk = (mousePixelInChunk.x + 128 * mousePixelInChunk.y)
      const mousePixelBitIndex = mousePixelIndexInChunk * 4
  
      const { colorIndex } = this.props.drawOptions
      const [r, g, b] = getColorComponentsForIndex(colorIndex)

      // check if different from original
      const noChange = doesColorMatchAtIndex([r, g, b], this.drawSpace[chunkKey].original, mousePixelBitIndex)
      if (!noChange) {
        if (this.drawSpace[chunkKey].original[mousePixelBitIndex])
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex] = r
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 1] = g
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 2] = b
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 3] = 255
  
        if (!isExistingChunk) {
          this.createdChunks.push(chunkKey)
        }

        this.touchedChunks.push(chunkKey)

        const pixelBoundaryKey = `${chunkKey},${mousePixel.x % 8},${Math.floor(mousePixel.y / 8)}`
        this.touchedPixelBoundaries.push(pixelBoundaryKey)
      }
    }

    this.prevMousePixel = this.mousePixel

    this.renderOnCanvas()
  }

  handleClickChunk(evt) {
    if (!this.ctx) {
      return
    }
  }

  handleResize() {
    this.initializeCanvas()
  }

  handleZoom(evt) {
    const normalized = normalizeWheel(evt)
    const value = normalized.pixelY / 1000
    const zoom = clamp(this.zoom + value, 0.2, 30)
    if (this.zoom !== zoom) {
      this.zoom = zoom
    }

    this.renderOnCanvas()
  }

  clearDrawSpace() {
    this.drawSpace = {}
    this.touchedChunks = []
    this.touchedPixelBoundaries = []
    this.createdChunks = []

    this.setState({
      chunksChanged: 0,
      boundariesChanged: 0,
      chunksCreated: 0,
    })

    this.props.onUpdateCounts(0, 0, 0)
  }

  renderOnCanvas() {
    if (!this.initializedCanvas) this.initializeCanvas()

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

    const { x: offsetX, y: offsetY } = this.canvasOffset

    if (!this.props.chunks) {
      return
    }
    
    const chunkCountWidth = Math.ceil(this.canvasSize.width / (128 * this.zoom))
    const chunkCountHeight = Math.ceil(this.canvasSize.height / (128 * this.zoom))
    
    const chunkDrawStartX = -Math.floor(offsetX / (128 * this.zoom))
    const chunkDrawStartY = -Math.floor(offsetY / (128 * this.zoom))

    this.ctx.save()
    this.ctx.translate(offsetX, offsetY)
    this.ctx.scale(this.zoom, this.zoom)
    
    for(let chunkX = chunkDrawStartX - 1; chunkX < chunkDrawStartX + chunkCountWidth + 1; chunkX++) {
      for(let chunkY = chunkDrawStartY - 1; chunkY < chunkDrawStartY + chunkCountHeight + 1; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`

        const drewChunk = this.drawSpace[chunkKey]
        if (drewChunk) {
          // if a chunk was drawn on already, exchange with "drawn on canvas"
          const drewChunk = this.drawSpace[chunkKey]
    
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d')
          ctx.putImageData(drewChunk.image, 0, 0, 0, 0, 128, 128)
    
          this.ctx.drawImage(canvas, chunkX * 128 - 64, chunkY * 128 - 64)
        } else {
          // otherwise, simply display the one we loaded
          const chunk = this.props.chunks[chunkKey]

          if (chunk) {
            this.ctx.drawImage(chunk.canvas, chunkX * 128 - 64, chunkY * 128 - 64)
          }
        }
      }
    }

    this.ctx.restore()
    
    // when drawing, render pixel at current mouse position
    if (this.props.toolMode === 'draw' && this.mouseChunk) {
      this.ctx.save()

      this.ctx.translate(offsetX, offsetY)
      this.ctx.scale(this.zoom, this.zoom)

      this.ctx.fillStyle = getColorForIndex(this.props.drawOptions.colorIndex)
      //this.ctx.fillRect(Math.floor((this.state.mousePosition.x - offsetX) / this.state.zoom), Math.floor((this.state.mousePosition.y - offsetY) / this.state.zoom), 100, 100)
      this.ctx.fillRect(this.mousePixel.x - 64, this.mousePixel.y - 64, 1, 1)

      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'
      this.ctx.strokeRect(this.mouseChunk.x * 128 - 64, this.mouseChunk.y * 128 - 64, 128, 128)

      this.ctx.restore()
    }

    this.ctx.restore()
  }

  componentDidMount() {
    this.ctx = this.canvas.getContext('2d')

    window.addEventListener('resize', this.handleResize)
    window.addEventListener('wheel', this.handleZoom, { passive: true, capture: true })
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('wheel', this.handleZoom)
  }

  initializeCanvas() {
    this.initializedCanvas = true

    const canvasBoundingBox = this.ctx.canvas.getBoundingClientRect()
    const viewPortBoundingBox = {
      width: Math.min(canvasBoundingBox.width, window.innerWidth),
      height: Math.min(canvasBoundingBox.height, window.innerHeight),
    }
    this.viewPort = { width: viewPortBoundingBox.width, height: viewPortBoundingBox.height }
    this.canvasBoundingBox = canvasBoundingBox
    this.canvasSize = { width: this.ctx.canvas.width, height: this.ctx.canvas.height }
    this.canvasOffset = { x: this.viewPort.width, y: this.viewPort.height }
    disablePixelSmoothing(this.canvas)
  }

  render() {
    if(this.ctx) this.renderOnCanvas()

    return (
      <div className={cx('canvasWrapper')}>
        <canvas
          width={3000}
          height={3000}
          ref={c => this.canvas = c}
          className={cx(
            'canvas',
            this.props.toolMode,
            { isDragging: this.isDragging }
          )}
          onMouseMove={this.handleMouseMove}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onMouseLeave={this.handleDragStop}
          onBlur={this.handleDragStop}
        />
      </div>
    )
  }
}

Canvas.propTypes = {
  chunks: PropTypes.objectOf(
    PropTypes.shape({
      data: PropTypes.instanceOf(ImageData),
    }),
  ),
}

Canvas.defaultProps = {
  chunks: {},
}

export default Canvas