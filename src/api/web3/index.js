import EthJS from 'ethjs'
import {
  getCurrentNetwork,
  getCurrentBalance,
  getCurrentAccount,
} from './getters'

let provider
if (process.env.NODE_ENV === 'development') {
  console.log('Using Ganache-CLI')
  provider = new EthJS.HttpProvider('http://localhost:8545')
} else if (window && window.web3 && window.web3.currentProvider) {
  console.log('Using Metamask')
  provider = window.web3.currentProvider
} else {
  provider = new EthJS.HttpProvider('https://rinkeby.infura.io/')
}

console.log(provider)




export default provider