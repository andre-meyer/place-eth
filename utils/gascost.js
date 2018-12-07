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
  console.warning(`No (min) Gas Price available for ${contract}.${method}`)
  return 1e12
}

export const getMaxGasCost = (contract, method) => {
  if (gasData[contract] && gasData[contract][method]) {
    return gasData[contract][method].max
  }
  console.warning(`No (max) Gas Price available for ${contract}.${method}`)
  return 1e12
}