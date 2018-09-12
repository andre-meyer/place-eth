// node only
const fs = require('fs')
const path = require('path')

const Reset = "\x1b[0m"
const Dim = "\x1b[2m"

const defaultGasPrice = 5 // gwei

class PriceLogger {
  constructor(priceLogFile) {
    this.logFilePath = priceLogFile
    this.entries = {}
  }

  addEntry(contract, method, gasUsed, gasPrice = defaultGasPrice) {
    console.info(`${Dim}${' '.repeat(6)}➦ [${Reset}${contract}${Dim}.${Reset}${method}${Dim}]: ${Reset}${gasUsed}${Dim} Gas (~${(gasUsed * gasPrice) / (10 ** 9)} ETH)${Reset}`)
    
    if (!this.entries[contract]) {
      this.entries[contract] = {}
    }

    if (!this.entries[contract][method]) {
      this.entries[contract][method] = {
        entryCount: 0,
        gasUsedSum: 0,
        avg: 0,
        max: 0,
        min: 1e19,
      }
    }

    if (gasUsed > this.entries[contract][method].max) {
      this.entries[contract][method].max = gasUsed
    }
    if (gasUsed < this.entries[contract][method].min) {
      this.entries[contract][method].min = gasUsed
    }

    this.entries[contract][method].gasUsedSum += gasUsed
    this.entries[contract][method].entryCount++
  }

  writeEntries() {
    Object.keys(this.entries).forEach((contractName) => (
      Object.keys(this.entries[contractName]).forEach((methodName) => {
        if (this.entries[contractName][methodName].entryCount > 0) {
          this.entries[contractName][methodName].avg = this.entries[contractName][methodName].gasUsedSum / this.entries[contractName][methodName].entryCount
        }
      }))
    )

    fs.writeFile(this.logFilePath, JSON.stringify(this.entries), { flag: 'w+' }, (err, res) => {
      if (err) { return console.error(res) }
    })
  }
}

module.exports = PriceLogger
