import EthJS from 'ethjs'
import {
  getCurrentNetwork,
  getCurrentBalance,
  getCurrentAccount,
} from './getters'

const provider = new Promise((resolve, reject) => {
  window.addEventListener("load", async () => {
    let provider
    if (process.env.NODE_ENV === 'development') {
      console.log('Using Ganache-CLI')
      provider = new EthJS.HttpProvider('http://localhost:8545')
    } else if (window && window.web3 && window.web3.currentProvider) {
      if (window.ethereum) {
        console.log('Using Metamask')
        await window.ethereum.enable()

        provider = window.ethereum
      } else {
        provider = window.web3.currentProvider
        console.log('Using Metamask (Legacy)')
      }
    } else {
      console.log('Using Read-Only HttpProvider connection')
      provider = new EthJS.HttpProvider('https://rinkeby.infura.io/')
    }
    
    resolve(provider)
  })
})
export default provider