const secret = require('./secret.json')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: function() {
        const mnemonic = Buffer.from(secret.mnemonic, 'base64').toString('ascii')
        return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/");
      },
      network_id: '4',
    },
    live: {
      provider: function() {
        const mnemonic = Buffer.from(secret.mnemonic, 'base64').toString('ascii')
        return new HDWalletProvider(mnemonic, "https://mainnet.infura.io/");
      },
      network_id: '1',
    }
  },
};
