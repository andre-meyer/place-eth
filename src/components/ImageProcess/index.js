import React from 'react'
import styles from './index.css'
import classnames from 'classnames/bind'

import { findColorInPalette, getColorComponentsForIndex } from 'utils/colors'

import { disablePixelSmoothing } from '../Canvas/utils/canvas'
import { runDithering } from './utils/dither';
const cx = classnames.bind(styles)

class ImageProcess extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      targetSize: 128,
      ditherStrength: 0,
    }

    // start by removing preview from react-dropzone to prevent memory leak
    URL.revokeObjectURL(props.file.preview)

    this.image = undefined
    this.canvas = undefined
    this.ctx = undefined

    this.handleChangeTargetSize = this.handleChangeTargetSize.bind(this)
    this.handleChangeDitherStrength = this.handleChangeDitherStrength.bind(this)
    this.handleApply = this.handleApply.bind(this)
    this.handlePlace = this.handlePlace.bind(this)
  }
  
  prepareImage(img) {
    const imgCanvas = document.createElement('canvas')

    const { width, height } = img
    const ratio = width / height
    const targetWidth = this.state.targetSize
    const targetHeight = this.state.targetSize / ratio


    imgCanvas.width = targetWidth
    imgCanvas.height = targetHeight

    const imgCtx = imgCanvas.getContext('2d')
    imgCtx.drawImage(img, 0, 0, targetWidth, targetHeight)

    const { data } = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height)
    const filteredImage = new ImageData(imgCanvas.width, imgCanvas.height)
    const imageDataLength = imgCanvas.width * imgCanvas.height;

    for(let imgPixelIndex = 0; imgPixelIndex < imageDataLength; imgPixelIndex++) {
      const imgPixelBitIndex = imgPixelIndex * 4
      const actualPixel = [
        data[imgPixelBitIndex],
        data[imgPixelBitIndex+1],
        data[imgPixelBitIndex+2],
        data[imgPixelBitIndex+3]
      ]
      const [actualR, actualG, actualB, alpha] = actualPixel

      let [newR, newG, newB] = [255, 255, 255]

      if (alpha > 127) {
        let colorIndex = findColorInPalette(actualR, actualG, actualB)
        const rgbFromPalete = getColorComponentsForIndex(colorIndex)
        const [paletteR, paletteG, paletteB] = rgbFromPalete

        if (this.state.ditherStrength > 0) {
          runDithering(imgPixelIndex, imgCanvas.width, actualPixel, rgbFromPalete, data, this.state.ditherStrength)
        }

        newR = paletteR
        newG = paletteG
        newB = paletteB
      }

      filteredImage.data[imgPixelBitIndex] = newR
      filteredImage.data[imgPixelBitIndex+1] = newG
      filteredImage.data[imgPixelBitIndex+2] = newB
      filteredImage.data[imgPixelBitIndex+3] = 255
    }
    
    this.image = filteredImage
  }

  componentDidMount() {
    this.ctx = this.canvas.getContext('2d')

    const { file } = this.props
    const reader = new FileReader()
    reader.onload = () => {
        const img = new Image

        img.onload = () => {
          this.original = img
          this.prepareImage(img)
          this.renderOnCanvas()
        }
        img.onerror = () => console.warn('img reading has failed')
        img.src = reader.result
    };
    reader.onabort = () => console.warn('file reading was aborted')
    reader.onerror = () => console.warn('file reading has failed')

    reader.readAsDataURL(file)

    disablePixelSmoothing(this.canvas)

  }

  renderOnCanvas() {
    if (!this.canvas) return

    this.canvas.width = this.image.width
    this.canvas.height = this.image.height

    this.ctx.putImageData(this.image, 0, 0)
  }

  handleChangeTargetSize(e) {
    this.setState({ targetSize: e.target.value })
  }

  handleChangeDitherStrength(e) {
    this.setState({ ditherStrength: e.target.value })
  }

  handleApply() {
    this.prepareImage(this.original)
    this.renderOnCanvas()
  }

  handlePlace() {
    this.props.onComplete(this.ctx.getImageData(0, 0, this.image.width, this.image.height))
    this.props.onRequestClose()
  }

  render() {
    return (
      <div className={cx('imageProcessingModal')}>
        <a  className={cx('closeButton')} href={'#'} onClick={this.props.onRequestClose} />
        <div className={cx('imageProcessing')}>
          <div className={cx('stage')}>
            <canvas ref={c => this.canvas = c} className={cx('imageProcessCanvas')} width="128" height="128" />
          </div>
          <div className={cx('tools')}>
            <h1>Image Import</h1>
            <div>
              <label>Image Size</label>
              <input type="range" min={8} max={1024} step={8} value={this.state.targetSize} onChange={this.handleChangeTargetSize} /> <span>{this.state.targetSize}</span>
            </div>
            <div>
              <label>Dithering</label>
              <input type="range" min={0} max={1} step={0.05} value={this.state.ditherStrength} onChange={this.handleChangeDitherStrength} /> <span>{Math.round(this.state.ditherStrength * 100)}%</span>
            </div>
            <button type="button" onClick={this.handleApply}>Apply</button>
            <button type="button" onClick={this.handlePlace}>Place</button>
          </div>
        </div>
      </div>
    )
  }
}

export default ImageProcess