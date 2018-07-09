import '@babel/polyfill'

import React from 'react'
import { render } from 'react-dom'

import HMRApp from './hmr'

render(<HMRApp />, document.getElementById('root'))