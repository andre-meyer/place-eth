const isConnected = () => new Promise((resolve) => {
  return resolve(window.web3 && window.web3.currentProvivder && window.web3.currentProvider.isConnected())
})

const isLocked = () => new Promise((resolve) => {
  return resolve(window.web3 && window.web3.currentProvivder && window.web3.currentProvider.isMetaMask)
})

export const ETHEREUM_NETWORK_IDS = {
  1: 'main',
  2: 'morden',
  3: 'ropsten',
  4: 'rinkeby',
  42: 'kovan',
}

export const getCurrentNetwork = () => new Promise((resolve, reject) => {
  window.web3.version.getNetwork((err, res) => {
    if (err) {
      return reject(err)
    }

    const id = parseInt(res, 10)
    const network = ETHEREUM_NETWORK_IDS[id]

    if (typeof network === 'undefined') {
      return resolve('unknown')
    }
    
    return resolve(network)
  })
})

export const getCurrentAccount = () => new Promise(async (resolve) => {
  if (!(await isConnected())) {
    reject('not connected')
  }
  if (!(await isLocked())) {
    reject('metamask locked')
  }
  resolve(window.web3.eth.defaultAccount)
})

export const getCurrentBalance = () => new Promise(async (resolve, reject) => {
  if (!(await isConnected())) {
    reject('not connected')
  }
  if (!(await isLocked())) {
    reject('metamask locked')
  }
  return resolve(window.web3.eth.getBalance(window.web3.defaultAccount))
})
