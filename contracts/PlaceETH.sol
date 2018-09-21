pragma solidity ^0.4.22;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Chunk.sol";

contract PlaceETH is Ownable {
  struct ChunkMapping {
    Chunk chunk;
    bytes32 positionHash;
    bool created;
  }

  address public charity;
  uint16 public factorCharity;
  uint16 public factorOwner;
  uint256 public funds = 0;

  /// @dev The current base cost per pixel
  uint256 constant BASE_COST_PER_PIXEL = 5 szabo;

  /// @dev price climb is limited to 16
  uint16[16] PRICE_CLIMB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

  event ChunkCreated(Chunk chunk, address creator);
  event ChunkUpdated(Chunk chunk, uint256 boundaryIndex, uint256 boundaryValue, uint8 boundaryChanges, address creator);

  Chunk[] public chunks;
  mapping(bytes32 => ChunkMapping) public chunkPositionMapping;

  constructor(address _charity, uint16 _factorCharity) public {
    require(_factorCharity <= 100, "can't donate more than 100%");

    owner = msg.sender;
    charity = _charity;
    factorCharity = _factorCharity;
    factorOwner = 100 - factorCharity;
  }

  function createChunk(int256 x, int256 y) public returns (Chunk) {
    bytes32 positionHash = keccak256(abi.encodePacked(x, y));
    ChunkMapping memory existing = chunkPositionMapping[positionHash];

    require(existing.created == false, "this chunk was already created");
    
    Chunk newChunk = new Chunk();
    newChunk.spawn(x, y, msg.sender);
    emit ChunkCreated(newChunk, msg.sender);
    
    ChunkMapping memory newMapping;
    newMapping.chunk = newChunk;
    newMapping.positionHash = positionHash;
    newMapping.created = true;
    chunkPositionMapping[positionHash] = newMapping;
    chunks.push(newChunk);

    return newChunk;
  }

  function findOrCreateChunk(
    int32 boundaryPositionX,
    int32 boundaryPositionY
  ) internal returns (Chunk affectedChunk) {
    /// @dev find the chunk at the position of the change. changes are within 8^2 pixel blocks, chunks are 128^2 pixels
    int256 chunkX = (int256(boundaryPositionX) * 8) / 128;
    int256 chunkY = (int256(boundaryPositionY) * 8) / 128;
    
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

    return targetChunk;
  }

  function commit(int32[] boundariesX, int32[] boundariesY, uint256[] boundaryValues) public payable {
    uint256 amountToPay = 0;
    for(uint256 changeIndex = 0; changeIndex < boundariesX.length; changeIndex++) {
      int32 boundaryPositionX = boundariesX[changeIndex];
      int32 boundaryPositionY = boundariesY[changeIndex];
      uint256 boundaryValue = boundaryValues[changeIndex];

      Chunk targetChunk = findOrCreateChunk(boundaryPositionX, boundaryPositionY);

      /// @dev find position of changed boundary in this chunk, a chunk consists of 16^2 boundaries
      uint256 boundaryPosInChunkX = uint256(((boundaryPositionX % 16) + 16) % 16); /// @dev mod with negative numbers
      uint256 boundaryPosInChunkY = uint256(((boundaryPositionY % 16) + 16) % 16); /// @dev mod with negative numbers

      uint256 boundaryIndex = (boundaryPosInChunkX + 16 * boundaryPosInChunkY);

      uint256 currentBoundary = targetChunk.pixels(boundaryIndex);
      uint16 currentBoundaryChanges = targetChunk.changes(boundaryIndex);

      /// @dev calculate amount of changes in boundary
      uint256 boundaryPrice = 0;
      for (uint256 bitIndex = 0; bitIndex <= 256; bitIndex += 4) {
        /// @dev we shift by 0xF because we compare 4 bits of information - eg. the pixel color (0-f)
        if ((currentBoundary & (0xF << bitIndex)) == (boundaryValue & (0xF << bitIndex))) {
          boundaryPrice += (
            BASE_COST_PER_PIXEL * PRICE_CLIMB[currentBoundaryChanges]
          );
        }
      }
      /// @dev sum to other changes
      amountToPay += boundaryPrice;

      if (msg.value < amountToPay) {
        revert("not enough ether paid to change more pixels");
      }

      targetChunk.setPixelBoundary(boundaryIndex, boundaryValue);
      emit ChunkUpdated(targetChunk, boundaryIndex, boundaryValue, targetChunk.changes(boundaryIndex), msg.sender);
    }

    /// @dev 
    transferFunds(amountToPay);

    /// @dev this returns overpaid ethers
    msg.sender.transfer(msg.value - amountToPay);
  }

  function transferFunds(uint256 amount) private {
    /// @dev distribute to charity and owner
    uint256 toOwner = amount * factorOwner / 100;
    uint256 toCharity = amount - toOwner;
    charity.transfer(toCharity);
    owner.transfer(toOwner);
  }

  function getChunkCount() public view returns (uint256) {
    return chunks.length;
  }
}