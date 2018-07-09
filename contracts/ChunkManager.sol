pragma solidity ^0.4.22;

import "./Chunk.sol";

contract ChunkManager {
  struct ChunkMapping {
    Chunk chunk;
    bytes32 positionHash;
    bool created;
  }

  event ChunkCreated(Chunk chunk);

  Chunk[] public chunks;
  mapping(bytes32 => ChunkMapping) public chunkPositionMapping;

  function createChunk(int256 x, int256 y) public {
    bytes32 positionHash = keccak256(abi.encodePacked(x, y));
    ChunkMapping storage existing = chunkPositionMapping[positionHash];

    require(existing.created == false, "this chunk was already created");
    
    Chunk newChunk = new Chunk();
    newChunk.spawn(x, y);
    emit ChunkCreated(newChunk);
    
    ChunkMapping memory newMapping;
    newMapping.chunk = newChunk;
    newMapping.positionHash = positionHash;
    newMapping.created = true;
    chunkPositionMapping[positionHash] = newMapping;
    chunks.push(newChunk);
  }

  function getChunkCount() public view returns (uint256) {
    return chunks.length;
  }
}