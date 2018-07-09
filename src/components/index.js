import React from 'react'
import classnames from 'classnames/bind'
import '~style/main.css'

import PlaceETH from './PlaceETH'

import style from './style.css'

const cx = classnames.bind(style)

const App = () => (
  <div className={cx('app')}>
    <PlaceETH />
  </div>
)

export default App