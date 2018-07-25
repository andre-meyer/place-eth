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
        return new HDWalletProvider(secret.mnemonic, "https://rinkeby.infura.io/");
      },
      network_id: '4',
    },
  },
};
