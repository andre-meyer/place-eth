const gasData = require('../gas-summary.json')

export const getGasCost = (contract, method) => {
  if (gasData[contract] && gasData[contract][method]) {
    return gasData[contract][method].avg
  }
}

export const getMinGasCost = (contract, method) => {
  if (gasData[contract] && gasData[contract][method]) {
    return gasData[contract][method].min
  }
}

export const getMaxGasCost = (contract, method) => {
  if (gasData[contract] && gasData[contract][method]) {
    return gasData[contract][method].max
  }
}