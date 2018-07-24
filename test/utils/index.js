const leftPad = require('left-pad')
const BigNumber = require('bignumber.js')

const waitForEvent = (contract, event, args = {}) => new Promise((resolve, reject) => {
  const timeoutTimer = setTimeout(() => {
    clearTimeout(timeoutTimer)
    reject(new Error('Timeout'))
  }, 1000)
  const watcher = contract[event](args)
  watcher.watch((err, res) => {
    clearTimeout(timeoutTimer)
    watcher.stopWatching()
    
    if (err) {
      reject(err)
    } else {
      resolve(res)
    }
  })
})

const shuffle = (a) => {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}

const generateTestPixelBoundary = () => {
    // all color indexes from our palette right now
    const colors = Object.keys(Array(16).fill())
    // 64 pixels = 256bit => one full pixel boundary
    const pixelColors = shuffle([...colors, ...colors, ...colors, ...colors])
   
    // this block is responsible for building a "pixel boundary" of rotating colors from the 16 colors available
    // in the current palette. it starts by taking each index (0 - 15) and converting the number to binary, left padding
    // the value to be a 4-bit value (important when concatinating). lastly it flips the whole array
    // to make the "start" be at the top left position inside the boundary
    const pixelsInHex = pixelColors.map(
      (h) => parseInt(leftPad(parseInt(h, 10).toString('2'), 4, '0'), 2).toString('16')
    ).reverse().join('') // right aligned in binary
    return new BigNumber(pixelsInHex, 16)
}

const mod = (n, m) => ((n % m) + m) % m

const increaseTime = (duration) => {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1)

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id+1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res)
      })
    })
  })
}

const Reset = "\x1b[0m"
const Bright = "\x1b[1m"
const Dim = "\x1b[2m"
const Underscore = "\x1b[4m"
const Blink = "\x1b[5m"
const Reverse = "\x1b[7m"
const Hidden = "\x1b[8m"

const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"

const BgBlack = "\x1b[40m"
const BgRed = "\x1b[41m"
const BgGreen = "\x1b[42m"
const BgYellow = "\x1b[43m"
const BgBlue = "\x1b[44m"
const BgMagenta = "\x1b[45m"
const BgCyan = "\x1b[46m"
const BgWhite = "\x1b[47m"

const gasPrice = 5 // gwei

const logGasUsage = (gasUsage, contract, method) => {
  console.info(`${Dim}${' '.repeat(6)}➦ [${Reset}${contract}${Dim}.${Reset}${method}${Dim}]: ${Reset}${gasUsage}${Dim} Gas (~${(gasUsage * gasPrice) / (10 ** 9)} ETH)${Reset}`)
}

module.exports = {
  waitForEvent,
  generateTestPixelBoundary,
  increaseTime,
  logGasUsage,
}