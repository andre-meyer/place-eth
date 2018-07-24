import React from 'react'
import classnames from 'classnames/bind'
import style from './index.css'

import { External, Author } from 'components/Link'

const cx = classnames.bind(style)

const GAS_ESTIMATE_CHUNK_CREATE = 659451
const GAS_ESTIMATE_CHUNK_UPDATE = 21223
const GAS_ESTIMATE_PLACE_PIXEL = 45387

const ToolbarInfo = () => (
  <React.Fragment>
    <p>Welcome to PlaceETH, your cutting edge advertisment space and overpriced low-resolution 16-color image storage.</p>
    <p>Please connect with Metamask to interact with this webpage on either <External href="https://kovan-testnet.github.io/website/">Kovan</External> or Mainnet, if you're feeling adventurous.</p>

    <p>Created by <Author href="https://twitter.com/andremeyer93">@andremeyer93</Author></p>
  </React.Fragment>
)

const ToolbarDrawing = ({
  changeListCounts: { chunkCreations, chunkUpdates, boundaryChanges },
  onCommitChanges,
  onRevertChanges,
}) => (
  <React.Fragment>
    <p>Estimated Gas Usage:</p>
    <div className={cx('changeList')}>
      <span className={cx('count')}>{chunkCreations}x Creation of Image Chunks</span>
        {chunkCreations > 0 && <span className={cx('gas')}>+ {chunkCreations * GAS_ESTIMATE_CHUNK_CREATE}</span>}
      <span className={cx('count')}>{chunkUpdates}x Updates of Image Chunks</span>
        {chunkUpdates > 0 && <span className={cx('gas')}>+ {chunkUpdates * GAS_ESTIMATE_CHUNK_UPDATE}</span>}
      <span className={cx('count')}>{boundaryChanges}x Changes in Pixelboundaries</span>
        {boundaryChanges > 0 && <span className={cx('gas')}>+ {boundaryChanges * GAS_ESTIMATE_PLACE_PIXEL}</span>}
    </div>
    <div className={cx('summary')}>
      <p>Total Cost: {
        (chunkCreations * GAS_ESTIMATE_CHUNK_CREATE) +
        (chunkUpdates * GAS_ESTIMATE_CHUNK_UPDATE) +
        (boundaryChanges * GAS_ESTIMATE_PLACE_PIXEL)
      }</p>
    </div>
    <div>
      {boundaryChanges > 0 && <button type="button" className={cx('reset')} onClick={onRevertChanges}>Cancel</button>}
      {boundaryChanges > 0 && <button type="button" className={cx('commit')} onClick={onCommitChanges}>Commit</button>}
    </div>
  </React.Fragment>
)

const ToolbarPricemap = ({
  hoveringChunk,
  mouseBoundary,
}) => {
  const changeIndex = mouseBoundary.x + 16 * mouseBoundary.y
  const changes = hoveringChunk ? hoveringChunk.changes[changeIndex] : 0
  return (
    <React.Fragment>
      <p>{mouseBoundary.x} {mouseBoundary.y}: {changes} times changes</p>
    </React.Fragment>
  )
}

const Toolbar = (props) => {
  let ToolbarComponent = ToolbarInfo

  if (props.toolMode === 'draw') {
    ToolbarComponent = ToolbarDrawing
  } else if (props.toolMode === 'cost') {
    ToolbarComponent = ToolbarPricemap
  }

  return (
    <div className={cx('toolbar')}>
      <div className={cx('inner')}>
        <h1 className={cx('title')}>PlaceETH</h1>
        <ToolbarComponent {...props} />
      </div>
    </div>
  )
}

export default Toolbar