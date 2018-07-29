import React from 'react'
import { lifecycle } from 'recompose'
import classnames from 'classnames/bind'
import moment from 'moment'

import styles from './index.css'

import External from 'components/Link/External'

const cx = classnames.bind(styles)

const AutoMode = ({ lastEvent }) => (
  <div className={cx('automode')}>
    <div className={cx('left')}>
      <External className={cx('title')} href="https://andre-meyer.github.io/place-eth/">PlaceETH</External>&nbsp;
      <External className={cx('url')}>https://andre-meyer.github.io/place-eth/</External>
    </div>
    <div className={cx('right')}>
      {lastEvent && (
        <>
          <span className={cx('lastActivity')}>Last Activity by <strong>{lastEvent.args.creator}</strong></span>&nbsp;
          <span>Last Change in Block <strong>{lastEvent.blockNumber}</strong>,&nbsp;
            <strong>
              {lastEvent.args.timestamp < parseInt(moment().utc().toString('x'), 10) ? 'just now' : `${moment.utc(lastEvent.args.timestamp * 1000).toNow(true)} ago`}
            </strong>
          </span>
        </>
      )}
    </div>
  </div>
)

export default lifecycle({
  componentDidMount() {
    this.interval = window.setInterval(() => { this.forceUpdate() }, 1000)
  },
  componentWillUnmount() {
    window.clearInterval(this.interval)
  }
})(AutoMode)