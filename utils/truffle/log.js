
const Reset = "\x1b[0m"
const Dim = "\x1b[2m"

const gasPrice = 5 // gwei

const logGasUsage = (gasUsage, contract, method) => {
  console.info(`${Dim}${' '.repeat(6)}➦ [${Reset}${contract}${Dim}.${Reset}${method}${Dim}]: ${Reset}${gasUsage}${Dim} Gas (~${(gasUsage * gasPrice) / (10 ** 9)} ETH)${Reset}`)
}

module.exports = {
  logGasUsage,
}