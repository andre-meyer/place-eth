import React from 'react'
import classnames from 'classnames/bind'

import styles from './index.css'

const cx = classnames.bind(styles)

const ToolmodeSelector = ({ onSelectToolmode }) => {
  return (
    <div className={cx('toolmodeSelector')}>
      <a href="#" onClick={() => onSelectToolmode('move')}>Move</a>
      <a href="#" onClick={() => onSelectToolmode('draw')}>Draw</a>
      <a href="#" onClick={() => onSelectToolmode('cost')}>Cost</a>
    </div>
  )
}

export default ToolmodeSelector