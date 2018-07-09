import React from 'react'
import classnames from 'classnames/bind'
import { getColors } from 'utils/colors'

import styles from './index.css'

const colorPalette = getColors()

const cx = classnames.bind(styles)

const Drawtools = ({ open, onSelectColor }) => (
  <div className={cx('drawtools', { open })}>
    <div className={cx('colors')}>
    {colorPalette.map((color, colorIndex) => (
      <button key={color} onClick={() => onSelectColor(colorIndex)} style={{ backgroundColor: color }} />
    ))}
    </div>
  </div>
)

export default Drawtools