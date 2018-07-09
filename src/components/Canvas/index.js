import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames/bind'
import normalizeWheel from 'normalize-wheel'

import WithContract from 'WithContract'

import { clamp } from './utils/math'
import { eventToCanvasPos } from './utils/mouse'

import { getColorForIndex } from 'utils/colors'

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

    this.mouseIsDown = false;
    this.mouseStartDragPos = undefined

    this.attach = this.attach.bind(this)
    this.renderOnCanvas = this.renderOnCanvas.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleClickChunk = this.handleClickChunk.bind(this)
    this.handleZoom = this.handleZoom.bind(this)

    this.handleDragStart = this.handleDragStart.bind(this)
    this.handleDragStop = this.handleDragStop.bind(this)
    
    
  }

  attach(c) {
    this.canvas = c
  }

  handleDragStart(evt) {
    this.isDragging = true
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    this.renderOnCanvas()
  }

  handleDragStop(evt) {
    this.isDragging = false
    
    const mousePosition = eventToCanvasPos(evt, this.ctx)
    this.mouseStartDragPos = { x: mousePosition.x, y: mousePosition.y }

    this.renderOnCanvas()
  }

  handleMouseMove(evt) {
    if (!this.ctx || !this.props || !this.props.onSelectChunk) {
      return false
    }

    const mousePosition = eventToCanvasPos(evt, this.ctx)

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
    
    // determine mouse position over chunk
    const chunkSize = 128 * this.zoom
    const chunkX = Math.floor((mousePosition.x - this.canvasOffset.x - chunkSize / 2) / chunkSize)
    const chunkY = Math.floor((mousePosition.y - this.canvasOffset.y - chunkSize / 2) / chunkSize)

    if (this.mouseChunk.x !== chunkX || this.mouseChunk.y !== chunkY) {
      this.mouseChunk = { x: chunkX, y: chunkY }
      let foundChunk = undefined
      this.props.chunks.forEach((chunk) => {
        if (chunk.x === chunkX && chunk.y === chunkY) {
          foundChunk = chunk
          return false
        }
      })

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
    this.renderOnCanvas()
  }

  handleClickChunk(evt) {
    if (!this.ctx || !this.props || !this.props.onSelectChunk) {
      return false
    }

    const { x: chunkX, y: chunkY } = this.mouseChunk
    let foundChunk = undefined
    this.props.chunks.forEach((chunk) => {
      if (chunk.x === chunkX && chunk.y === chunkY) {
        foundChunk = chunk
        return false
      }
    })
    console.log({foundChunk})

    this.props.onSelectChunk(foundChunk)
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

    // render all the chunks
    this.props.chunks.forEach((chunk) => {
      this.ctx.save()
      this.ctx.translate(offsetX, offsetY)
      this.ctx.scale(this.zoom, this.zoom)

      this.ctx.drawImage(chunk.canvas, chunk.x * 128 - 64, chunk.y * 128 - 64)

      this.ctx.restore()
    })

    // when drawing, render pixel at current mouse position
    if (this.props.toolMode === 'draw' && this.mouseChunk) {
      this.ctx.save()

      this.ctx.translate(offsetX, offsetY)
      this.ctx.scale(this.zoom, this.zoom)

      this.ctx.fillStyle = getColorForIndex(this.props.drawOptions.colorIndex)
      //this.ctx.fillRect(Math.floor((this.state.mousePosition.x - offsetX) / this.state.zoom), Math.floor((this.state.mousePosition.y - offsetY) / this.state.zoom), 100, 100)
      this.ctx.fillRect(this.mousePixel.x - 64, this.mousePixel.y - 64, 1, 1)

      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'
      this.ctx.strokeRect(this.mouseChunk.x * 128 + 64, this.mouseChunk.y * 128 + 64, 128, 128)

      this.ctx.restore()
    }

    this.ctx.restore()
  }

  componentDidMount() {
    this.ctx = this.canvas.getContext('2d')
    this.ctx['imageSmoothingEnabled'] = false;       /* standard */
    this.ctx['mozImageSmoothingEnabled'] = false;    /* Firefox */
    this.ctx['oImageSmoothingEnabled'] = false;      /* Opera */
    this.ctx['webkitImageSmoothingEnabled'] = false; /* Safari */
    this.ctx['msImageSmoothingEnabled'] = false;     /* IE */
  }

  initializeCanvas() {
    this.initializedCanvas = true

    const viewPortBoundingBox = this.ctx.canvas.getBoundingClientRect()
    this.viewPort = { width: viewPortBoundingBox.width, height: viewPortBoundingBox.height }
    this.canvasSize = { width: this.ctx.canvas.width, height: this.ctx.canvas.height }
  }

  render() {
    if(this.ctx) this.renderOnCanvas()

    return (
      <div className={cx('canvasWrapper')}>
        <canvas
          width={3000}
          height={3000}
          ref={this.attach}
          className={cx(
            'canvas',
            this.props.toolMode,
            { isDragging: this.isDragging }
          )}
          onMouseMove={this.handleMouseMove}
          onMouseDown={this.handleDragStart}
          onMouseUp={this.handleDragStop}
          onMouseLeave={this.handleDragStop}
          onBlur={this.handleDragStop}
          onWheel={this.handleZoom}
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