var PlaceETH = artifacts.require("PlaceETH");
var Chunk = artifacts.require("Chunk");

const gasPrice = 10 * 1e9

const GIVETH_ADDRESS = "0x5ADF43DD006c6C36506e2b2DFA352E60002d22Dc"

module.exports = async (deployer, network, [ defaultAccount, anyone ]) => {
  const charity = GIVETH_ADDRESS
  const charityFactor = 80
  
  deployer.deploy(PlaceETH, charity, charityFactor, { from: defaultAccount, gasPrice }).then((placeEth) => {
    const tcPromise = new Promise(async (resolve, reject) => {
      web3.eth.getTransactionReceipt(placeEth.transactionHash, (err, res) => {
        if (err) return reject(err)
        console.log(res)
        resolve(res)
      })
    })
    return tcPromise
  })

  deployer.deploy(Chunk, { from: defaultAccount, gasPrice }).then((chunk) => {
    const tcPromise = new Promise(async (resolve, reject) => {
      web3.eth.getTransactionReceipt(chunk.transactionHash, (err, res) => {
        if (err) return reject(err)
        console.log(res)
        resolve(res)
      })
    })
    return tcPromise
  })
};