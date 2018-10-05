const path = require('path')
const PriceLogger = require('../../utils/truffle/priceLogger')

module.exports = new PriceLogger(path.join(__dirname, '../../gas-summary.json'))