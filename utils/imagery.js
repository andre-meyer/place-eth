const leftPad = require('left-pad')
const BigNumber = require('bignumber.js')

const { shuffle } = require('./')

const generateTestPixelBoundary = (amount = 64) => {
  // all color indexes from our palette right now
  const colors = Object.keys(Array(16).fill())
  // 64 pixels = 256bit => one full pixel boundary
  const pixelColors = [
    ...Array(amount).fill().map((n) => colors[Math.floor(1 + Math.random() * (colors.length-1))])
  ]
 
  // this block is responsible for building a "pixel boundary" of rotating colors from the 16 colors available
  // in the current palette. it starts by taking each index (0 - 15) and converting the number to binary, left padding
  // the value to be a 4-bit value (important when concatinating). lastly it flips the whole array
  // to make the "start" be at the top left position inside the boundary
  const pixelsInHex = pixelColors.map(
    (d) => parseInt(leftPad(parseInt(d, 10).toString('2'), 4, '0'), 2).toString('16')
  ).reverse().join('') // right aligned in binary
  return new BigNumber(pixelsInHex, 16)
}

const getPixelDifferencesCount = (beforeBoundaries, afterBoundaries) => {
  if (beforeBoundaries.length !== afterBoundaries.length) {
    throw new Error('need to have the same boundary count')
  }

  let differences = 0

  for(let boundaryIndex = 0; boundaryIndex < beforeBoundaries.length; boundaryIndex++) {
    const bValueBefore = beforeBoundaries.toString(2)
    const bValueAfter = afterBoundaries.toString(2)

    differences += Array(bValueBefore.length).fill().reduce((sum, _, bitIndex) => (
      sum += +(bValueBefore[bitIndex] === bValueAfter[bitIndex])
    ), 0)
  }

  return differences
}

module.exports = {
  generateTestPixelBoundary,
  getPixelDifferencesCount,
}