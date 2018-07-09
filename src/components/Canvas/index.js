import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames/bind'
import normalizeWheel from 'normalize-wheel'

import WithContract from 'WithContract'

import { clamp } from './utils/math'
import { eventToCanvasPos } from './utils/mouse'
import { disablePixelSmoothing } from './utils/canvas'

import { getColorForIndex, getColorComponentsForIndex} from 'utils/colors'

import {
  resolveChunksAndPixels,
} from 'api/placeeth'

import style from './index.css'
const cx = classnames.bind(style)

class Canvas extends React.Component {
  constructor(props) {
    super(props)

    this.canvasOffset = { x: 0, y: 0 }
    this.mousePixel = { x: 0, y: 0 }
    this.mouseChunk = { x: 0, y: 0 }
    this.zoom = 1

    this.prevMousePixel = { x: 0, y: 0 }

    this.drawSpace = {}

    this.mouseIsDown = false;
    this.mouseStartDragPos = undefined

    this.renderOnCanvas = this.renderOnCanvas.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleClickChunk = this.handleClickChunk.bind(this)
    this.handleZoom = this.handleZoom.bind(this)

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
    //console.log(chunkX, chunkY)
    if (this.mouseChunk.x !== chunkX || this.mouseChunk.y !== chunkY) {
      this.mouseChunk = { x: chunkX, y: chunkY }
      let foundChunk = undefined
      this.props.chunks.forEach((chunk) => {
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
      if (!this.drawSpace[chunkKey]) {
        const source = this.mouseChunk.image ? this.mouseChunk.image.data : (new Uint8ClampedArray(128 * 128 * 4).fill(255))
        console.log(source)
        this.drawSpace[chunkKey] = new ImageData(source, 128, 128)
      }
      const mousePixelInChunk = {
        x: mousePixel.x % 128,
        y: mousePixel.y % 128,
      }
      
      const mousePixelIndexInChunk = (mousePixelInChunk.x + 128 * mousePixelInChunk.y) * 4
  
      const { colorIndex } = this.props.drawOptions
      //console.log(mousePixelInChunk, colorIndex)
      const [r, g, b] = getColorComponentsForIndex(colorIndex)
      this.drawSpace[chunkKey].data[mousePixelIndexInChunk] = r
      this.drawSpace[chunkKey].data[mousePixelIndexInChunk + 1] = g
      this.drawSpace[chunkKey].data[mousePixelIndexInChunk + 2] = b
      this.drawSpace[chunkKey].data[mousePixelIndexInChunk + 3] = 255
      
    }

    this.prevMousePixel = this.mousePixel

    this.renderOnCanvas()
  }

  handleClickChunk(evt) {
    if (!this.ctx) {
      return
    }
  }

  handleZoom(evt) {
    evt.preventDefault()

    const normalized = normalizeWheel(evt)
    const value = normalized.pixelY / 1000
    const zoom = clamp(this.zoom + value, 0.2, 30)
    if (this.zoom !== zoom) {
      this.zoom = zoom
    }

    this.renderOnCanvas()
  }

  renderOnCanvas() {
    if (!this.initializedCanvas) this.initializeCanvas()

    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

    const { x: offsetX, y: offsetY } = this.canvasOffset

    if (!this.props.chunks) {
      return
    }
    
    this.ctx.save()

    this.ctx.save()
    this.ctx.translate(offsetX, offsetY)
    this.ctx.scale(this.zoom, this.zoom)
    // render all the chunks
    this.props.chunks.forEach((chunk) => {

      const chunkKey = `${chunk.x},${chunk.y}`
      if (!this.drawSpace[chunkKey]) {
        this.ctx.drawImage(chunk.canvas, chunk.x * 128 - 64, chunk.y * 128 - 64)
      }

    })

    Object.keys(this.drawSpace).forEach((chunkKey) => {
      const drewChunk = this.drawSpace[chunkKey]
      const [ x, y ] = chunkKey.split(',').map(i => parseInt(i, 10))

      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.putImageData(drewChunk, 0, 0, 0, 0, 128, 128)

      this.ctx.drawImage(canvas, x * 128 - 64, y * 128 - 64)
    })
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
  }

  initializeCanvas() {
    this.initializedCanvas = true

    const viewPortBoundingBox = this.ctx.canvas.getBoundingClientRect()
    this.viewPort = { width: viewPortBoundingBox.width, height: viewPortBoundingBox.height }
    this.canvasSize = { width: this.ctx.canvas.width, height: this.ctx.canvas.height }
    
    // todo: implement min/max with window bb
    this.canvasOffset = { x: this.viewPort.width / 2, y: this.viewPort.height / 2 }
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
          onWheel={this.handleZoom}
        />
        <canvas
          width={3000}
          height={3000}
          ref={c => this.drawCanvas = c}
          className={cx(
            'canvas', 'drawCanvas'
          )}
        />
      </div>
    )
  }
}

Canvas.propTypes = {
  chunks: PropTypes.arrayOf(
    PropTypes.shape({
      data: PropTypes.instanceOf(ImageData),
    }),
  ),
}

Canvas.defaultProps = {
  chunks: [],
}

export default WithContract(['ChunkManager', 'Chunk'], {
  onError: console.error,
  mapContractInstancesToProps: async (contractName, instance, props) => {

    if (contractName === 'ChunkManager') {
      return {
        chunks: await resolveChunksAndPixels(instance, props.contracts)
      }
    }
  }
})(Canvas)