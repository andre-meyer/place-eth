import React from 'react'
import styles from './index.css'
import classnames from 'classnames/bind'

const cx = classnames.bind(styles)

class ImageProcess extends React.Component {
  constructor(props) {
    super(props)
    URL.revokeObjectURL(props.file.preview)
  }

  componentDidMount() {

    const reader = new FileReader();
    reader.onload = () => {
        const fileAsBinaryString = reader.result;
        const blob = new Blob([reader.result], {type: 'image/png'})
        const url = URL.createObjectURL(blob)
        const img = new Image

        img.onload = function() {
          console.log(this)
          const canvas = document.createElement('canvas')

          const ctx = canvas.getContext('2d')
          ctx.drawImage(this, 0, 0);
          URL.revokeObjectURL(url);
        }
        img.src = url
    };
    reader.onabort = () => console.warn('file reading was aborted');
    reader.onerror = () => console.warn('file reading has failed');

    reader.readAsBinaryString(this.props.file);
    
  }

  render() {
    return (
      <p>Hi</p>
    )
  }
}

export default ImageProcess