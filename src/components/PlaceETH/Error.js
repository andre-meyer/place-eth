import React from 'react'
import classnames from 'classnames/bind'
import External from 'components/Link/External'

import styles from './index.css'

const cx = classnames.bind(styles)

const Error = () => (
  <div className={cx('errorPage')}>
    <h1>PlaceETH could not be loaded</h1>
    <h3>Please ensure you're on the correct network, currently only <External href="https://rinkeby.io/">Rinkeby</External></h3>

    <small>Otherwise wait for me to fix it on <External href="https://github.com/andre-meyer/place-eth/">GitHub</External></small>
  </div>
)

export default Error