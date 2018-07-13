import React from 'react'
import classnames from 'classnames/bind'
import style from './index.css'

import { External, Author } from 'components/Link'

const cx = classnames.bind(style)

const GAS_ESTIMATE_CHUNK_CREATE = 650000
const GAS_ESTIMATE_CHUNK_UPDATE = 20000
const GAS_ESTIMATE_PLACE_PIXEL = 20000

const ToolbarInfo = () => (
  <React.Fragment>
    <p>Welcome to PlaceETH, your cutting edge advertisment space and overpriced low-resolution 16-color image storage.</p>
    <p>Please connect with Metamask to interact with this webpage on either <External href="https://kovan-testnet.github.io/website/">Kovan</External> or Mainnet, if you're feeling adventurous.</p>

    <p>Created by <Author href="https://twitter.com/andremeyer93">@andremeyer93</Author></p>
  </React.Fragment>
)

const ToolbarDrawing = ({ changeListCounts: { chunkCreations, chunkUpdates, pixelChanges } }) => (
  <div className={cx('changeList')}>
    <span className={cx('count')}>{chunkCreations}x Creation of Image Chunks</span>
      {chunkCreations > 0 && <span className={cx('gas')}>{chunkCreations * GAS_ESTIMATE_CHUNK_CREATE}</span>}
    <span className={cx('count')}>{chunkUpdates}x Updates of Image Chunks</span>
      {chunkUpdates > 0 && <span className={cx('gas')}>{chunkUpdates * GAS_ESTIMATE_CHUNK_UPDATE}</span>}
    <span className={cx('count')}>{pixelChanges}x Changes in Pixeldata</span>
      {pixelChanges > 0 && <span className={cx('gas')}>{pixelChanges * GAS_ESTIMATE_PLACE_PIXEL}</span>}
  </div>
)

const Toolbar = (props) => {
  let ToolbarComponent = ToolbarInfo

  if (props.toolMode === 'draw') {
    ToolbarComponent = ToolbarDrawing
  }

  return (
    <div className={cx('toolbar')}>
      <div className={cx('inner')}>
        <h1 className={cx('title')}>PlaceETH</h1>
        <p>Estimated Gas Usage:</p>
        <ToolbarComponent {...props} />
      </div>
    </div>
  )
}

export default Toolbar