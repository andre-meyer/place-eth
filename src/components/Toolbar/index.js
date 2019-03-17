import React from 'react'
import classnames from 'classnames/bind'
import style from './index.css'
import { mod } from '~utils'

import { External, Author } from 'components/Link'

const cx = classnames.bind(style)

const GAS_ESTIMATE_CHUNK_CREATE = 583369
const GAS_ESTIMATE_CHUNK_UPDATE = 67467
const GAS_ESTIMATE_PLACE_PIXEL = 104106

const PRICE_CLIMB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
const BASE_PRICE = 1e12

const MIN_DECIMAL_PLACES = 8
const MIN_DECIMAL_VAL = Math.pow(10, -MIN_DECIMAL_PLACES)

const formatCost = (num) => {
  if (num < MIN_DECIMAL_VAL) return `<${MIN_DECIMAL_VAL}`

  // truncate decimal places
  const formated = num.toString()
  const decimalPos = formated.indexOf(".")

  return parseFloat(formated.substr(0, decimalPos + MIN_DECIMAL_PLACES)).toString()
}

const ToolbarInfo = () => (
  <React.Fragment>
    <p>Welcome to PlaceETH, your cutting edge advertisment space and overpriced low-resolution 16-color image storage.</p>
    <p>Please connect with Metamask to interact with this webpage on either <External href="https://rinkeby.io/">Rinkeby</External> or <strong>Mainnet</strong>, if you're feeling adventurous.</p>

    {<p>Created by <Author href="https://twitter.com/andremeyer93">@andremeyer93</Author>. <em>I take absolutely no responsibility for lost funds, this page is to be considered experimental and unstable.</em></p>}
  </React.Fragment>
)

const ToolbarDrawing = ({
  changedPixelCount,
  costs: {
    gasCostEstimation,
    changeCostEstimation,
    status,
  },
  onCommitChanges,
  onRevertChanges,
  onSelectImage,
  commitProgress,
  commitStatus,
  commitErrors,
  gasPrice,
  onChangeGasPrice,
}) => (
  <React.Fragment>
    {(changedPixelCount > 0) ? (
      <>
        <p>{changedPixelCount} pixels have been updated</p>
        {status === 'display' ? (
          <>
            <p>Estimated Gas Usage: <strong>{gasCostEstimation}</strong> Gas</p>
            <p>Estimated Change Price: <strong>{(changeCostEstimation / 1e18).toFixed(4)} ETH</strong></p>
          </>
        ) : (
          <>
            <p>Calculating Costs...</p>
          </>
        )}
        {commitStatus === 'running' && (
          <div className={cx('commitstatus')}>
            Running Transactions... {(commitProgress * 100).toFixed(2)}%
            <meter value={commitProgress} min={0} max={1} /><br />
            {commitErrors > 0 && <strong>{commitErrors} errors occured during transactions...</strong>}
          </div>
        )}
        {commitStatus === 'waiting' && (
          <div className={cx('commitstatus')}>
            All transactions queued, waiting for them to be mined.
          </div>
        )}
        {commitStatus === undefined && (
          <div className={cx('commitTools')}>
            <button type="button" className={cx('reset')} disabled={commitStatus === 'running'} onClick={onRevertChanges}>Cancel</button>
            <button type="button" className={cx('commit')} disabled={commitStatus === 'running'} onClick={onCommitChanges}>Commit</button>
            <label>Gas Price:</label>
            <input type="number" value={gasPrice} onChange={onChangeGasPrice} /> <input type="range" value={gasPrice} onChange={onChangeGasPrice} min={1} max={15} />
          </div>
        )}
      </>
    ) : (
      <>
        <p>You can drag and drop images into this window to upload them, or alternatively, click here: <input type="file" name="pic" onChange={(v) => onSelectImage(v.target.files)} /></p>
        <p>Once you commit your changes and your transactions are 100% complete, you might need to wait until they have been mined. Sometimes this takes so long that it times out, and it looks like it silently failed. If that happens simply wait for the transactions to get mined. They will still show up eventually</p>
      </>
    )}

  </React.Fragment>
)

const ToolbarPricemap = ({
  hoveringChunk,
  mouseBoundary,
}) => {
  const changeIndex = mod(mouseBoundary.x,16) + 16 * mod(mouseBoundary.y, 16)
  const changes = hoveringChunk ? hoveringChunk.changes[changeIndex] : 0
  return (
    <>
      <p>This will display the costs of individual pixel boundaries of the canvas.</p>
      {hoveringChunk ? <p>
        <span>The pixel boundary you're hovering on has {changes > 0 ? `been changed ${changes} times` : 'not yet been changed'}. Costing approx {formatCost((PRICE_CLIMB[Math.min(changes, 16)] * BASE_PRICE + GAS_ESTIMATE_CHUNK_UPDATE + GAS_ESTIMATE_PLACE_PIXEL) / 1e18)} &Xi; per pixel.</span>
      </p> : <p>
        <span>The pixel boundary you're hovering on has not yet been created. You will have to pay for the gas to create this area of the canvas. You will pay atleast {formatCost((BASE_PRICE + GAS_ESTIMATE_CHUNK_CREATE + GAS_ESTIMATE_PLACE_PIXEL) / 1e18)} &Xi; per pixel. </span>
      </p>}
    </>
  )
}

const ToolbarPlace = ({
  onPlace,
  setToolmode,
}) => {
  return (
    <React.Fragment>
      <strong>Placing at current position might freeze this page for a moment.</strong>
      <button type="button" onClick={onPlace}>Place at current position</button>
      <button type="button" onClick={() => setToolmode('move')}>Cancel</button>
    </React.Fragment>
  )
}

const Toolbar = (props) => {
  let ToolbarComponent = ToolbarInfo

  if (props.toolMode === 'draw') {
    ToolbarComponent = ToolbarDrawing
  } else if (props.toolMode === 'cost') {
    ToolbarComponent = ToolbarPricemap
  } else if (props.toolMode === 'place') {
    ToolbarComponent = ToolbarPlace
  } else if (props.toolMode === 'auto') {
    return null
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