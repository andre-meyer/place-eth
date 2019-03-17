const HDWalletProvider = require('truffle-hdwallet-provider')

const SEED = process.env.SEED

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(SEED, "https://rinkeby.infura.io/");
      },
      network_id: '4',
    },
    live: {
      provider: function() {
        return new HDWalletProvider(SEED, "https://mainnet.infura.io/");
      },
      network_id: '1',
    }
  },
};
