pragma solidity ^0.4.22;

import "./Chunk.sol";

contract PlaceETH {
  struct ChunkMapping {
    Chunk chunk;
    bytes32 positionHash;
    bool created;
  }

  event ChunkCreated(Chunk chunk);
  event ChunkUpdated(Chunk chunk, uint256 boundaryIndex, uint256 boundaryValue, uint8 boundaryChanges);

  uint256 public timeBetweenPlacements;
  uint256 lastPlacement = block.timestamp;
  Chunk[] public chunks;
  mapping(bytes32 => ChunkMapping) public chunkPositionMapping;

  function createChunk(int256 x, int256 y) public returns (Chunk) {
    bytes32 positionHash = keccak256(abi.encodePacked(x, y));
    ChunkMapping memory existing = chunkPositionMapping[positionHash];

    require(existing.created == false, "this chunk was already created");
    
    Chunk newChunk = new Chunk();
    newChunk.spawn(x, y, msg.sender);
    emit ChunkCreated(newChunk);
    
    ChunkMapping memory newMapping;
    newMapping.chunk = newChunk;
    newMapping.positionHash = positionHash;
    newMapping.created = true;
    chunkPositionMapping[positionHash] = newMapping;
    chunks.push(newChunk);

    return newChunk;
  }

  function commit(int256[] boundariesX, int256[] boundariesY, uint256[] boundaryValues) public {
    for(uint256 changeIndex = 0; changeIndex < boundariesX.length; changeIndex++) {
      int256 boundaryPositionX = boundariesX[changeIndex];
      int256 boundaryPositionY = boundariesY[changeIndex];
      uint256 boundaryValue = boundaryValues[changeIndex];

      /// @dev find the chunk at the position of the change. changes are within 8^2 pixel blocks, chunks are 128^2 pixels
      int256 chunkX = (boundaryPositionX * 8) / 128;
      int256 chunkY = (boundaryPositionY * 8) / 128;
      
      /// @dev stupid problem with integer division
      if (boundaryPositionX < 0 && boundaryPositionX % 16 != 0) {
        chunkX -= 1;
      }
      if (boundaryPositionY < 0 && boundaryPositionY % 16 != 0) {
        chunkY -= 1;
      }
      

      /// @dev mapping of positions/chunks is done as hashed positions
      bytes32 positionHash = keccak256(abi.encodePacked(chunkX, chunkY));
      ChunkMapping memory existing = chunkPositionMapping[positionHash];

      Chunk targetChunk = existing.chunk;
      if (!existing.created) {
        targetChunk = createChunk(chunkX, chunkY);
      }
      
      /// @dev find position of changed boundary in this chunk, a chunk consists of 16^2 boundaries
      uint256 boundaryPosInChunkX = uint256(((boundaryPositionX % 16) + 16) % 16); /// @dev mod with negative numbers
      uint256 boundaryPosInChunkY = uint256(((boundaryPositionY % 16) + 16) % 16); /// @dev mod with negative numbers

      uint256 boundaryIndex = (boundaryPosInChunkX + 16 * boundaryPosInChunkY);

      targetChunk.setPixelBoundary(boundaryIndex, boundaryValue);
      emit ChunkUpdated(targetChunk, boundaryIndex, boundaryValue, targetChunk.changes(boundaryIndex));
    }

    // solium-disable-next-line security/no-block-members
    int256 diffFromLastPlacement = (int256(block.timestamp) - int256(lastPlacement)) / 1000 / 60;

    /// @dev Round up to atleast a minute, to avoid issues with detecting last changes
    if (diffFromLastPlacement < 1) {
      diffFromLastPlacement = 1;
    }
    if (diffFromLastPlacement > 2**16) {
      diffFromLastPlacement = 2 ** 16;
    }

    timeBetweenPlacements = (timeBetweenPlacements << 16) | uint256(diffFromLastPlacement);
    
    // solium-disable-next-line security/no-block-members
    lastPlacement = block.timestamp;
  }

  function getPixelCost() public view returns (uint256) {
    uint16[] memory minutesBetweenPlacements = new uint16[](16);
    uint8 placementIndex = 0;
    uint16 betweenLastPlacement;

    uint256 mask = 0xffff;
    do {
      uint256 bitOffset = placementIndex * 16;
      uint256 diffAtCurrentIndex = (timeBetweenPlacements & (mask << bitOffset)) >> bitOffset;

      betweenLastPlacement = uint16(diffAtCurrentIndex);
      minutesBetweenPlacements[placementIndex++] = betweenLastPlacement;
    } while (betweenLastPlacement > 0);

    //return placementIndex;
    //return betweenLastPlacement;
    if (placementIndex == 0) {
      /// @dev No previous placements
      return 0;
    }

    uint256 average = 0;
    for(uint256 intervalIndex = 0; intervalIndex < (placementIndex - 1); intervalIndex++) {
      uint256 minuteDifference = minutesBetweenPlacements[intervalIndex];
      average += minuteDifference;
    }

    return average / (placementIndex - 1);
  }

  function getChunkCount() public view returns (uint256) {
    return chunks.length;
  }
}