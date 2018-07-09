import React from 'react'

import Canvas from 'components/Canvas'
import Toolbar from 'components/Toolbar'

class PlaceETH extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedChunk: undefined,
      hoveringChunk: undefined,
      toolMode: 'draw'
    }

    this.handleSelectChunk = this.handleSelectChunk.bind(this)
    this.handleHoverChunk = this.handleHoverChunk.bind(this)
    this.handleSetToolmode = this.handleSetToolmode.bind(this)
  }

  handleSelectChunk(chunk) {
    this.setState({ selectedChunk: chunk })
  }

  handleHoverChunk(chunk) {
    this.setState({ hoveringChunk: chunk })
  }

  handleSetToolmode(toolMode) {
    this.setState({ toolMode })
  }

  render() {
    return (
      <div>
        <Canvas
          onSelectChunk={this.handleSelectChunk}
          onHoverChunk={this.handleHoverChunk}
          hoveringChunk={this.state.hoveringChunk}
          toolMode={this.state.toolMode}
        />
        <Toolbar
          selectedChunk={this.state.selectedChunk}
        />
      </div>
    )
  }
}

export default PlaceETH