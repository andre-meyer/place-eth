
const priceLogger = require('./utils/logger')

after(() => {
  priceLogger.writeEntries()
})