var PlaceETH = artifacts.require("PlaceETH");
var Chunk = artifacts.require("Chunk");

module.exports = function(deployer, network, [ defaultAccount ]) {
  deployer.deploy(PlaceETH, { from: defaultAccount });
  deployer.deploy(Chunk, { from: defaultAccount });
};