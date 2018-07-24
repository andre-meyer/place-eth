var PlaceETH = artifacts.require("PlaceETH");
var Chunk = artifacts.require("Chunk");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(PlaceETH, { from: accounts[0] });
  deployer.deploy(Chunk, { from: accounts[0] });
};