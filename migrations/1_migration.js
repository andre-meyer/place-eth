const Migrations = artifacts.require("Migrations");

const gasPrice = 10 * 1e9

module.exports = async (deployer, network, [defaultAccount, anyone]) => {
  //console.log(defaultAccount)
  //web3.eth.getBalance(defaultAccount, (err, res) => console.log(res.div(1e19).toString()))
  deployer.deploy(Migrations, { gasPrice, from: defaultAccount });
};
