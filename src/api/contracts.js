import TruffleContract from 'truffle-contract'
import EthJS from 'ethjs'
import provider from './web3'

const eth = new EthJS(provider)

eth.setProvider(provider)

// returns TC wrapped and Provided contract
export const getContract = async (name) => {
  const artifact = require(`../../build/contracts/${name}.json`)
  const contract = TruffleContract(artifact)

  try {
    await contract.setProvider(provider)
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
