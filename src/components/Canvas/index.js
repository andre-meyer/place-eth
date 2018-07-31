import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames/bind'
import normalizeWheel from 'normalize-wheel'

import { clamp, mod } from 'utils'
import { eventToCanvasPos } from './utils/mouse'
import { disablePixelSmoothing, createEmptyChunk } from './utils/canvas'
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
    this.mousePosition = { x: 0, y: 0 }
    this.mousePixel = { x: 0, y: 0 }
    this.mouseChunk = { x: 0, y: 0 }
    this.mouseBoundary = { x: 0, y: 0 }
    this.placePosition = { x: 0, y: 0 }
    this.zoom = 1

    this.prevMousePixel = { x: 0, y: 0 }
    this.prevMouseBoundary = { x: 0, y: 0 }

    this.drawSpace = {}
    this.touchedChunks = []
    this.touchedPixelBoundaries = []
    this.createdChunks = []

    this.mouseIsDown = false;
    this.mouseStartDragPos = undefined

    this.isDragging = false
    this.isDrawing = false
    this.isDraggingImage = false

    this.renderOnCanvas = this.renderOnCanvas.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleClickChunk = this.handleClickChunk.bind(this)
    this.handleZoom = this.handleZoom.bind(this)
    this.handleResize = this.handleResize.bind(this)

    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    
    this.paintPlacingImage = this.paintPlacingImage.bind(this)
  }

  panTo(chunkPos, boundaryPos) {
    const newOffset = {
      x: -(chunkPos.x * 128 + boundaryPos.x * 8) / this.zoom,
      y: -(chunkPos.y * 128 + boundaryPos.y * 8) / this.zoom,
    }

    this.canvasOffset = newOffset
  }

  handleMouseDown(evt) {
    if (this.props.toolMode === 'move' || this.props.toolMode === 'cost') {
      this.isDragging = true
    }
    if (this.props.toolMode === 'draw') {
      this.isDrawing = true
    }
    if (this.props.toolMode === 'place') {
      const [ bbX, bbY, bbXMax, bbYMax ] = [
        this.placePosition.x,
        this.placePosition.y,
        this.placePosition.x + this.props.placingImage.width,
        this.placePosition.y + this.props.placingImage.height,
      ]

      if (this.mousePixel.x <= bbXMax && this.mousePixel.y <= bbYMax && this.mousePixel.x >= bbX && this.mousePixel.y >= bbY) {
        this.isDraggingImage = true
      } else {
        this.isDragging = true
      }
    }
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    this.renderOnCanvas()
  }

  updateCounts() {
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

  }

  handleMouseUp(evt) {
    this.isDragging = false
    this.isDrawing = false
    this.isDraggingImage = false
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    this.updateCounts()

    this.renderOnCanvas()
  }

  handleMouseMove(evt) {
    if (!this.initializedCanvas || !this.ctx || !this.props || !this.props.onSelectChunk) {
      return false
    }

    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mousePosition = mousePosition
    
    // determine mouse pixel (respecting zoom + offset)
    const mousePixel = {
      x: Math.round((mousePosition.x - this.canvasOffset.x - this.viewPort.width/2) / this.zoom) + 64,
      y: Math.round((mousePosition.y - this.canvasOffset.y - this.viewPort.height/2) / this.zoom) + 64,
    }

    // determine mouse position in chunks
    const chunkX = Math.floor(mousePixel.x / 128)
    const chunkY = Math.floor(mousePixel.y / 128)
    
    if (this.mouseChunk.x !== chunkX || this.mouseChunk.y !== chunkY) {
      this.mouseChunk = { x: chunkX, y: chunkY }
      const chunkKey = `${chunkX},${chunkY}`
      let foundChunk = this.props.chunks[chunkKey]
      this.mouseChunk = { x: chunkX, y: chunkY, ...(foundChunk || {}) }

      this.props.onHoverChunk(foundChunk)
    }

    //console.log({mousePixelX, mousePixelY})
    this.mousePixel = mousePixel

    // determine cost to draw at mouse pixel
    if (this.props.toolMode === 'cost') {
      this.mouseBoundary = {
        x: Math.floor(mousePixel.x / 8),
        y: Math.floor(mousePixel.y / 8),
      }

      if (this.mouseBoundary.x !== this.prevMouseBoundary.x || this.mouseBoundary.y !== this.prevMouseBoundary.y) {
        this.props.onHoverBoundary(this.mouseBoundary.x, this.mouseBoundary.y)
      }

      this.prevMouseBoundary = {
        x: this.mouseBoundary.x,
        y: this.mouseBoundary.y,
      }
    }

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
        let source
        if (isExistingChunk) {
          source = new Uint8ClampedArray(this.props.chunks[chunkKey].image.data)
        } else {
          source = createEmptyChunk()
        }

        this.drawSpace[chunkKey] = {
          image: new ImageData(source, 128, 128),
          original: new ImageData(source, 128, 128),
          changeLog: new Uint8ClampedArray(128 * 128),
        }
      }
      const mousePixelInChunk = {
        x: mod(mousePixel.x, 128),
        y: mod(mousePixel.y, 128),
      }
      
      const mousePixelIndexInChunk = (mousePixelInChunk.x + 128 * mousePixelInChunk.y)
      const mousePixelBitIndex = mousePixelIndexInChunk * 4
  
      const { colorIndex } = this.props.drawOptions
      const [r, g, b] = getColorComponentsForIndex(colorIndex)

      // check if different from original
      const noChange = doesColorMatchAtIndex([r, g, b], this.drawSpace[chunkKey].original, mousePixelBitIndex)
      if (!noChange) {
        // renders on screen
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex] = r
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 1] = g
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 2] = b
        this.drawSpace[chunkKey].image.data[mousePixelBitIndex + 3] = 255

        // keeps only changes
        this.drawSpace[chunkKey].changeLog[mousePixelIndexInChunk] = 1
  
        if (!isExistingChunk) {
          this.createdChunks.push(chunkKey)
        } else {
          this.touchedChunks.push(chunkKey)
        }

        const pixelBoundaryKey = `${chunkKey},${mod(Math.floor(mousePixel.x / 8), 16)},${mod(Math.floor(mousePixel.y / 8), 16)}`
        this.touchedPixelBoundaries.push(pixelBoundaryKey)
      }
    }

    // determine where it's placing
    if (this.props.toolMode == 'place') {
      if (this.isDraggingImage) {
        const mouseMovePos = {
          x: this.mouseStartDragPos.x - mousePosition.x,
          y: this.mouseStartDragPos.y - mousePosition.y,
        }
        //const mousePixelX = Math.round((mousePosition.x - this.canvasOffset.x) / this.zoom) + 64
        //const mousePixelY = Math.round((mousePosition.y - this.canvasOffset.y) / this.zoom) + 64
  
        this.placePosition = {
          x: this.placePosition.x - Math.floor(mouseMovePos.x / this.zoom),
          y: this.placePosition.y - Math.floor(mouseMovePos.y / this.zoom)
        }

        this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }
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
    if (this.props.toolMode === 'move' || this.props.toolMode === 'cost') {
      const prevZoom = this.zoom
      const normalized = normalizeWheel(evt)
      const value = normalized.pixelY / 1000
      const zoom = clamp(this.zoom + value, 0.2, 30)
      if (this.zoom !== zoom) {
        this.zoom = zoom
      }
      
      this.canvasOffset.x -= (this.canvasOffset.x + this.viewPort.width/2 - this.mousePosition.x) * (1 - this.zoom / prevZoom)
      this.canvasOffset.y -= (this.canvasOffset.y + this.viewPort.height/2 - this.mousePosition.y) * (1 - this.zoom / prevZoom)
  
  
      this.renderOnCanvas()
    }
  }

  paintPlacingImage(placingImage) {
    const { width, height } = placingImage

    for(let imgX = 0; imgX < width; imgX++) {
      for(let imgY = 0; imgY < height; imgY++) {
        const pixelPosOnCanvas = {
          x: this.placePosition.x + imgX,
          y: this.placePosition.y + imgY
        }

        const chunkX = Math.floor(pixelPosOnCanvas.x / 128)
        const chunkY = Math.floor(pixelPosOnCanvas.y / 128)

        const chunkKey = `${chunkX},${chunkY}`
        //const chunk = this.props.chunks[chunkKey]
        const isExistingChunk = this.props.chunks[chunkKey] && this.props.chunks[chunkKey].image

        if (!this.drawSpace[chunkKey]) {
          let source
          if (isExistingChunk) {
            source = new Uint8ClampedArray(this.props.chunks[chunkKey].image.data)
          } else {
            source = createEmptyChunk()
          }
          
          this.drawSpace[chunkKey] = {
            image: new ImageData(source, 128, 128),
            original: new ImageData(source, 128, 128),
            changeLog: new Uint8ClampedArray(128 * 128),
          }
        }

        const positionInChunk = {
          x: mod(pixelPosOnCanvas.x, 128),
          y: mod(pixelPosOnCanvas.y, 128),
        }

        const imagePixelIndex = imgX + placingImage.width * imgY
        const imagePixelIndexBit = imagePixelIndex * 4

        const positionInChunkIndex = positionInChunk.x + 128 * positionInChunk.y
        const positionInChunkIndexBit = positionInChunkIndex * 4

        const [r, g, b] = [
          placingImage.data[imagePixelIndexBit],
          placingImage.data[imagePixelIndexBit + 1],
          placingImage.data[imagePixelIndexBit + 2],
        ]

        const noChange = doesColorMatchAtIndex([r, g, b], this.drawSpace[chunkKey].original, positionInChunkIndexBit)

        if (!noChange) {
          this.drawSpace[chunkKey].image.data[positionInChunkIndexBit] = r
          this.drawSpace[chunkKey].image.data[positionInChunkIndexBit + 1] = g
          this.drawSpace[chunkKey].image.data[positionInChunkIndexBit + 2] = b

          // keeps only changes
          this.drawSpace[chunkKey].changeLog[positionInChunkIndex] = 1
    
          if (!isExistingChunk) {
            this.createdChunks.push(chunkKey)
          } else {
            this.touchedChunks.push(chunkKey)
          }

          const pixelBoundaryKey = `${chunkKey},${mod(Math.floor(positionInChunk.x / 8), 16)},${mod(Math.floor(positionInChunk.y / 8), 16)}`
          this.touchedPixelBoundaries.push(pixelBoundaryKey)
        }
        
        //const noChange = doesColorMatchAtIndex([r, g, b], this.drawSpace[chunkKey].original, mousePixelBitIndex)
      }
    }

    this.updateCounts()
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

  renderHeatmapForChunk(chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`
    const { changes } = this.props.chunks[chunkKey] || {}

    if (!changes) {
      this.ctx.fillStyle = `rgba(120, 120, 120, 0.3)`
      this.ctx.fillRect((chunkX * 128 - 64), (chunkY * 128 - 64), 128, 128)
    } else {
      for(let x = 0; x < 16; x++) {
        for(let y = 0; y < 16; y++) {
          const boundaryIndex = x + 16 * y

          const max = Math.pow(2, 4)
          const changesAtBoundary = clamp(changes[boundaryIndex], 0, max)//changes[boundaryIndex]

          const factor = (Math.sqrt((max ** 2) - ((changesAtBoundary - max) ** 2)) / max) * 255
          //const factor = changesAtBoundary / (Math.pow(2, 16)) * 255
          const redAmount = clamp(factor, 0, 255)
          const greenAmount = 255 - clamp(factor, 0, 255)
  
          this.ctx.fillStyle = `rgba(${redAmount}, ${greenAmount}, 0, 0.3)`
          this.ctx.fillRect((chunkX * 128 - 64) + x * 8, (chunkY * 128 - 64) + y * 8, 8, 8)
        }
      }  
    }

  }

  renderOnCanvas() {
    if(!this.ctx) return

    if (!this.initializedCanvas) this.initializeCanvas()

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

    const { x: offsetX, y: offsetY } = this.canvasOffset

    if (!this.props.chunks) {
      return
    }

    const chunkCountWidth = Math.ceil(this.canvasSize.width / (128 * this.zoom))
    const chunkCountHeight = Math.ceil(this.canvasSize.height / (128 * this.zoom))
    
    const chunkDrawStartX = -Math.floor((offsetX + this.viewPort.width/2) / (128 * this.zoom))
    const chunkDrawStartY = -Math.floor((offsetY + this.viewPort.height/2) / (128 * this.zoom))

    this.ctx.save()
    this.ctx.translate(offsetX, offsetY)
    this.ctx.translate(this.viewPort.width / 2, this.viewPort.height / 2)
    this.ctx.scale(this.zoom, this.zoom)

    for(let chunkX = chunkDrawStartX - 1; chunkX < chunkDrawStartX + chunkCountWidth + 1; chunkX++) {
      for(let chunkY = chunkDrawStartY - 1; chunkY < chunkDrawStartY + chunkCountHeight + 1; chunkY++) {
        const chunkKey = `${chunkX},${chunkY}`
        const chunk = this.props.chunks[chunkKey]

        const drewChunk = this.drawSpace[chunkKey]
        if (drewChunk) {
          // if a chunk was drawn on already, exchange with "drawn on canvas"
          const drewChunk = this.drawSpace[chunkKey]
    
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d')
          ctx.putImageData(drewChunk.image, 0, 0, 0, 0, 128, 128)

          this.ctx.drawImage(canvas, chunkX * 128 - 64, chunkY * 128 - 64, 128, 128)
        } else if (chunk) {
          // if a chunk exists here, simply display it
            this.ctx.drawImage(chunk.canvas, chunkX * 128 - 64, chunkY * 128 - 64, 128, 128)
        }

        if (this.props.toolMode === 'cost') {
          this.renderHeatmapForChunk(chunkX, chunkY)
        }
      }
    }

    // when importing/placing image, render at offset position
    if (this.props.placingImage) {
      this.ctx.fillStyle = 'rgba(120, 120, 120, 0.8)'

      const width = this.canvasSize.width / this.zoom
      const height = this.canvasSize.height / this.zoom
      this.ctx.fillRect(-(this.canvasOffset.x + this.viewPort.width/2) / this.zoom, -(this.canvasOffset.y + this.viewPort.height/2) / this.zoom, width, height)

      const canvas = document.createElement('canvas')
      canvas.width = this.props.placingImage.width
      canvas.height = this.props.placingImage.height
      const ctx = canvas.getContext('2d')
      ctx.putImageData(this.props.placingImage, 0, 0)

      this.ctx.drawImage(canvas, this.placePosition.x - 64, this.placePosition.y - 64)
    }
    
    //this.ctx.restore()
    
    // when drawing, render pixel at current mouse position
    if (this.props.toolMode === 'draw' && this.mouseChunk) {
      //this.ctx.save()

      //this.ctx.translate(offsetX, offsetY)
      //this.ctx.scale(this.zoom, this.zoom)

      this.ctx.fillStyle = getColorForIndex(this.props.drawOptions.colorIndex)
      //this.ctx.fillRect(Math.floor((this.state.mousePosition.x - offsetX) / this.state.zoom), Math.floor((this.state.mousePosition.y - offsetY) / this.state.zoom), 100, 100)
      this.ctx.fillRect(this.mousePixel.x - 64, this.mousePixel.y - 64, 1, 1)

      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'
      this.ctx.strokeRect(this.mouseChunk.x * 128 - 64, this.mouseChunk.y * 128 - 64, 128, 128)

      //this.ctx.restore()
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
    this.viewPort = {
      width: Math.min(canvasBoundingBox.width, window.innerWidth),
      height: Math.min(canvasBoundingBox.height, window.innerHeight),
    }
    this.canvasBoundingBox = canvasBoundingBox
    this.canvasSize = { width: this.ctx.canvas.width, height: this.ctx.canvas.height }
    this.canvasOffset = { x: 0, y: 0 }
    disablePixelSmoothing(this.canvas)
  }

  render() {
    return (
      <div className={cx('canvasWrapper')}>
        <canvas
          width={window.innerWidth}
          height={window.innerHeight}
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