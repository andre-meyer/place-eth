import React from 'react'
import classnames from 'classnames/bind'
import style from './index.css'

import { External, Author } from 'components/Link'

const cx = classnames.bind(style)

const Toolbar = ({ selectedChunk }) => {
  return (
    <div className={cx('toolbar')}>
      <div className={cx('inner')}>
        <h1 className={cx('title')}>PlaceETH</h1>
        <p>Welcome to PlaceETH, your cutting edge advertisment space and overpriced low-resolution 16-color image storage.</p>
        <p>Please connect with Metamask to interact with this webpage on either <External href="https://kovan-testnet.github.io/website/">Kovan</External> or Mainnet, if you're feeling adventurous.</p>
        {selectedChunk && (
          <React.Fragment>
            <h4>{selectedChunk.x}, {selectedChunk.y}</h4>
            <p>{selectedChunk.creator}</p>
          </React.Fragment>
        )}
        <p>Created by <Author href="https://twitter.com/andremeyer93">@andremeyer93</Author></p>
      </div>
    </div>
  )
}

export default Toolbar