import TC from 'truffle-contract'
import EthJS from 'ethjs'

let provider = new EthJS.HttpProvider('https://rinkeby.infura.io/')
const eth = new EthJS(provider)

if (window && window.web3 && window.web3.currentProvider) {
  console.log('Using Metamask')
  provider = window.web3.currentProvider
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log('Using Ganache-CLI')
    provider = new EthJS.HttpProvider('http://localhost:8545')
  }
}

eth.setProvider(provider)

// returns TC wrapped and Provided contract
export const getContract = async (name) => {
  const artifact = require(`../../build/contracts/${name}.json`)
  const contract = TruffleContract(artifact)

  try {
    const csp = await contract.setProvider(provider)
    
    return contract
  } catch (e) {
    throw new Error(e)
  }
}

export const setupContract = async (name) => {
  const contract = await getContract(name)
  try {
    const deplContract = contract.deployed()
    
    return deplContract
  } catch (e) {
    throw new Error(e)
  }
}

export const getAccounts = async () => await eth.accounts()

export const waitForEventOnce = (contract, event, args = {}) => new Promise((resolve, reject) => {
  const watcher = contract[event](args)
  watcher.watch((err, result) => {
    if (err) {
      reject(err)
    } else {
      resolve(result)
    }
    watcher.stopWatching()
  })
})

export const startListener = (contract, event, args) => {
  let callbacks = []
  const watcher = contract[event](args)
  watcher.watch((err, result) => {
    if (err) {
      console.warn(`Watcher ${event} threw error:`, err)
    }

    callbacks.forEach(cb => cb.call(cb, result))
  })

  return {
    stop: () => {
      try {
        watcher.stopWatching()
      } catch (e) {
        // was probably already unwatched...
      }
    },
    addListener: (cb) => {
      if (callbacks.indexOf(cb) == -1) {
        callbacks.push(cb)
      }
    }
  }
}
