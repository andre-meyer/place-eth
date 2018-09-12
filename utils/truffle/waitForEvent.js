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

module.exports = waitForEvent