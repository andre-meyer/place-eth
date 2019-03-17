import TruffleContract from 'truffle-contract'
import EthJS from 'ethjs'
import providerPromise from './web3'

let instance
const getEthJsInstance = async () => {
  if (!instance) {
    const web3Provider = await providerPromise

    // stupid monkey patch for async send
    if (typeof web3Provider.sendAsync !== 'function') {
      console.log("missing async send, replacing with send")
      web3Provider.sendAsync = web3Provider.send
    }

    const eth = new EthJS(web3Provider)
    eth.setProvider(web3Provider)  
  
    instance = eth  
  }

  return instance
}

// returns TC wrapped and Provided contract
export const getContract = async (name) => {
  const artifact = require(`../../build/contracts/${name}.json`)
  const contract = TruffleContract(artifact)

  try {
    const provider = await providerPromise
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

export const getAccounts = async () => {
  const provider = await getEthJsInstance()
  const accounts = await provider.accounts()

  return accounts
}

export const getBlockGasLimit = async () => {
  const provider = await getEthJsInstance()
  const block = await new Promise((accept, reject) => {
    provider.getBlockByNumber("latest", true, (err, block) => {
      if (err) reject(err)

      accept(block)
    })
  })
  
  if (!block) return 5e6 // 5 million as a safe fallback?

  // gaslimit should totally fit in a num
  return block.gasLimit.toNumber() - 1e6
}

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
