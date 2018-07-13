import React from 'react'

import Canvas from 'components/Canvas'
import Toolbar from 'components/Toolbar'
import ToolmodeSelector from 'components/ToolmodeSelector'
import Drawtools from 'components/Drawtools'

class PlaceETH extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      selectedChunk: undefined,
      hoveringChunk: undefined,
      toolMode: 'draw',
      drawOptions: {
        colorIndex: 0,
      },
      changeListCounts: {
        chunkCreations: 0,
        chunkUpdates: 0,
        pixelChanges: 0,
      }
    }

    this.handleSelectChunk = this.handleSelectChunk.bind(this)
    this.handleHoverChunk = this.handleHoverChunk.bind(this)
    this.handleSetToolmode = this.handleSetToolmode.bind(this)

    this.handleSelectColor = this.handleSelectColor.bind(this)
    this.handleUpdateCounts = this.handleUpdateCounts.bind(this)
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

  handleSelectColor(color) {
    this.setState({
      drawOptions: {
        colorIndex: color,
      },
    })
  }

  handleUpdateCounts(chunkUpdates, pixelChanges, chunkCreations) {
    this.setState({
      changeListCounts: {
        chunkCreations,
        chunkUpdates,
        pixelChanges,
      }
    })
  }

  render() {
    return (
      <div>
        <Canvas
          onSelectChunk={this.handleSelectChunk}
          onHoverChunk={this.handleHoverChunk}
          onUpdateCounts={this.handleUpdateCounts}
          hoveringChunk={this.state.hoveringChunk}
          toolMode={this.state.toolMode}
          drawOptions={this.state.drawOptions}
        />
        <Toolbar
          toolMode={this.state.toolMode}
          selectedChunk={this.state.selectedChunk}
          changeListCounts={this.state.changeListCounts}
        />
        <ToolmodeSelector
          onSelectToolmode={this.handleSetToolmode}
        />
        <Drawtools open={this.state.toolMode === 'draw'} onSelectColor={this.handleSelectColor} />
      </div>
    )
  }
}

export default PlaceETH