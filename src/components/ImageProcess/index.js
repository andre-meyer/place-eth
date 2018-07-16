import React from 'react'
import styles from './index.css'
import classnames from 'classnames/bind'

import { findColorInPalette, getColorComponentsForIndex } from 'utils/colors'

import { disablePixelSmoothing } from '../Canvas/utils/canvas'
const cx = classnames.bind(styles)

class ImageProcess extends React.Component {
  constructor(props) {
    super(props)

    // start by removing preview from react-dropzone to prevent memory leak
    URL.revokeObjectURL(props.file.preview)

    this.image = undefined
    this.canvas = undefined
    this.ctx = undefined
  }
  
  prepareImage(img) {
    const imgCanvas = document.createElement('canvas')
    imgCanvas.width = img.width
    imgCanvas.height = img.height

    const imgCtx = imgCanvas.getContext('2d')
    imgCtx.drawImage(img, 0, 0)
    console.log(img.width, img.height)

    const { data } = imgCtx.getImageData(0, 0, img.width, img.height)
    const filteredImage = new ImageData(img.width, img.height)
    const imageDataLength = img.width * img.height * 4;

    for(let imgPixelIndex = 0; imgPixelIndex < imageDataLength; imgPixelIndex += 4) {
      const [targetR, targetG, targetB, alpha] = [
        data[imgPixelIndex],
        data[imgPixelIndex+1],
        data[imgPixelIndex+2],
        data[imgPixelIndex+3]
      ]
      
      const colorIndex = findColorInPalette(targetR, targetG, targetB)
      const [r, g, b ] = getColorComponentsForIndex(colorIndex)

      filteredImage.data[imgPixelIndex] = r
      filteredImage.data[imgPixelIndex+1] = g
      filteredImage.data[imgPixelIndex+2] = b
      filteredImage.data[imgPixelIndex+3] = 255
    }
    
    this.image = filteredImage


    this.renderOnCanvas()
  }

  componentDidMount() {
    this.ctx = this.canvas.getContext('2d')

    const { file } = this.props
    const reader = new FileReader()
    reader.onload = () => {
        const img = new Image

        img.onload = () => {
          this.canvas.width = img.width
          this.canvas.height = img.height
          console.log('lets go')
          this.prepareImage(img)
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
    console.log('hi')

    //this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.putImageData(this.image, 0, 0)
    //this.ctx.fillStyle = 'red'
    //this.ctx.fillRect(0, 0, 10, 10)
  }

  render() {
    return (
      <canvas ref={c => this.canvas = c} className={cx('imageProcessWorkspace')} width="128" height="128" />
    )
  }
}

export default ImageProcess