var PlaceETH = artifacts.require("PlaceETH");
var Chunk = artifacts.require("Chunk");

module.exports = function(deployer, network, [ defaultAccount, anyone ]) {
  const charity = anyone
  const charityFactor = 80
  
  deployer.deploy(PlaceETH, charity, charityFactor, { from: defaultAccount });
  deployer.deploy(Chunk, { from: defaultAccount });
};