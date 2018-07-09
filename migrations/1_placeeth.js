var ChunkManager = artifacts.require("ChunkManager");
var Chunk = artifacts.require("Chunk");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(ChunkManager, { from: accounts[0] });
  deployer.deploy(Chunk, { from: accounts[0] });
};